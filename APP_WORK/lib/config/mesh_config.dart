class MeshConfig {
  static const String protocolVersion = 'v1.0';

  // BLE Service and Characteristic UUIDs
  static const String serviceUuid = '0000sih1-0000-1000-8000-00805f9b34fb';
  static const String charHandshakeUuid = '0000sih2-0000-1000-8000-00805f9b34fb';
  static const String charMessageUuid = '0000sih3-0000-1000-8000-00805f9b34fb';
  static const String charMessageRequestUuid = '0000sih4-0000-1000-8000-00805f9b34fb';
  static const String charAckUuid = '0000sih5-0000-1000-8000-00805f9b34fb';

  // Wi-Fi Local TCP configuration
  static const int wifiPort = 8888;
}
