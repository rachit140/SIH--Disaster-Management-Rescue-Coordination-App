import 'package:flutter_test/flutter_test.dart';
import 'package:sih1440_mobile/models/models.dart';

void main() {
  group('MessagePriority Tests', () {
    test('messagePriorityFromString handles case variations', () {
      expect(messagePriorityFromString('CRITICAL'), MessagePriority.critical);
      expect(messagePriorityFromString('critical'), MessagePriority.critical);
      expect(messagePriorityFromString('HIGH'), MessagePriority.high);
      expect(messagePriorityFromString('normal'), MessagePriority.normal);
      expect(messagePriorityFromString('invalid_priority'), MessagePriority.normal);
    });

    test('messagePriorityToString converts to uppercase name', () {
      expect(messagePriorityToString(MessagePriority.critical), 'CRITICAL');
      expect(messagePriorityToString(MessagePriority.high), 'HIGH');
      expect(messagePriorityToString(MessagePriority.normal), 'NORMAL');
    });
  });

  group('MeshMessage Tests', () {
    final testPayload = {'message': 'Help!', 'status': 'PENDING'};
    final testTimestamp = DateTime.parse('2026-08-16T12:00:00Z');

    test('toJson and fromJson serialization/deserialization', () {
      final message = MeshMessage(
        messageId: 'MSG-12345',
        type: 'SOS',
        sourceDevice: 'DEV-A',
        sourceUser: 'USR-B',
        timestamp: testTimestamp,
        priority: MessagePriority.critical,
        ttl: 8,
        hopCount: 2,
        latitude: 26.4499,
        longitude: 80.3319,
        payload: testPayload,
      );

      final json = message.toJson();
      expect(json['message_id'], 'MSG-12345');
      expect(json['type'], 'SOS');
      expect(json['source_device'], 'DEV-A');
      expect(json['source_user'], 'USR-B');
      expect(json['timestamp'], '2026-08-16T12:00:00.000Z');
      expect(json['priority'], 'CRITICAL');
      expect(json['ttl'], 8);
      expect(json['hop_count'], 2);
      expect(json['latitude'], 26.4499);
      expect(json['longitude'], 80.3319);
      expect(json['payload'], testPayload);

      final deserialized = MeshMessage.fromJson(json);
      expect(deserialized.messageId, 'MSG-12345');
      expect(deserialized.type, 'SOS');
      expect(deserialized.sourceDevice, 'DEV-A');
      expect(deserialized.sourceUser, 'USR-B');
      expect(deserialized.timestamp, testTimestamp);
      expect(deserialized.priority, MessagePriority.critical);
      expect(deserialized.ttl, 8);
      expect(deserialized.hopCount, 2);
      expect(deserialized.latitude, 26.4499);
      expect(deserialized.longitude, 80.3319);
      expect(deserialized.payload, testPayload);
    });

    test('isValid returns true for valid message parameters', () {
      final validMsg = MeshMessage(
        messageId: 'MSG-1',
        type: 'SOS',
        sourceDevice: 'D-1',
        sourceUser: 'U-1',
        timestamp: testTimestamp,
        priority: MessagePriority.normal,
        ttl: 4,
        hopCount: 0,
        latitude: 26.0,
        longitude: 80.0,
        payload: {},
      );

      expect(validMsg.isValid(), isTrue);
    });

    test('isValid returns false for invalid message parameters', () {
      // Empty fields
      expect(
        MeshMessage(
          messageId: '',
          type: 'SOS',
          sourceDevice: 'D-1',
          sourceUser: 'U-1',
          timestamp: testTimestamp,
          priority: MessagePriority.normal,
          ttl: 4,
          hopCount: 0,
          payload: {},
        ).isValid(),
        isFalse,
      );

      // Invalid TTL
      expect(
        MeshMessage(
          messageId: 'MSG-1',
          type: 'SOS',
          sourceDevice: 'D-1',
          sourceUser: 'U-1',
          timestamp: testTimestamp,
          priority: MessagePriority.normal,
          ttl: 0,
          hopCount: 0,
          payload: {},
        ).isValid(),
        isFalse,
      );

      // Invalid hopCount
      expect(
        MeshMessage(
          messageId: 'MSG-1',
          type: 'SOS',
          sourceDevice: 'D-1',
          sourceUser: 'U-1',
          timestamp: testTimestamp,
          priority: MessagePriority.normal,
          ttl: 4,
          hopCount: -1,
          payload: {},
        ).isValid(),
        isFalse,
      );

      // Invalid Latitude
      expect(
        MeshMessage(
          messageId: 'MSG-1',
          type: 'SOS',
          sourceDevice: 'D-1',
          sourceUser: 'U-1',
          timestamp: testTimestamp,
          priority: MessagePriority.normal,
          ttl: 4,
          hopCount: 0,
          latitude: 95.0,
          payload: {},
        ).isValid(),
        isFalse,
      );

      // Invalid Longitude
      expect(
        MeshMessage(
          messageId: 'MSG-1',
          type: 'SOS',
          sourceDevice: 'D-1',
          sourceUser: 'U-1',
          timestamp: testTimestamp,
          priority: MessagePriority.normal,
          ttl: 4,
          hopCount: 0,
          longitude: -190.0,
          payload: {},
        ).isValid(),
        isFalse,
      );
    });

    test('isValidForForwarding checks hops and validity', () {
      final msgWithHops = MeshMessage(
        messageId: 'MSG-1',
        type: 'SOS',
        sourceDevice: 'D-1',
        sourceUser: 'U-1',
        timestamp: testTimestamp,
        priority: MessagePriority.normal,
        ttl: 4,
        hopCount: 3,
        payload: {},
      );

      expect(msgWithHops.isValidForForwarding(), isTrue);

      final msgTooManyHops = MeshMessage(
        messageId: 'MSG-1',
        type: 'SOS',
        sourceDevice: 'D-1',
        sourceUser: 'U-1',
        timestamp: testTimestamp,
        priority: MessagePriority.normal,
        ttl: 4,
        hopCount: 4,
        payload: {},
      );

      expect(msgTooManyHops.isValidForForwarding(), isFalse);
    });

    test('incrementHop increments hopCount by 1 and preserves other fields', () {
      final original = MeshMessage(
        messageId: 'MSG-1',
        type: 'SOS',
        sourceDevice: 'D-1',
        sourceUser: 'U-1',
        timestamp: testTimestamp,
        priority: MessagePriority.normal,
        ttl: 4,
        hopCount: 1,
        latitude: 26.0,
        longitude: 80.0,
        payload: testPayload,
      );

      final incremented = original.incrementHop();
      expect(incremented.hopCount, 2);
      expect(incremented.messageId, original.messageId);
      expect(incremented.type, original.type);
      expect(incremented.sourceDevice, original.sourceDevice);
      expect(incremented.sourceUser, original.sourceUser);
      expect(incremented.timestamp, original.timestamp);
      expect(incremented.priority, original.priority);
      expect(incremented.ttl, original.ttl);
      expect(incremented.latitude, original.latitude);
      expect(incremented.longitude, original.longitude);
      expect(incremented.payload, original.payload);
    });
  });

  group('DeviceIdentity Tests', () {
    test('toJson and fromJson serialization/deserialization', () {
      final timestamp = DateTime.parse('2026-08-16T12:00:00Z');
      final device = DeviceIdentity(
        deviceId: 'DEV-987',
        deviceName: 'Pixel 6 Pro',
        lastSeen: timestamp,
      );

      final json = device.toJson();
      expect(json['device_id'], 'DEV-987');
      expect(json['device_name'], 'Pixel 6 Pro');
      expect(json['last_seen'], '2026-08-16T12:00:00.000Z');

      final deserialized = DeviceIdentity.fromJson(json);
      expect(deserialized.deviceId, 'DEV-987');
      expect(deserialized.deviceName, 'Pixel 6 Pro');
      expect(deserialized.lastSeen, timestamp);
    });
  });
}
