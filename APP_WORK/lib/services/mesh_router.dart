import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../config/mesh_config.dart';
import '../models/models.dart';
import '../repositories/device_repository.dart';
import '../repositories/message_repository.dart';
import '../repositories/sos_repository.dart';
import '../repositories/sync_queue_repository.dart';
import '../transports/transport.dart';
import 'communication_manager.dart';
import 'device_id_service.dart';

class MeshRouter extends ChangeNotifier {
  final CommunicationManager _commManager;
  final MessageRepository _messageRepo = MessageRepository();
  final DeviceRepository _deviceRepo = DeviceRepository();
  final SOSRepository _sosRepo = SOSRepository();
  final SyncQueueRepository _syncRepo = SyncQueueRepository();

  final List<String> _logs = [];
  final Map<String, DeviceIdentity> _activePeers = {};
  StreamSubscription<TransportEvent>? _commSub;

  List<String> get logs => List.unmodifiable(_logs);
  Map<String, DeviceIdentity> get activePeers => Map.unmodifiable(_activePeers);

  MeshRouter(this._commManager) {
    _commSub = _commManager.events.listen(_handleTransportEvent);
  }

  void _log(String message) {
    final logStr = '[${DateTime.now().toIso8601String().substring(11, 19)}] $message';
    _logs.add(logStr);
    if (_logs.length > 100) _logs.removeAt(0);
    debugPrint(logStr);
    notifyListeners();
  }

  Future<void> start() async {
    _log('Starting Mesh Router...');
    await _commManager.startDiscovery();
  }

  Future<void> stop() async {
    _log('Stopping Mesh Router...');
    await _commManager.stopDiscovery();
    _activePeers.clear();
    notifyListeners();
  }

  Future<void> sendSosAlert(String userId, double latitude, double longitude, MessagePriority priority, String text) async {
    final messageId = _messageRepo.generateUniqueMessageId();
    final deviceId = await DeviceIdService.getDeviceId();
    final now = DateTime.now();

    final message = MeshMessage(
      messageId: messageId,
      type: 'SOS',
      sourceDevice: deviceId,
      sourceUser: userId,
      timestamp: now,
      priority: priority,
      ttl: 8,
      hopCount: 0,
      latitude: latitude,
      longitude: longitude,
      payload: {'message': text, 'status': 'PENDING'},
    );

    _log('Creating local SOS alert: $messageId');
    await _messageRepo.saveMessage(message);

    final sosModel = SosModel(
      id: messageId,
      messageId: messageId,
      userId: userId,
      latitude: latitude,
      longitude: longitude,
      priority: messagePriorityToString(priority),
      status: 'PENDING',
      message: text,
      createdAt: now,
    );
    await _sosRepo.saveSosAlert(sosModel);

    // Enqueue to sync queue
    await _syncRepo.enqueue(messageId, 'SOS', jsonEncode(message.toJson()));

    // Broadcast to active peers
    _broadcastMessageToPeers(message);
  }

  void _broadcastMessageToPeers(MeshMessage message) {
    final payload = jsonEncode({'type': 'MESSAGE', 'data': message.toJson()});
    final bytes = utf8.encode(payload);

    for (final peerId in _activePeers.keys) {
      final peer = _activePeers[peerId]!;
      // Find transport type associated with peer (WiFi has prefix WiFi-)
      final isWifi = peer.deviceName.startsWith('WiFi-');
      final transportType = isWifi ? TransportType.wifi : TransportType.ble;

      _log('Broadcasting $messageId to peer $peerId over ${transportType.name}');
      _commManager.sendData(peerId, transportType, bytes);
    }
  }

  void _handleTransportEvent(TransportEvent event) {
    switch (event.eventType) {
      case TransportEventType.deviceDiscovered:
        _handleDeviceDiscovered(event);
        break;
      case TransportEventType.deviceConnected:
        _handleDeviceConnected(event);
        break;
      case TransportEventType.deviceDisconnected:
        _handleDeviceDisconnected(event);
        break;
      case TransportEventType.dataReceived:
        if (event.data != null) {
          _handleDataReceived(event.deviceId, event.transportType, event.data!);
        }
        break;
    }
  }

  Future<void> _handleDeviceDiscovered(TransportEvent event) async {
    // If not already connected or handshake pending, connect to it
    if (!_activePeers.containsKey(event.deviceId)) {
      _log('Peer discovered: ${event.deviceName} (${event.deviceId})');
      await _commManager.connectDevice(event.deviceId, event.transportType);
    }
  }

