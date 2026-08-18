import 'dart:async';

enum TransportType { ble, wifi }

enum TransportEventType {
  deviceDiscovered,
  deviceConnected,
  deviceDisconnected,
  dataReceived
}

class TransportEvent {
  final TransportType transportType;
  final TransportEventType eventType;
  final String deviceId;
  final String? deviceName;
  final List<int>? data;
  final String? characteristicUuid; // relevant for BLE

  TransportEvent({
    required this.transportType,
    required this.eventType,
    required this.deviceId,
    this.deviceName,
    this.data,
    this.characteristicUuid,
  });
}

abstract class Transport {
  TransportType get type;
  Future<void> startDiscovery();
  Future<void> stopDiscovery();
  Future<bool> connect(String deviceId);
  Future<void> disconnect(String deviceId);
  Future<bool> sendData(String deviceId, List<int> data, {String? characteristicUuid});
  Stream<TransportEvent> get events;
  void dispose();
}
