import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sih1440_mobile/services/device_id_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    // Initialize mock values before each test
    SharedPreferences.setMockInitialValues({});
  });

  group('DeviceIdService Tests', () {
    test('getDeviceId generates a new UUID and persists it on first call', () async {
      final id1 = await DeviceIdService.getDeviceId();
      expect(id1, isNotEmpty);
      expect(id1.length, 36); // standard UUID v4 length

      final id2 = await DeviceIdService.getDeviceId();
      expect(id2, equals(id1)); // Must remain stable
    });

    test('getDeviceName generates a stable default name using device ID', () async {
      final name = await DeviceIdService.getDeviceName();
      final id = await DeviceIdService.getDeviceId();
      final shortId = id.substring(0, 8);

      expect(name, equals('MeshDevice-$shortId'));

      final name2 = await DeviceIdService.getDeviceName();
      expect(name2, equals(name)); // Must remain stable
    });

    test('setDeviceName overrides the default device name', () async {
      final defaultName = await DeviceIdService.getDeviceName();
      expect(defaultName, startsWith('MeshDevice-'));

      await DeviceIdService.setDeviceName('CustomName123');
      final newName = await DeviceIdService.getDeviceName();

      expect(newName, equals('CustomName123'));
    });
  });
}
