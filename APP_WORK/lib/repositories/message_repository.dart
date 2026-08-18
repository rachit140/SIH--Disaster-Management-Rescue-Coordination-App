import 'dart:convert';
import 'package:uuid/uuid.dart';
import '../models/models.dart';
import '../services/local_database.dart';

class MessageRepository {
  final Uuid _uuid = const Uuid();

  String generateUniqueMessageId() {
    return 'MSG-${_uuid.v4()}';
  }

  Future<bool> saveMessage(MeshMessage message, {String deliveryStatus = 'PENDING'}) async {
    if (!message.isValid()) return false;

    final now = DateTime.now().toIso8601String();
    final data = {
      'message_id': message.messageId,
      'type': message.type,
      'source_device': message.sourceDevice,
      'source_user': message.sourceUser,
      'payload': jsonEncode(message.payload),
      'timestamp': message.timestamp.toIso8601String(),
      'priority': messagePriorityToString(message.priority),
      'ttl': message.ttl,
      'hop_count': message.hopCount,
      'latitude': message.latitude,
      'longitude': message.longitude,
      'delivery_status': deliveryStatus,
      'created_at': now,
      'updated_at': now,
    };

    await LocalDatabase.saveMessage(data);
    return true;
  }

  Future<MeshMessage?> getMessageById(String messageId) async {
    final db = await LocalDatabase.database;
    final results = await db.query(
      'messages',
      where: 'message_id = ?',
      whereArgs: [messageId],
      limit: 1,
    );

    if (results.isEmpty) return null;
    final row = results.first;
    return _parseRow(row);
  }

  Future<List<MeshMessage>> getAllMessages() async {
    final list = await LocalDatabase.getMessages();
    return list.map((row) => _parseRow(row)).toList();
  }

  Future<bool> hasBeenSeen(String messageId) async {
    return LocalDatabase.hasSeenMessage(messageId);
  }

  Future<void> markAsSeen(String messageId) async {
    await LocalDatabase.markSeen(messageId);
  }

  Future<void> updateDeliveryStatus(String messageId, String status) async {
    final db = await LocalDatabase.database;
    await db.update(
      'messages',
      {
        'delivery_status': status,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'message_id = ?',
      whereArgs: [messageId],
    );
  }

  MeshMessage _parseRow(Map<String, dynamic> row) {
    return MeshMessage(
      messageId: row['message_id'] as String,
      type: row['type'] as String,
      sourceDevice: row['source_device'] as String? ?? '',
      sourceUser: row['source_user'] as String? ?? '',
      timestamp: DateTime.parse(row['timestamp'] as String),
      priority: messagePriorityFromString(row['priority'] as String? ?? 'NORMAL'),
      ttl: row['ttl'] as int,
      hopCount: row['hop_count'] as int,
      latitude: row['latitude'] as double?,
      longitude: row['longitude'] as double?,
      payload: jsonDecode(row['payload'] as String) as Map<String, dynamic>,
    );
  }
}
