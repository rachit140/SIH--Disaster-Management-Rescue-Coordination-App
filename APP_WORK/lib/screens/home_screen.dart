import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sos_provider.dart';
import 'volunteer_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final role = context.watch<AuthProvider>().user?.role ?? 'SURVIVOR';
    if (role == 'VOLUNTEER') return const VolunteerScreen();
    return const SurvivorHome();
  }
}

class SurvivorHome extends StatefulWidget {
  const SurvivorHome({super.key});

  @override
  State<SurvivorHome> createState() => _SurvivorHomeState();
}

class _SurvivorHomeState extends State<SurvivorHome> {
  final _messageController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final sos = context.watch<SosProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('SIH1440 Rescue'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: () => auth.logout()),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text('Welcome, ${auth.user?.name ?? ""}', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            const Chip(label: Text('Status: SAFE')),
            const Spacer(),
            if (sos.activeSos != null)
              Card(
                color: Colors.red.shade50,
                child: ListTile(
                  title: Text('SOS Active: ${sos.activeSos!.messageId}'),
                  subtitle: Text('Status: ${sos.activeSos!.status}'),
                ),
              ),
            GestureDetector(
              onTap: sos.sending
                  ? null
                  : () => _confirmSos(context),
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: Colors.red.withValues(alpha: 0.4), blurRadius: 20, spreadRadius: 5)],
                ),
                child: sos.sending
                    ? const Center(child: CircularProgressIndicator(color: Colors.white))
                    : const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.emergency, size: 48, color: Colors.white),
                          SizedBox(height: 8),
                          Text('SEND SOS', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                        ],
                      ),
              ),
            ),
            const Spacer(),
            TextField(
              controller: _messageController,
              decoration: const InputDecoration(
                labelText: 'Emergency message (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            if (sos.error != null) ...[
              const SizedBox(height: 8),
              Text(sos.error!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _confirmSos(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm SOS'),
        content: const Text('Send emergency SOS alert with your current location?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('SEND SOS'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<SosProvider>().sendSos(message: _messageController.text.isEmpty ? null : _messageController.text);
    }
  }
}
