import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sos_provider.dart';

class VolunteerScreen extends StatefulWidget {
  const VolunteerScreen({super.key});

  @override
  State<VolunteerScreen> createState() => _VolunteerScreenState();
}

class _VolunteerScreenState extends State<VolunteerScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SosProvider>().loadNearbySos();
      context.read<SosProvider>().mesh.startScanning();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final sos = context.watch<SosProvider>();
    final mesh = sos.mesh;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text('Volunteer Dashboard'),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF123B78)), 
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => sos.loadNearbySos(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Mesh Network Card
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: mesh.isScanning 
                        ? const Color(0xFFE6F6EF) 
                        : const Color(0xFFFDECEC),
                    child: Icon(
                      mesh.isScanning ? Icons.wifi_tethering : Icons.portable_wifi_off,
                      color: mesh.isScanning ? const Color(0xFF16A66A) : const Color(0xFFEF3340),
                    ),
                  ),
                  title: const Text(
                    'Mesh Network Status',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF123B78)),
                  ),
                  subtitle: Text(
                    'Device: ${mesh.deviceIdValue.length > 10 ? mesh.deviceIdValue.substring(0, 10) : mesh.deviceIdValue}...\nNearby Devices: ${mesh.nearbyDevices.length} | Queue: ${mesh.forwardQueue.length}',
                    style: const TextStyle(height: 1.4),
                  ),
                  trailing: Switch(
                    value: mesh.isScanning,
                    activeColor: const Color(0xFF16A66A),
                    onChanged: (_) => mesh.isScanning ? mesh.stopScanning() : mesh.startScanning(),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            Row(
              children: [
                const Icon(Icons.crisis_alert, size: 20, color: Color(0xFFEF3340)),
                const SizedBox(width: 8),
                Text(
                  'Nearby SOS Alerts (${sos.nearbySos.length})', 
                  style: const TextStyle(
                    fontSize: 18, 
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF123B78),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            ...sos.nearbySos.map((alert) {
              final isCritical = alert.priority == 'CRITICAL' || alert.priority == 'High';
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: isCritical ? const Color(0xFFFDECEC) : const Color(0xFFFFF3E3),
                      child: Icon(
                        Icons.warning_amber_rounded, 
                        color: isCritical ? const Color(0xFFEF3340) : const Color(0xFFFF8A00),
                      ),
                    ),
                    title: Text(
                      '${alert.priority} — ${alert.messageId.substring(0, 8)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF123B78)),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        '${alert.message ?? "Emergency assistance needed"}\nCoords: ${alert.latitude.toStringAsFixed(4)}, ${alert.longitude.toStringAsFixed(4)}',
                        style: const TextStyle(height: 1.3),
                      ),
                    ),
                    trailing: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1463E8),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                      ),
                      onPressed: () {}, 
                      child: const Text('Accept', style: TextStyle(fontSize: 13)),
                    ),
                  ),
                ),
              );
            }),
            
            if (sos.nearbySos.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48.0),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.check_circle_outline, size: 48, color: const Color(0xFF16A66A).withOpacity(0.5)),
                      const SizedBox(height: 12),
                      const Text(
                        'No active SOS alerts in your vicinity',
                        style: TextStyle(color: Color(0xFF667085), fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
