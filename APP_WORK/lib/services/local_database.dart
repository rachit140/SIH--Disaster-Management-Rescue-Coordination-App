import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class LocalDatabase {
  static Database? _db;

  static Future<Database> get database async {
    _db ??= await _init();
    return _db!;
  }

  static Future<Database> _init() async {
    final dbPath = await getDatabasesPath();
    return openDatabase(
      join(dbPath, 'sih1440.db'),
      version: 2, // Upgraded database version
      onUpgrade: (db, oldVersion, newVersion) async {
        // Drop old tables to recreate upgraded schema cleanly in development
        await db.execute('DROP TABLE IF EXISTS sos_alerts');
        await db.execute('DROP TABLE IF EXISTS messages');
        await db.execute('DROP TABLE IF EXISTS devices');
        await db.execute('DROP TABLE IF EXISTS offline_events');
        await db.execute('DROP TABLE IF EXISTS sync_queue');
        await db.execute('DROP TABLE IF EXISTS seen_messages');
        await _createTables(db);
      },
      onCreate: (db, version) async {
        await _createTables(db);
      },
    );
  }

  static Future<void> _createTables(Database db) async {
    await db.execute('''
      CREATE TABLE sos_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        message TEXT,
        created_at TEXT NOT NULL
      )
    ''');
    await db.execute('''
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        source_device TEXT,
        source_user TEXT,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        priority TEXT,
        ttl INTEGER NOT NULL,
        hop_count INTEGER NOT NULL DEFAULT 0,
        latitude REAL,
        longitude REAL,
        delivery_status TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');
    await db.execute('''
      CREATE TABLE devices (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        device_role TEXT NOT NULL,
        protocol_version TEXT NOT NULL,
        availability INTEGER NOT NULL DEFAULT 1,
        last_seen TEXT NOT NULL
      )
    ''');
    await db.execute('''
      CREATE TABLE offline_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    ''');
    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        sync_status TEXT NOT NULL DEFAULT 'PENDING',
        last_attempt TEXT
      )
    ''');
    await db.execute('''
      CREATE TABLE seen_messages (
        message_id TEXT PRIMARY KEY,
        seen_at TEXT NOT NULL
      )
    ''');
  }

  // Raw Database Operations (delegated to repositories)
  
  static Future<void> saveSosAlert(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('sos_alerts', data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<Map<String, dynamic>>> getSosAlerts() async {
    final db = await database;
    return db.query('sos_alerts', orderBy: 'created_at DESC');
  }

  static Future<void> enqueueSync(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('sync_queue', data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<Map<String, dynamic>>> getPendingSync() async {
    final db = await database;
    return db.query('sync_queue', where: 'sync_status = ?', whereArgs: ['PENDING']);
  }

  static Future<void> markSynced(int id) async {
    final db = await database;
    await db.update('sync_queue', {'sync_status': 'SYNCED'}, where: 'id = ?', whereArgs: [id]);
  }

  static Future<bool> hasSeenMessage(String messageId) async {
    final db = await database;
    final result = await db.query('seen_messages', where: 'message_id = ?', whereArgs: [messageId]);
    return result.isNotEmpty;
  }

  static Future<void> markSeen(String messageId) async {
    final db = await database;
    await db.insert('seen_messages', {
      'message_id': messageId,
      'seen_at': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.ignore);
  }

  static Future<void> saveMessage(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('messages', data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<Map<String, dynamic>>> getMessages() async {
    final db = await database;
    return db.query('messages');
  }

  static Future<void> saveDevice(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('devices', data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<Map<String, dynamic>>> getDevices() async {
    final db = await database;
    return db.query('devices', orderBy: 'last_seen DESC');
  }

  static Future<void> saveOfflineEvent(Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('offline_events', data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<Map<String, dynamic>>> getOfflineEvents() async {
    final db = await database;
    return db.query('offline_events');
  }
}
