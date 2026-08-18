import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../config/mesh_config.dart';

class BleService extends ChangeNotifier {
  bool _isScanning = false;
  final List<ScanResult> _nearbyDevices = [];
  StreamSubscription<List<ScanResult>>? _scanSub;
  final Map<String, BluetoothDevice> _connectedDevices = {};
  
  // Stream controller to broadcast data received from remote peers
  final _dataStreamController = StreamController<BleDataReceivedEvent>.broadcast();

  bool get isScanning => _isScanning;
  List<ScanResult> get nearbyDevices => List.unmodifiable(_nearbyDevices);
  Stream<BleDataReceivedEvent> get dataStream => _dataStreamController.stream;

  Future<void> startScan() async {
    if (_isScanning) return;

    if (await FlutterBluePlus.isSupported == false) {
      debugPrint('[BLE] Bluetooth not supported on this device.');
      return;
    }

    _isScanning = true;
    _nearbyDevices.clear();
    notifyListeners();

    _scanSub = FlutterBluePlus.scanResults.listen((results) {
      // Filter results to only include devices advertising our service UUID
      final filteredResults = results.where((r) {
        return r.advertisementData.serviceUuids.map((u) => u.toString().toLowerCase()).contains(MeshConfig.serviceUuid.toLowerCase());
      }).toList();

      _nearbyDevices.clear();
      _nearbyDevices.addAll(filteredResults);
      notifyListeners();
    });

    try {
      // Start scan with the service UUID filter
      await FlutterBluePlus.startScan(
        withServices: [Guid(MeshConfig.serviceUuid)],
        timeout: const Duration(seconds: 15),
      );
    } catch (e) {
      debugPrint('[BLE] Error starting scan: $e');
      _isScanning = false;
      notifyListeners();
    }
  }

  Future<void> stopScan() async {
    if (!_isScanning) return;
    _isScanning = false;
    await _scanSub?.cancel();
    await FlutterBluePlus.stopScan();
    notifyListeners();
  }

  Future<bool> connect(String deviceId) async {
    // Find the device in scan results
    final result = _nearbyDevices.firstWhere(
      (r) => r.device.remoteId.toString() == deviceId,
      orElse: () => throw Exception('Device not found in scan results'),
    );

    final device = result.device;
    try {
      await device.connect(timeout: const Duration(seconds: 5));
      _connectedDevices[deviceId] = device;
      
      // Start listening to notifications or read characteristics
      await _setupNotifications(device);
      return true;
    } catch (e) {
      debugPrint('[BLE] Connection failed to $deviceId: $e');
      return false;
    }
  }

  Future<void> disconnect(String deviceId) async {
    final device = _connectedDevices[deviceId];
    if (device != null) {
      await device.disconnect();
      _connectedDevices.remove(deviceId);
    }
  }

  Future<List<BluetoothService>> discoverServices(String deviceId) async {
    final device = _connectedDevices[deviceId];
    if (device == null) throw Exception('Device not connected');
    return await device.discoverServices();
  }

  Future<bool> sendData(String deviceId, String characteristicUuid, List<int> data) async {
    final device = _connectedDevices[deviceId];
    if (device == null) {
      debugPrint('[BLE] Cannot send data, device $deviceId not connected.');
      return false;
    }

    try {
      final services = await device.discoverServices();
      final meshService = services.firstWhere(
        (s) => s.uuid.toString().toLowerCase() == MeshConfig.serviceUuid.toLowerCase(),
        orElse: () => throw Exception('Mesh Service not found'),
      );

      final char = meshService.characteristics.firstWhere(
        (c) => c.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase(),
        orElse: () => throw Exception('Characteristic not found'),
      );

      // Write data (split into MTU sized packets if necessary, standard MTU is 20-512 bytes)
      await char.write(data, withoutResponse: false);
      return true;
    } catch (e) {
      debugPrint('[BLE] Error sending data to $deviceId: $e');
      return false;
    }
  }

  Future<void> _setupNotifications(BluetoothDevice device) async {
    try {
      final services = await device.discoverServices();
      final meshService = services.firstWhere(
        (s) => s.uuid.toString().toLowerCase() == MeshConfig.serviceUuid.toLowerCase(),
      );

      // List of characteristics we want to subscribe to
      final charUuids = [
        MeshConfig.charHandshakeUuid,
        MeshConfig.charMessageUuid,
        MeshConfig.charMessageRequestUuid,
        MeshConfig.charAckUuid
      ];

      for (final charUuid in charUuids) {
        final chars = meshService.characteristics.where((c) => c.uuid.toString().toLowerCase() == charUuid.toLowerCase());
        if (chars.isNotEmpty) {
          final char = chars.first;
          if (char.properties.notify || char.properties.indicate) {
            await char.setNotifyValue(true);
            char.onValueReceived.listen((data) {
              _dataStreamController.add(BleDataReceivedEvent(
                deviceId: device.remoteId.toString(),
                characteristicUuid: charUuid,
                data: data,
              ));
            });
          }
        }
      }
    } catch (e) {
      debugPrint('[BLE] Error setting up notifications for ${device.remoteId}: $e');
    }
  }

  @override
  void dispose() {
    _dataStreamController.close();
    _scanSub?.cancel();
    super.dispose();
  }
}

class BleDataReceivedEvent {
  final String deviceId;
  final String characteristicUuid;
  final List<int> data;

  BleDataReceivedEvent({
    required this.deviceId,
    required this.characteristicUuid,
    required this.data,
  });
}
