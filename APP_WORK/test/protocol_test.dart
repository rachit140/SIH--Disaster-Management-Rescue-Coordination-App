import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:sih1440_mobile/config/mesh_config.dart';
import 'package:sih1440_mobile/models/models.dart';
import 'package:sih1440_mobile/services/mesh_router.dart';
import 'package:sih1440_mobile/services/communication_manager.dart';
import 'package:sih1440_mobile/transports/transport.dart';

class MockTransport implements Transport {
  final StreamController<TransportEvent> _eventsController = StreamController<TransportEvent>.broadcast();
  final List<List<int>> sentData = [];
  bool discoveryStarted = false;
  bool connected = false;

  @override
  TransportType get type => TransportType.ble;

  @override
  Stream<TransportEvent> get events => _eventsController.stream;

  @override
  Future<void> startDiscovery() async {
    discoveryStarted = true;
  }

  @override
  Future<void> stopDiscovery() async {
    discoveryStarted = false;
  }

  @override
  Future<bool> connect(String deviceId) async {
    connected = true;
    _eventsController.add(TransportEvent(
      transportType: type,
      eventType: TransportEventType.deviceConnected,
      deviceId: deviceId,
    ));
    return true;
  }

  @override
  Future<void> disconnect(String deviceId) async {
    connected = false;
    _eventsController.add(TransportEvent(
      transportType: type,
      eventType: TransportEventType.deviceDisconnected,
      deviceId: deviceId,
    ));
  }

  @override
  Future<bool> sendData(String deviceId, List<int> data, {String? characteristicUuid}) async {
    sentData.add(data);
    return true;
  }

  void simulateDeviceDiscovered(String deviceId, String name) {
    _eventsController.add(TransportEvent(
      transportType: type,
      eventType: TransportEventType.deviceDiscovered,
      deviceId: deviceId,
      deviceName: name,
    ));
  }

  void simulateDataReceived(String deviceId, List<int> data, {String? charUuid}) {
    _eventsController.add(TransportEvent(
      transportType: type,
      eventType: TransportEventType.dataReceived,
      deviceId: deviceId,
      data: data,
      characteristicUuid: charUuid,
    ));
  }

  @override
  void dispose() {
    _eventsController.close();
  }
}

void main() {
  group('Mesh Protocol Verification Tests', () {
    late MockTransport mockTransport;
    late CommunicationManager commManager;
    late MeshRouter meshRouter;

    setUp(() {
      mockTransport = MockTransport();
      commManager = CommunicationManager([mockTransport]);
      meshRouter = MeshRouter(commManager);
    });

    tearDown(() {
      meshRouter.dispose();
      commManager.dispose();
      mockTransport.dispose();
    });

    test('MeshRouter automatically connects to discovered peers', () async {
      expect(mockTransport.connected, isFalse);

      mockTransport.simulateDeviceDiscovered('peer-1', 'Test Peer');

      // Allow event loop to process event
      await Future.delayed(const Duration(milliseconds: 100));

      expect(mockTransport.connected, isTrue);
    });

    test('Peer Handshake exchanges device info and sends SYNC inventory packet', () async {
      mockTransport.simulateDeviceDiscovered('peer-1', 'Test Peer');
      await Future.delayed(const Duration(milliseconds: 100));

      // Handshake packet sent on connection from MockTransport
      expect(mockTransport.sentData, isNotEmpty);
      final rawHandshake = utf8.decode(mockTransport.sentData.first);
      final json = jsonDecode(rawHandshake) as Map<String, dynamic>;

      expect(json['type'], 'HANDSHAKE');
      expect(json['protocol_version'], MeshConfig.protocolVersion);

      // Now B -> A sends Handshake
      final remoteHandshake = {
        'type': 'HANDSHAKE',
        'device_id': 'peer-1',
        'device_name': 'Test Peer',
        'role': 'SURVIVOR',
        'protocol_version': MeshConfig.protocolVersion,
        'availability': true,
      };

      mockTransport.simulateDataReceived('peer-1', utf8.encode(jsonEncode(remoteHandshake)));
      await Future.delayed(const Duration(milliseconds: 100));

      // After handshake, A should send its SYNC inventory packet
      expect(mockTransport.sentData.length, greaterThan(1));
      final rawSync = utf8.decode(mockTransport.sentData.last);
      final syncJson = jsonDecode(rawSync) as Map<String, dynamic>;

      expect(syncJson['type'], 'SYNC');
      expect(syncJson['message_ids'], isList);
    });

    test('Protocol Handshake rejects incompatible protocol versions', () async {
      mockTransport.simulateDeviceDiscovered('peer-1', 'Test Peer');
      await Future.delayed(const Duration(milliseconds: 100));

      // peer-1 sends incompatible version handshake
      final remoteHandshake = {
        'type': 'HANDSHAKE',
        'device_id': 'peer-1',
        'device_name': 'Test Peer',
        'role': 'SURVIVOR',
        'protocol_version': 'v99.0', // incompatible
        'availability': true,
      };

      mockTransport.simulateDataReceived('peer-1', utf8.encode(jsonEncode(remoteHandshake)));
      await Future.delayed(const Duration(milliseconds: 100));

      // Should have disconnected
      expect(mockTransport.connected, isFalse);
    });

    test('Inventory Sync requests missing message IDs from peer', () async {
      // Simulate completed handshake
      meshRouter.activePeers['peer-1'] = DeviceIdentity(
        deviceId: 'peer-1',
        deviceRole: DeviceRole.survivor,
        protocolVersion: MeshConfig.protocolVersion,
        availability: true,
        lastSeen: DateTime.now(),
      );

      // Peer sends SYNC inventory containing a message ID we don't have
      final peerInventory = {
        'type': 'SYNC',
        'message_ids': ['MSG-999'],
      };

      mockTransport.simulateDataReceived('peer-1', utf8.encode(jsonEncode(peerInventory)));
      await Future.delayed(const Duration(milliseconds: 100));

      // Router should request MSG-999
      expect(mockTransport.sentData, isNotEmpty);
      final rawRequest = utf8.decode(mockTransport.sentData.last);
      final requestJson = jsonDecode(rawRequest) as Map<String, dynamic>;

      expect(requestJson['type'], 'REQUEST');
      expect(requestJson['message_ids'], contains('MSG-999'));
    });
  });
}
