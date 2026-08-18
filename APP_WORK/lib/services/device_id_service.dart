import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class DeviceIdService {
  static const String _keyDeviceId = 'mesh_device_id';
  static const String _keyDeviceName = 'mesh_device_name';
  static final Uuid _uuid = const Uuid();

  static Future<String> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceId = prefs.getString(_keyDeviceId);
    if (deviceId == null || deviceId.isEmpty) {
      deviceId = _uuid.v4();
      await prefs.setString(_keyDeviceId, deviceId);
    }
    return deviceId;
  }

  static Future<String> getDeviceName() async {
    final prefs = await SharedPreferences.getInstance();
    String? deviceName = prefs.getString(_keyDeviceName);
    if (deviceName == null || deviceName.isEmpty) {
      final deviceId = await getDeviceId();
      final shortId = deviceId.substring(0, 8);
      deviceName = 'MeshDevice-$shortId';
      await prefs.setString(_keyDeviceName, deviceName);
    }
    return deviceName;
  }

  static Future<void> setDeviceName(String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyDeviceName, name);
  }
}
