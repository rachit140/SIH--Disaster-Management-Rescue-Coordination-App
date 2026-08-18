import '../models/models.dart';
import '../services/local_database.dart';

class DeviceRepository {
  Future<void> saveDevice(DeviceIdentity device) async {
    final data = device.toJson();
    // Shorthand since DeviceIdentity.toJson returns properties including availability (1/0)
    final dbData = {
      'device_id': device.deviceId,
      'device_name': device.deviceName,
      'device_role': deviceRoleToString(device.deviceRole),
      'protocol_version': device.protocolVersion,
      'availability': device.availability ? 1 : 0,
      'last_seen': device.lastSeen.toIso8601String(),
    };
    await LocalDatabase.saveDevice(dbData);
  }

  Future<DeviceIdentity?> getDeviceById(String deviceId) async {
    final db = await LocalDatabase.database;
    final results = await db.query(
      'devices',
      where: 'device_id = ?',
      whereArgs: [deviceId],
      limit: 1,
    );

    if (results.isEmpty) return null;
    final row = results.first;
    return DeviceIdentity(
      deviceId: row['device_id'] as String,
      deviceName: row['device_name'] as String? ?? 'Device',
      deviceRole: deviceRoleFromString(row['device_role'] as String? ?? 'SURVIVOR'),
      protocolVersion: row['protocol_version'] as String? ?? 'v1.0',
      availability: (row['availability'] as int? ?? 1) == 1,
      lastSeen: DateTime.parse(row['last_seen'] as String),
    );
  }

  Future<List<DeviceIdentity>> getActiveDevices() async {
    final list = await LocalDatabase.getDevices();
    return list.map((row) {
      return DeviceIdentity(
        deviceId: row['device_id'] as String,
        deviceName: row['device_name'] as String? ?? 'Device',
        deviceRole: deviceRoleFromString(row['device_role'] as String? ?? 'SURVIVOR'),
        protocolVersion: row['protocol_version'] as String? ?? 'v1.0',
        availability: (row['availability'] as int? ?? 1) == 1,
        lastSeen: DateTime.parse(row['last_seen'] as String),
      );
    }).toList();
  }

  Future<void> updateAvailability(String deviceId, bool availability) async {
    final db = await LocalDatabase.database;
    await db.update(
      'devices',
      {
        'availability': availability ? 1 : 0,
        'last_seen': DateTime.now().toIso8601String(),
      },
      where: 'device_id = ?',
      whereArgs: [deviceId],
    );
  }
}
