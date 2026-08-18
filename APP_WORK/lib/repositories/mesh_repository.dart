import 'dart:convert';
import 'package:uuid/uuid.dart';
import '../models/models.dart';
import '../services/local_database.dart';
import '../services/device_id_service.dart';

class MeshRepository {
  final Uuid _uuid = const Uuid();

  /// Generates a unique message ID of the format MSG-[UUID]
  String generateMessageId() {
    return 'MSG-${_uuid.v4()}';
  }

  /// Ingests a new message, validating and storing it if it is not a duplicate.
  /// Returns true if the message was successfully stored, false if ignored.
  Future<bool> ingestMessage(MeshMessage message) async {
    // 1. Basic validation
    if (!message.isValid()) {
      return false;
    }

    // 2. Check for duplicate messages
    final alreadySeen = await LocalDatabase.hasSeenMessage(message.messageId);
    if (alreadySeen) {
      return false;
    }

    // 3. Mark as seen to prevent loops
    await LocalDatabase.markSeen(message.messageId);

    // 4. Save message to messages table
    final messageData = {
      'message_id': message.messageId,
      'type': message.type,
      'source_device': message.sourceDevice,
      'source_user': message.sourceUser,
      'timestamp': message.timestamp.toIso8601String(),
      'priority': messagePriorityToString(message.priority),
      'ttl': message.ttl,
      'hop_count': message.hopCount,
      'latitude': message.latitude,
      'longitude': message.longitude,
      'payload': jsonEncode(message.payload),
    };
    await LocalDatabase.saveMessage(messageData);

    // 5. If it's an SOS type message, save it to sos_alerts as well
    if (message.type.toUpperCase() == 'SOS') {
      final sosData = {
        'message_id': message.messageId,
        'user_id': message.sourceUser,
        'latitude': message.latitude ?? 0.0,
        'longitude': message.longitude ?? 0.0,
        'priority': messagePriorityToString(message.priority),
        'status': message.payload['status'] as String? ?? 'PENDING',
        'message': message.payload['message'] as String?,
        'created_at': message.timestamp.toIso8601String(),
      };
      await LocalDatabase.saveSosAlert(sosData);
    }

    // 6. Record in offline events log
    final eventData = {
      'message_id': message.messageId,
      'event_type': 'INGEST_${message.type.toUpperCase()}',
      'payload': jsonEncode(message.payload),
      'created_at': DateTime.now().toIso8601String(),
    };
    await LocalDatabase.saveOfflineEvent(eventData);

    // 7. Enqueue to sync queue to be synced when internet becomes available
    final syncData = {
      'message_id': message.messageId,
      'event_type': message.type,
      'payload': jsonEncode(message.toJson()),
      'retry_count': 0,
      'sync_status': 'PENDING',
      'created_at': DateTime.now().toIso8601String(),
    };
    await LocalDatabase.enqueueSync(syncData);

    return true;
  }

  /// Discovers and records/updates a peer device's identity.
  Future<void> registerDiscoveredDevice(DeviceIdentity device) async {
    final data = {
      'device_id': device.deviceId,
      'device_name': device.deviceName,
      'last_seen': device.lastSeen.toIso8601String(),
    };
    await LocalDatabase.saveDevice(data);
  }

  /// Creates a local SOS alert and immediately ingests it.
  Future<MeshMessage> createLocalSosAlert({
    required String userId,
    required double latitude,
    required double longitude,
    required MessagePriority priority,
    String? messageText,
  }) async {
    final messageId = generateMessageId();
    final deviceId = await DeviceIdService.getDeviceId();
    final timestamp = DateTime.now();

    final payload = {
      'message': messageText,
      'status': 'PENDING',
    };

    final message = MeshMessage(
      messageId: messageId,
      type: 'SOS',
      sourceDevice: deviceId,
      sourceUser: userId,
      timestamp: timestamp,
      priority: priority,
      ttl: 8, // Standard initial TTL
      hopCount: 0,
      latitude: latitude,
      longitude: longitude,
      payload: payload,
    );

    await ingestMessage(message);
    return message;
  }

  /// Retrieves all ingested mesh messages.
  Future<List<MeshMessage>> getAllMessages() async {
    final list = await LocalDatabase.getMessages();
    return list.map((json) {
      final payloadStr = json['payload'] as String;
      final payloadMap = jsonDecode(payloadStr) as Map<String, dynamic>;

      return MeshMessage(
        messageId: json['message_id'] as String,
        type: json['type'] as String,
        sourceDevice: json['source_device'] as String,
        sourceUser: json['source_user'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        priority: messagePriorityFromString(json['priority'] as String),
        ttl: json['ttl'] as int,
        hopCount: json['hop_count'] as int,
        latitude: json['latitude'] as double?,
        longitude: json['longitude'] as double?,
        payload: payloadMap,
      );
    }).toList();
  }

  /// Retrieves all registered devices in the mesh.
  Future<List<DeviceIdentity>> getAllDevices() async {
    final list = await LocalDatabase.getDevices();
    return list.map((json) {
      return DeviceIdentity(
        deviceId: json['device_id'] as String,
        deviceName: json['device_name'] as String,
        lastSeen: DateTime.parse(json['last_seen'] as String),
      );
    }).toList();
  }
}
