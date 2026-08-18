import 'dart:async';
import '../transports/transport.dart';

class CommunicationManager {
  final List<Transport> _transports = [];
  final StreamController<TransportEvent> _eventStreamController = StreamController<TransportEvent>.broadcast();
  final List<StreamSubscription<TransportEvent>> _subscriptions = [];

  CommunicationManager(List<Transport> transports) {
    _transports.addAll(transports);
    for (final transport in _transports) {
      final sub = transport.events.listen((event) {
        _eventStreamController.add(event);
      });
      _subscriptions.add(sub);
    }
  }

  Stream<TransportEvent> get events => _eventStreamController.stream;

  Future<void> startDiscovery() async {
    for (final transport in _transports) {
      await transport.startDiscovery();
    }
  }

  Future<void> stopDiscovery() async {
    for (final transport in _transports) {
      await transport.stopDiscovery();
    }
  }

  Future<bool> connectDevice(String deviceId, TransportType transportType) async {
    final transport = _transports.firstWhere((t) => t.type == transportType);
    return await transport.connect(deviceId);
  }

  Future<void> disconnectDevice(String deviceId, TransportType transportType) async {
    final transport = _transports.firstWhere((t) => t.type == transportType);
    await transport.disconnect(deviceId);
  }

  Future<bool> sendData(String deviceId, TransportType transportType, List<int> data, {String? characteristicUuid}) async {
    final transport = _transports.firstWhere((t) => t.type == transportType);
    return await transport.sendData(deviceId, data, characteristicUuid: characteristicUuid);
  }

  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    for (final transport in _transports) {
      transport.dispose();
    }
    _eventStreamController.close();
  }
}
