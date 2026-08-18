import 'dart:async';
import '../config/mesh_config.dart';
import '../services/ble_service.dart';
import 'transport.dart';

class BleTransport implements Transport {
  final BleService _bleService;
  final StreamController<TransportEvent> _eventController = StreamController<TransportEvent>.broadcast();
  StreamSubscription<BleDataReceivedEvent>? _dataSub;
  VoidCallback? _bleListener;

  BleTransport(this._bleService) {
    // Listen to data events from BleService and map to TransportEvents
    _dataSub = _bleService.dataStream.listen((event) {
      _eventController.add(TransportEvent(
        transportType: TransportType.ble,
        eventType: TransportEventType.dataReceived,
        deviceId: event.deviceId,
        data: event.data,
        characteristicUuid: event.characteristicUuid,
      ));
    });

    // Listen to device scan results
    _bleListener = () {
      for (final result in _bleService.nearbyDevices) {
        _eventController.add(TransportEvent(
          transportType: TransportType.ble,
          eventType: TransportEventType.deviceDiscovered,
          deviceId: result.device.remoteId.toString(),
          deviceName: result.device.platformName.isNotEmpty ? result.device.platformName : result.advertisementData.advName,
        ));
      }
    };
    _bleService.addListener(_bleListener!);
  }

  @override
  TransportType get type => TransportType.ble;

  @override
  Future<void> startDiscovery() async {
    await _bleService.startScan();
  }

  @override
  Future<void> stopDiscovery() async {
    await _bleService.stopScan();
  }

  @override
  Future<bool> connect(String deviceId) async {
    final success = await _bleService.connect(deviceId);
    if (success) {
      _eventController.add(TransportEvent(
        transportType: TransportType.ble,
        eventType: TransportEventType.deviceConnected,
        deviceId: deviceId,
      ));
    }
    return success;
  }

  @override
  Future<void> disconnect(String deviceId) async {
    await _bleService.disconnect(deviceId);
    _eventController.add(TransportEvent(
      transportType: TransportType.ble,
      eventType: TransportEventType.deviceDisconnected,
      deviceId: deviceId,
    ));
  }

  @override
  Future<bool> sendData(String deviceId, List<int> data, {String? characteristicUuid}) async {
    final charUuid = characteristicUuid ?? MeshConfig.charMessageUuid;
    return await _bleService.sendData(deviceId, charUuid, data);
  }

  @override
  Stream<TransportEvent> get events => _eventController.stream;

  @override
  void dispose() {
    _dataSub?.cancel();
    if (_bleListener != null) {
      _bleService.removeListener(_bleListener!);
    }
    _eventController.close();
  }
}
