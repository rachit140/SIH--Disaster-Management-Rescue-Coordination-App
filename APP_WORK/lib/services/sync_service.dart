import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'api_service.dart';
import 'local_database.dart';

class SyncService {
  final ApiService _api = ApiService();
  static const maxRetries = 5;
  static const baseDelayMs = 1000;

  Future<void> processQueue() async {
    final connectivity = await Connectivity().checkConnectivity();
    final isOnline = connectivity.any((r) => r != ConnectivityResult.none);
    if (!isOnline) return;

    await _api.loadToken();
    final pending = await LocalDatabase.getPendingSync();
    if (pending.isEmpty) return;

    final events = pending.map((item) {
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

    try {
      await _api.syncEvents(events);
      for (final item in pending) {
        await LocalDatabase.markSynced(item['id'] as int);
      }
    } catch (_) {
      // Retry handled on next processQueue call
    }
  }

  Future<void> enqueueAndSync({
    required String messageId,
    required String eventType,
    required Map<String, dynamic> payload,
  }) async {
    await LocalDatabase.enqueueSync({
      'message_id': messageId,
      'event_type': eventType,
      'payload': jsonEncode(payload),
      'retry_count': 0,
      'sync_status': 'PENDING',
      'created_at': DateTime.now().toIso8601String(),
    });
    await processQueue();
  }
}
