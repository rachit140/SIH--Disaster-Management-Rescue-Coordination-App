import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../repositories/sync_queue_repository.dart';
import 'api_service.dart';

class GatewayService {
  final ApiService _api = ApiService();
  final SyncQueueRepository _syncRepo = SyncQueueRepository();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _isSyncing = false;

  void startMonitoring() {
    debugPrint('[Gateway] Starting network monitoring...');
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final hasInternet = results.any((r) => r != ConnectivityResult.none);
      if (hasInternet) {
        debugPrint('[Gateway] Internet network connection detected. Triggering queue sync...');
        processSyncQueue();
      }
    });
  }

  Future<void> processSyncQueue() async {
    if (_isSyncing) return;

    final connectivity = await Connectivity().checkConnectivity();
    final hasInternet = connectivity.any((r) => r != ConnectivityResult.none);
    if (!hasInternet) return;

    _isSyncing = true;

    try {
      final pending = await _syncRepo.getPendingSyncItems();
      if (pending.isEmpty) {
        _isSyncing = false;
        return;
      }

      debugPrint('[Gateway] Found ${pending.length} pending items to synchronize...');

      await _api.loadToken();

      final eventsList = pending.map((item) {
        Map<String, dynamic> payload;
        try {
          payload = jsonDecode(item['payload'] as String) as Map<String, dynamic>;
        } catch (_) {
          payload = {'raw': item['payload']};
        }

        return {
          'messageId': item['message_id'],
          'eventType': item['event_type'],
          'payload': payload,
          'timestamp': item['created_at'],
        };
      }).toList();

      // Send to server
      await _api.syncEvents(eventsList);

      // Mark all as successfully synced
      for (final item in pending) {
        final id = item['id'] as int;
        await _syncRepo.markAsSynced(id);
      }
      debugPrint('[Gateway] Successfully synced ${pending.length} events to backend.');
    } catch (e) {
      debugPrint('[Gateway] Error synchronizing queue: $e');
      // Increment retry counts for failed items
      final pending = await _syncRepo.getPendingSyncItems();
      for (final item in pending) {
        final id = item['id'] as int;
        final currentRetry = item['retry_count'] as int? ?? 0;
        await _syncRepo.updateRetryInfo(
          id,
          currentRetry + 1,
          DateTime.now().toIso8601String(),
        );
      }
    } finally {
      _isSyncing = false;
    }
  }

  void stopMonitoring() {
    _connectivitySub?.cancel();
  }
}
