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
      appBar: AppBar(
        title: const Text('Volunteer Dashboard'),
        actions: [IconButton(icon: const Icon(Icons.logout), onPressed: () => auth.logout())],
      ),
      body: RefreshIndicator(
        onRefresh: () => sos.loadNearbySos(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: ListTile(
                title: const Text('Mesh Network'),
                subtitle: Text('Device: ${mesh.deviceIdValue}\nNearby: ${mesh.nearbyDevices.length} | Queue: ${mesh.forwardQueue.length}'),
                trailing: Switch(
                  value: mesh.isScanning,
                  onChanged: (_) => mesh.isScanning ? mesh.stopScanning() : mesh.startScanning(),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Nearby SOS Alerts (${sos.nearbySos.length})', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            ...sos.nearbySos.map((alert) => Card(
                  child: ListTile(
                    leading: Icon(Icons.warning, color: alert.priority == 'CRITICAL' ? Colors.red : Colors.orange),
                    title: Text('${alert.priority} — ${alert.messageId}'),
                    subtitle: Text('${alert.message ?? "No message"}\n${alert.latitude.toStringAsFixed(4)}, ${alert.longitude.toStringAsFixed(4)}'),
                    trailing: ElevatedButton(onPressed: () {}, child: const Text('Accept')),
                  ),
                )),
            if (sos.nearbySos.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: Text('No SOS alerts nearby')),
              ),
          ],
        ),
      ),
    );
  }
}
