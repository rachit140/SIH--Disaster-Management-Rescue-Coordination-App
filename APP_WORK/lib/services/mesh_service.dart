import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/models.dart';
import 'local_database.dart';

/// BLE mesh layer implementing store-carry-forward with TTL and deduplication.
class MeshService extends ChangeNotifier {
  static const serviceUuid = '0000sih1-0000-1000-8000-00805f9b34fb';
  static const charUuid = '0000sih2-0000-1000-8000-00805f9b34fb';
  static const maxHopCount = 10;

  String? _deviceId;
  bool _isScanning = false;
  final List<ScanResult> _nearbyDevices = [];
  final List<OfflineMessage> _forwardQueue = [];
  StreamSubscription<List<ScanResult>>? _scanSub;

  bool get isScanning => _isScanning;
  List<ScanResult> get nearbyDevices => List.unmodifiable(_nearbyDevices);
  List<OfflineMessage> get forwardQueue => List.unmodifiable(_forwardQueue);

  Future<String> get deviceId async {
    _deviceId ??= await _loadOrCreateDeviceId();
    return _deviceId!;
  }

  String get deviceIdValue => _deviceId ?? 'loading...';

  Future<String> _loadOrCreateDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString('device_id');
    if (id == null) {
      id = 'DEVICE-${const Uuid().v4().substring(0, 8).toUpperCase()}';
      await prefs.setString('device_id', id);
    }
    _deviceId = id;
    return id;
  }

  Future<void> startScanning() async {
    if (_isScanning) return;
    await _loadOrCreateDeviceId();

    if (await FlutterBluePlus.isSupported == false) return;

    _isScanning = true;
    notifyListeners();

    _scanSub = FlutterBluePlus.scanResults.listen((results) {
      _nearbyDevices
        ..clear()
        ..addAll(results);
      notifyListeners();
      _processForwardQueue();
    });

    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));
  }

  Future<void> stopScanning() async {
    _isScanning = false;
    await _scanSub?.cancel();
    await FlutterBluePlus.stopScan();
    notifyListeners();
  }

  Future<void> broadcastMessage(OfflineMessage message) async {
    await _storeMessage(message);
    _forwardQueue.add(message);
    notifyListeners();
    await _processForwardQueue();
  }

  Future<void> receiveMessage(OfflineMessage message) async {
    final seen = await LocalDatabase.hasSeenMessage(message.messageId);
    if (seen) return;

    await LocalDatabase.markSeen(message.messageId);
    await _storeMessage(message);

    if (message.ttl <= 0 || message.hopCount >= maxHopCount) return;

    final forwardMsg = OfflineMessage(
      messageId: message.messageId,
      type: message.type,
      sourceDevice: message.sourceDevice,
      sourceUser: message.sourceUser,
      timestamp: message.timestamp,
      priority: message.priority,
      ttl: message.ttl - 1,
      hopCount: message.hopCount + 1,
      latitude: message.latitude,
      longitude: message.longitude,
      payload: message.payload,
    );

    _forwardQueue.add(forwardMsg);
    notifyListeners();
    await _processForwardQueue();
  }

  Future<void> _storeMessage(OfflineMessage message) async {
    await LocalDatabase.saveMessage({
      'message_id': message.messageId,
      'type': message.type,
      'payload': jsonEncode(message.payload),
      'timestamp': message.timestamp,
      'ttl': message.ttl,
      'hop_count': message.hopCount,
      'delivery_status': 'PENDING',
    });
  }

  Future<void> _processForwardQueue() async {
    if (_forwardQueue.isEmpty || _nearbyDevices.isEmpty) return;

    final queue = List<OfflineMessage>.from(_forwardQueue);
    _forwardQueue.clear();

    for (final message in queue) {
      final seen = await LocalDatabase.hasSeenMessage('fwd-${message.messageId}-${message.hopCount}');
      if (seen) continue;

      // Simulate BLE forward — in production, write to characteristic
      debugPrint('[Mesh] Forwarding ${message.messageId} hop=${message.hopCount} ttl=${message.ttl}');
      await LocalDatabase.markSeen('fwd-${message.messageId}-${message.hopCount}');

      if (message.ttl > 0 && message.hopCount < maxHopCount) {
        // Re-queue if not yet delivered to all peers
        _forwardQueue.add(message);
      }
    }
    notifyListeners();
  }

  /// Parse incoming BLE data into an OfflineMessage
  OfflineMessage? parseIncomingData(List<int> data) {
    try {
      final json = jsonDecode(utf8.decode(data)) as Map<String, dynamic>;
      return OfflineMessage.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  /// Encode message for BLE transmission
  List<int> encodeMessage(OfflineMessage message) {
    return utf8.encode(jsonEncode(message.toJson()));
  }
}
