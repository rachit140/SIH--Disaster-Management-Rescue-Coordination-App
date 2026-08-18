import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/local_database.dart';
import '../services/location_service.dart';
import '../services/mesh_service.dart';
import '../services/sync_service.dart';

class SosProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final LocationService _location = LocationService();
  final MeshService _mesh = MeshService();
  final SyncService _sync = SyncService();

  bool _sending = false;
  String? _error;
  SosModel? _activeSos;
  List<SosModel> _nearbySos = [];

  bool get sending => _sending;
  String? get error => _error;
  SosModel? get activeSos => _activeSos;
  List<SosModel> get nearbySos => _nearbySos;
  MeshService get mesh => _mesh;

  Future<void> sendSos({String? message}) async {
    _sending = true;
    _error = null;
    notifyListeners();

    try {
      final position = await _location.getCurrentLocation();
      final messageId = 'SOS-${const Uuid().v4().substring(0, 8).toUpperCase()}';
      final now = DateTime.now().toIso8601String();

      await LocalDatabase.saveSosAlert({
        'message_id': messageId,
        'user_id': 'local',
        'latitude': position.latitude,
        'longitude': position.longitude,
        'priority': 'CRITICAL',
        'status': 'PENDING',
        'message': message,
        'created_at': now,
      });

      final offlineMsg = OfflineMessage(
        messageId: messageId,
        type: 'SOS',
        sourceDevice: await _mesh.deviceId,
        sourceUser: 'local',
        timestamp: now,
        priority: 'CRITICAL',
        ttl: 8,
        hopCount: 0,
        latitude: position.latitude,
        longitude: position.longitude,
        payload: {'message': message ?? 'Emergency SOS', 'status': 'PENDING'},
      );

      await _mesh.broadcastMessage(offlineMsg);

      final connectivity = await Connectivity().checkConnectivity();
      final isOnline = connectivity.any((r) => r != ConnectivityResult.none);

      if (isOnline) {
        _activeSos = await _api.createSos(
          messageId: messageId,
          latitude: position.latitude,
          longitude: position.longitude,
          message: message,
        );
      } else {
        await LocalDatabase.enqueueSync({
          'message_id': messageId,
          'event_type': 'SOS',
          'payload': offlineMsg.toJson().toString(),
          'retry_count': 0,
          'sync_status': 'PENDING',
          'created_at': now,
        });
      }

      await _sync.processQueue();
    } catch (e) {
      _error = e.toString();
    } finally {
      _sending = false;
      notifyListeners();
    }
  }

  Future<void> loadNearbySos() async {
    try {
      _nearbySos = await _api.listSos();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }
}
