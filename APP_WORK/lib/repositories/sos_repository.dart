import '../models/models.dart';
import '../services/local_database.dart';

class SOSRepository {
  Future<void> saveSosAlert(SosModel sosAlert) async {
    final data = sosAlert.toJson();
    await LocalDatabase.saveSosAlert(data);
  }

  Future<SosModel?> getSosAlertByMessageId(String messageId) async {
    final db = await LocalDatabase.database;
    final results = await db.query(
      'sos_alerts',
      where: 'message_id = ?',
      whereArgs: [messageId],
      limit: 1,
    );

    if (results.isEmpty) return null;
    return SosModel.fromJson(results.first);
  }

  Future<List<SosModel>> getAllSosAlerts() async {
    final list = await LocalDatabase.getSosAlerts();
    return list.map((e) => SosModel.fromJson(e)).toList();
  }

  Future<void> updateStatus(String messageId, String status) async {
    final db = await LocalDatabase.database;
    await db.update(
      'sos_alerts',
      {
        'status': status,
      },
      where: 'message_id = ?',
      whereArgs: [messageId],
    );
  }
}