  Future<void> _handleDeviceConnected(TransportEvent event) async {
    _log('Connected to device: ${event.deviceId}. Initiating handshake...');
    // A -> B: Send Handshake packet
    final myId = await DeviceIdService.getDeviceId();
    final myName = await DeviceIdService.getDeviceName();
    
    final handshake = {
      'type': 'HANDSHAKE',
      'device_id': myId,
      'device_name': myName,
      'role': 'VOLUNTEER', // default role
      'protocol_version': MeshConfig.protocolVersion,
      'availability': true,
    };

    final bytes = utf8.encode(jsonEncode(handshake));
    await _commManager.sendData(
      event.deviceId,
      event.transportType,
      bytes,
      characteristicUuid: MeshConfig.charHandshakeUuid,
    );
  }

  void _handleDeviceDisconnected(TransportEvent event) {
    _log('Device disconnected: ${event.deviceId}');
    _activePeers.remove(event.deviceId);
    notifyListeners();
  }

  Future<void> _handleDataReceived(String peerId, TransportType transportType, List<int> bytes) async {
    try {
      final raw = utf8.decode(bytes);
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final type = json['type'] as String?;

      switch (type) {
        case 'HANDSHAKE':
          await _processHandshake(peerId, transportType, json);
          break;
        case 'SYNC':
          await _processInventorySync(peerId, transportType, json);
          break;
        case 'REQUEST':
          await _processMessageRequest(peerId, transportType, json);
          break;
        case 'MESSAGE':
          await _processIncomingMessage(peerId, transportType, json);
          break;
        case 'ACK':
          await _processIncomingAck(peerId, json);
          break;
        default:
          _log('Received unknown packet type: $type');
      }
    } catch (e) {
      _log('Error processing incoming data: $e');
    }
  }

  Future<void> _processHandshake(String peerId, TransportType transportType, Map<String, dynamic> json) async {
    final protocolVer = json['protocol_version'] as String? ?? '';
    if (protocolVer != MeshConfig.protocolVersion) {
      _log('Handshake rejected: Incompatible protocol version $protocolVer (expected ${MeshConfig.protocolVersion})');
      await _commManager.disconnectDevice(peerId, transportType);
      return;
    }

    final remoteId = json['device_id'] as String;
    final remoteName = json['device_name'] as String? ?? 'Device';
    final roleStr = json['role'] as String? ?? 'SURVIVOR';
    final availability = json['availability'] as bool? ?? true;

    final peerIdentity = DeviceIdentity(
      deviceId: remoteId,
      deviceRole: deviceRoleFromString(roleStr),
      protocolVersion: protocolVer,
      availability: availability,
      lastSeen: DateTime.now(),
    );

    // Save/update in local repository
    await _deviceRepo.saveDevice(peerIdentity);
    _activePeers[peerId] = peerIdentity;
    _log('Handshake complete with $remoteName ($remoteId). Role: $roleStr');
    notifyListeners();

    // Send inventory sync
    await _sendInventory(peerId, transportType);
  }

  Future<void> _sendInventory(String peerId, TransportType transportType) async {
    final messages = await _messageRepo.getAllMessages();
    final messageIds = messages.map((m) => m.messageId).toList();

    final syncPacket = {
      'type': 'SYNC',
      'message_ids': messageIds,
    };

    _log('Sending message inventory (${messageIds.length} items) to $peerId');
    final bytes = utf8.encode(jsonEncode(syncPacket));
    await _commManager.sendData(
      peerId,
      transportType,
      bytes,
      characteristicUuid: MeshConfig.charMessageRequestUuid,
    );
  }

