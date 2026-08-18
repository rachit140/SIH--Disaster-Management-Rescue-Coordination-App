import '../services/local_database.dart';

class SyncQueueRepository {
  Future<void> enqueue(String messageId, String eventType, String jsonPayload) async {
    final data = {
      'message_id': messageId,
      'event_type': eventType,
      'payload': jsonPayload,
      'created_at': DateTime.now().toIso8601String(),
      'retry_count': 0,
      'sync_status': 'PENDING',
    };
    await LocalDatabase.enqueueSync(data);
  }

  Future<List<Map<String, dynamic>>> getPendingSyncItems() async {
    return LocalDatabase.getPendingSync();
  }

  Future<void> markAsSynced(int id) async {
    await LocalDatabase.markSynced(id);
  }

  Future<void> updateRetryInfo(int id, int retryCount, String lastAttempt) async {
    final db = await LocalDatabase.database;
    await db.update(
      'sync_queue',
      {
        'retry_count': retryCount,
        'last_attempt': lastAttempt,
        'sync_status': 'FAILED_RETRYING',
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> updateStatus(int id, String status) async {
    final db = await LocalDatabase.database;
    await db.update(
      'sync_queue',
      {
        'sync_status': status,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
