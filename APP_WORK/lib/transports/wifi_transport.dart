import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../config/mesh_config.dart';
import 'transport.dart';

class WiFiTransport implements Transport {
  final StreamController<TransportEvent> _eventController = StreamController<TransportEvent>.broadcast();
  ServerSocket? _tcpServer;
  RawDatagramSocket? _udpSocket;
  Timer? _broadcastTimer;
  final String _localDeviceId;
  final Map<String, Socket> _connectedSockets = {};
  final Map<String, String> _deviceIpMapping = {}; // maps deviceId to IP address

  WiFiTransport(this._localDeviceId);

  @override
  TransportType get type => TransportType.wifi;

  @override
  Future<void> startDiscovery() async {
    try {
      // 1. Start TCP Server to listen for incoming connections
      _tcpServer = await ServerSocket.bind(InternetAddress.anyIPv4, MeshConfig.wifiPort);
      _tcpServer!.listen(_handleIncomingConnection);

      // 2. Start UDP Socket for broadcasting presence and listening for peers
      _udpSocket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, MeshConfig.wifiPort);
      _udpSocket!.broadcastEnabled = true;
      _udpSocket!.listen(_handleIncomingUdpDatagram);

      // 3. Periodic presence broadcast
      _broadcastTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
        _broadcastPresence();
      });
      debugPrint('[WiFi] P2P Transport started on port ${MeshConfig.wifiPort}');
    } catch (e) {
      debugPrint('[WiFi] Failed to start transport: $e');
    }
  }

  @override
  Future<void> stopDiscovery() async {
    _broadcastTimer?.cancel();
    _udpSocket?.close();
    await _tcpServer?.close();
    for (final socket in _connectedSockets.values) {
      await socket.close();
    }
    _connectedSockets.clear();
  }

  @override
  Future<bool> connect(String deviceId) async {
    final ip = _deviceIpMapping[deviceId];
    if (ip == null) {
      debugPrint('[WiFi] Cannot connect to $deviceId: IP address unknown.');
      return false;
    }

    try {
      final socket = await Socket.connect(ip, MeshConfig.wifiPort, timeout: const Duration(seconds: 3));
      _connectedSockets[deviceId] = socket;

      socket.listen(
        (data) => _handleIncomingData(deviceId, data),
        onDone: () => _handleDisconnect(deviceId),
        onError: (_) => _handleDisconnect(deviceId),
      );

      _eventController.add(TransportEvent(
        transportType: TransportType.wifi,
        eventType: TransportEventType.deviceConnected,
        deviceId: deviceId,
      ));
      return true;
    } catch (e) {
      debugPrint('[WiFi] Connection failed to $deviceId ($ip): $e');
      return false;
    }
  }

  @override
  Future<void> disconnect(String deviceId) async {
    final socket = _connectedSockets[deviceId];
    if (socket != null) {
      await socket.close();
      _connectedSockets.remove(deviceId);
    }
    _handleDisconnect(deviceId);
  }

  @override
  Future<bool> sendData(String deviceId, List<int> data, {String? characteristicUuid}) async {
    var socket = _connectedSockets[deviceId];
    if (socket == null) {
      // Try to connect automatically if IP is known
      final connected = await connect(deviceId);
      if (!connected) return false;
      socket = _connectedSockets[deviceId];
    }

    try {
      socket!.add(data);
      await socket.flush();
      return true;
    } catch (e) {
      debugPrint('[WiFi] Error sending data to $deviceId: $e');
      _handleDisconnect(deviceId);
      return false;
    }
  }

  @override
  Stream<TransportEvent> get events => _eventController.stream;

  void _broadcastPresence() {
    if (_udpSocket == null) return;
    try {
      final presenceMsg = 'DISCOVER:$_localDeviceId';
      final data = utf8.encode(presenceMsg);
      // Broadcast to typical subnet broadcast addresses
      _udpSocket!.send(data, InternetAddress('255.255.255.255'), MeshConfig.wifiPort);
    } catch (e) {
      debugPrint('[WiFi] Broadcast error: $e');
    }
  }

  void _handleIncomingUdpDatagram(RawSocketEvent event) {
    if (event == RawSocketEvent.read) {
      final datagram = _udpSocket?.receive();
      if (datagram == null) return;

      try {
        final message = utf8.decode(datagram.data);
        if (message.startsWith('DISCOVER:')) {
          final peerId = message.substring(9);
          final peerIp = datagram.address.address;

          if (peerId != _localDeviceId) {
            _deviceIpMapping[peerId] = peerIp;
            _eventController.add(TransportEvent(
              transportType: TransportType.wifi,
              eventType: TransportEventType.deviceDiscovered,
              deviceId: peerId,
              deviceName: 'WiFi-$peerId',
            ));
          }
        }
      } catch (e) {
        debugPrint('[WiFi] Error parsing UDP payload: $e');
      }
    }
  }

  void _handleIncomingConnection(Socket socket) {
    String? peerDeviceId;

    socket.listen(
      (data) {
        // If peer identity is not yet known, assume it will send a Handshake or identity info
        if (peerDeviceId == null) {
          try {
            final json = jsonDecode(utf8.decode(data)) as Map<String, dynamic>;
            peerDeviceId = json['device_id'] as String?;
            if (peerDeviceId != null) {
              _connectedSockets[peerDeviceId!] = socket;
              _eventController.add(TransportEvent(
                transportType: TransportType.wifi,
                eventType: TransportEventType.deviceConnected,
                deviceId: peerDeviceId!,
              ));
            }
          } catch (_) {}
        }

        if (peerDeviceId != null) {
          _handleIncomingData(peerDeviceId!, data);
        }
      },
      onDone: () {
        if (peerDeviceId != null) _handleDisconnect(peerDeviceId!);
      },
      onError: (_) {
        if (peerDeviceId != null) _handleDisconnect(peerDeviceId!);
      },
    );
  }

  void _handleIncomingData(String deviceId, List<int> data) {
    _eventController.add(TransportEvent(
      transportType: TransportType.wifi,
      eventType: TransportEventType.dataReceived,
      deviceId: deviceId,
      data: data,
    ));
  }

  void _handleDisconnect(String deviceId) {
    _connectedSockets.remove(deviceId);
    _eventController.add(TransportEvent(
      transportType: TransportType.wifi,
      eventType: TransportEventType.deviceDisconnected,
      deviceId: deviceId,
    ));
  }

  @override
  void dispose() {
    stopDiscovery();
    _eventController.close();
  }
}