  Future<void> _processInventorySync(String peerId, TransportType transportType, Map<String, dynamic> json) async {
    final peerMessageIds = List<String>.from(json['message_ids'] as List);
    _log('Received inventory from $peerId (${peerMessageIds.length} items)');

    final myMessages = await _messageRepo.getAllMessages();
    final myMessageIds = myMessages.map((m) => m.messageId).toSet();

    // 1. Identify missing messages we need from the peer
    final missingIds = peerMessageIds.where((id) => !myMessageIds.contains(id)).toList();
    if (missingIds.isNotEmpty) {
      _log('Requesting ${missingIds.length} missing messages from $peerId');
      final requestPacket = {
        'type': 'REQUEST',
        'message_ids': missingIds,
      };
      final bytes = utf8.encode(jsonEncode(requestPacket));
      await _commManager.sendData(
        peerId,
        transportType,
        bytes,
        characteristicUuid: MeshConfig.charMessageRequestUuid,
      );
    }

    // 2. Identify messages we have that the peer is missing and push them
    final peerHasIds = peerMessageIds.toSet();
    final pushMessages = myMessages.where((m) => !peerHasIds.contains(m.messageId) && m.isValidForForwarding()).toList();

    for (final message in pushMessages) {
      final forwardMessage = message.incrementHop();
      final packet = {
        'type': 'MESSAGE',
        'data': forwardMessage.toJson(),
      };
      _log('Pushing missing message ${message.messageId} to $peerId');
      final bytes = utf8.encode(jsonEncode(packet));
      await _commManager.sendData(
        peerId,
        transportType,
        bytes,
        characteristicUuid: MeshConfig.charMessageUuid,
      );
    }
  }

  Future<void> _processMessageRequest(String peerId, TransportType transportType, Map<String, dynamic> json) async {
    final requestedIds = List<String>.from(json['message_ids'] as List);
    _log('Received request for ${requestedIds.length} messages from $peerId');

    for (final id in requestedIds) {
      final message = await _messageRepo.getMessageById(id);
      if (message != null && message.isValidForForwarding()) {
        final forwardMessage = message.incrementHop();
        final packet = {
          'type': 'MESSAGE',
          'data': forwardMessage.toJson(),
        };
        final bytes = utf8.encode(jsonEncode(packet));
        await _commManager.sendData(
          peerId,
          transportType,
          bytes,
          characteristicUuid: MeshConfig.charMessageUuid,
        );
      }
    }
  }

  Future<void> _processIncomingMessage(String peerId, TransportType transportType, Map<String, dynamic> json) async {
    final data = json['data'] as Map<String, dynamic>;
    final message = MeshMessage.fromJson(data);

    _log('Received message ${message.messageId} from $peerId via ${message.sourceDevice}');

    // 1. Uniqueness check
    final seen = await _messageRepo.hasBeenSeen(message.messageId);
    if (seen) {
      _log('Message ${message.messageId} already seen. Sending ACK anyway.');
      await _sendAck(peerId, transportType, message.messageId);
      return;
    }

    // 2. Database constraints check and save
    final saved = await _messageRepo.saveMessage(message, deliveryStatus: 'RECEIVED');
    if (!saved) return;

    await _messageRepo.markAsSeen(message.messageId);

    // Save to SOS repo if type is SOS
    if (message.type.toUpperCase() == 'SOS') {
      final sosAlert = SosModel(
        id: message.messageId,
        messageId: message.messageId,
        userId: message.sourceUser,
        latitude: message.latitude ?? 0.0,
        longitude: message.longitude ?? 0.0,
        priority: messagePriorityToString(message.priority),
        status: message.payload['status'] as String? ?? 'PENDING',
        message: message.payload['message'] as String?,
        createdAt: message.timestamp,
      );
      await _sosRepo.saveSosAlert(sosAlert);
    }

    // Enqueue to gateway synchronization queue (just in case this device is or becomes a gateway)
    await _syncRepo.enqueue(message.messageId, message.type, jsonEncode(message.toJson()));

    // 3. Send acknowledgement
    await _sendAck(peerId, transportType, message.messageId);

    // 4. Determine store-carry-forward routing
    if (message.isValidForForwarding()) {
      _log('Queuing message ${message.messageId} (hop=${message.hopCount}, ttl=${message.ttl}) for routing.');
      // Routing takes place on next handshake with other peers
    }
  }

  Future<void> _sendAck(String peerId, TransportType transportType, String messageId) async {
    final ackPacket = {
      'type': 'ACK',
      'message_id': messageId,
    };
    final bytes = utf8.encode(jsonEncode(ackPacket));
    await _commManager.sendData(
      peerId,
      transportType,
      bytes,
      characteristicUuid: MeshConfig.charAckUuid,
    );
  }

  Future<void> _processIncomingAck(String peerId, Map<String, dynamic> json) async {
    final messageId = json['message_id'] as String;
    _log('Received ACK from $peerId for message: $messageId');
    await _messageRepo.updateDeliveryStatus(messageId, 'DELIVERED');
  }

  @override
  void dispose() {
    _commSub?.cancel();
    super.dispose();
  }
}
