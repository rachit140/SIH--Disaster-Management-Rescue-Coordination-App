enum MessagePriority { critical, high, normal }

MessagePriority messagePriorityFromString(String value) {
  switch (value.toLowerCase()) {
    case 'critical':
      return MessagePriority.critical;
    case 'high':
      return MessagePriority.high;
    case 'normal':
    default:
      return MessagePriority.normal;
  }
}

String messagePriorityToString(MessagePriority priority) {
  return priority.name.toUpperCase();
}

enum DeviceRole { survivor, volunteer, rescuer, gateway }

DeviceRole deviceRoleFromString(String value) {
  switch (value.toUpperCase()) {
    case 'SURVIVOR':
      return DeviceRole.survivor;
    case 'VOLUNTEER':
      return DeviceRole.volunteer;
    case 'RESCUER':
      return DeviceRole.rescuer;
    case 'GATEWAY':
    default:
      return DeviceRole.gateway;
  }
}

String deviceRoleToString(DeviceRole role) {
  return role.name.toUpperCase();
}

class UserModel {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String role;

  UserModel({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      role: json['role'] as String,
    );
  }
}

class SosModel {
  final String id;
  final String messageId;
  final String userId;
  final double latitude;
  final double longitude;
  final String priority;
  final String status;
  final String? message;
  final DateTime createdAt;

  SosModel({
    required this.id,
    required this.messageId,
    required this.userId,
    required this.latitude,
    required this.longitude,
    required this.priority,
    required this.status,
    this.message,
    required this.createdAt,
  });

  factory SosModel.fromJson(Map<String, dynamic> json) {
    return SosModel(
      id: json['id'] as String,
      messageId: json['messageId'] as String,
      userId: json['userId'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      priority: json['priority'] as String,
      status: json['status'] as String,
      message: json['message'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'messageId': messageId,
        'userId': userId,
        'latitude': latitude,
        'longitude': longitude,
        'priority': priority,
        'status': status,
        'message': message,
        'createdAt': createdAt.toIso8601String(),
      };
}

class MeshMessage {
  final String messageId;
  final String type; // e.g. SOS, INCIDENT, MESSAGE, STATUS_UPDATE, SYNC, ACK
  final String sourceDevice;
  final String sourceUser;
  final DateTime timestamp;
  final MessagePriority priority;
  final int ttl;
  final int hopCount;
  final double? latitude;
  final double? longitude;
  final Map<String, dynamic> payload;

  MeshMessage({
    required this.messageId,
    required this.type,
    required this.sourceDevice,
    required this.sourceUser,
    required this.timestamp,
    required this.priority,
    required this.ttl,
    this.hopCount = 0,
    this.latitude,
    this.longitude,
    required this.payload,
  });

  Map<String, dynamic> toJson() => {
        'message_id': messageId,
        'type': type.toUpperCase(),
        'source_device': sourceDevice,
        'source_user': sourceUser,
        'timestamp': timestamp.toIso8601String(),
        'priority': messagePriorityToString(priority),
        'ttl': ttl,
        'hop_count': hopCount,
        'latitude': latitude,
        'longitude': longitude,
        'payload': payload,
      };

  factory MeshMessage.fromJson(Map<String, dynamic> json) {
    return MeshMessage(
      messageId: json['message_id'] as String,
      type: json['type'] as String,
      sourceDevice: json['source_device'] as String,
      sourceUser: json['source_user'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      priority: messagePriorityFromString(json['priority'] as String),
      ttl: json['ttl'] as int,
      hopCount: json['hop_count'] as int? ?? 0,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      payload: Map<String, dynamic>.from(json['payload'] as Map),
    );
  }

  bool isValid() {
    if (messageId.isEmpty || type.isEmpty || sourceDevice.isEmpty || sourceUser.isEmpty) {
      return false;
    }
    if (ttl <= 0 || hopCount < 0) {
      return false;
    }
    if (latitude != null && (latitude! < -90.0 || latitude! > 90.0)) {
      return false;
    }
    if (longitude != null && (longitude! < -180.0 || longitude! > 180.0)) {
      return false;
    }
    return true;
  }

  bool isValidForForwarding() {
    return isValid() && (hopCount < ttl);
  }

  MeshMessage incrementHop() {
    return MeshMessage(
      messageId: messageId,
      type: type,
      sourceDevice: sourceDevice,
      sourceUser: sourceUser,
      timestamp: timestamp,
      priority: priority,
      ttl: ttl,
      hopCount: hopCount + 1,
      latitude: latitude,
      longitude: longitude,
      payload: payload,
    );
  }
}

// Deprecated: Kept for backwards compatibility with legacy code
class OfflineMessage {
  final String messageId;
  final String type;
  final String sourceDevice;
  final String sourceUser;
  final String timestamp;
  final String priority;
  final int ttl;
  final int hopCount;
  final double latitude;
  final double longitude;
  final Map<String, dynamic> payload;

  OfflineMessage({
    required this.messageId,
    required this.type,
    required this.sourceDevice,
    required this.sourceUser,
    required this.timestamp,
    required this.priority,
    required this.ttl,
    required this.hopCount,
    required this.latitude,
    required this.longitude,
    required this.payload,
  });

  Map<String, dynamic> toJson() => {
        'message_id': messageId,
        'type': type,
        'source_device': sourceDevice,
        'source_user': sourceUser,
        'timestamp': timestamp,
        'priority': priority,
        'ttl': ttl,
        'hop_count': hopCount,
        'latitude': latitude,
        'longitude': longitude,
        'payload': payload,
      };

  factory OfflineMessage.fromJson(Map<String, dynamic> json) {
    return OfflineMessage(
      messageId: json['message_id'] as String,
      type: json['type'] as String,
      sourceDevice: json['source_device'] as String,
      sourceUser: json['source_user'] as String,
      timestamp: json['timestamp'] as String,
      priority: json['priority'] as String,
      ttl: json['ttl'] as int,
      hopCount: json['hop_count'] as int,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      payload: Map<String, dynamic>.from(json['payload'] as Map),
    );
  }
}

class DeviceIdentity {
  final String deviceId;
  final DeviceRole deviceRole;
  final String protocolVersion;
  final bool availability;
  final DateTime lastSeen;

  DeviceIdentity({
    required this.deviceId,
    required this.deviceRole,
    required this.protocolVersion,
    required this.availability,
    required this.lastSeen,
  });

  Map<String, dynamic> toJson() => {
        'device_id': deviceId,
        'device_role': deviceRoleToString(deviceRole),
        'protocol_version': protocolVersion,
        'availability': availability ? 1 : 0,
        'last_seen': lastSeen.toIso8601String(),
      };

  factory DeviceIdentity.fromJson(Map<String, dynamic> json) {
    return DeviceIdentity(
      deviceId: json['device_id'] as String,
      deviceRole: deviceRoleFromString(json['device_role'] as String),
      protocolVersion: json['protocol_version'] as String? ?? 'v1.0',
      availability: (json['availability'] == 1 || json['availability'] == true),
      lastSeen: DateTime.parse(json['last_seen'] as String),
    );
  }
}
