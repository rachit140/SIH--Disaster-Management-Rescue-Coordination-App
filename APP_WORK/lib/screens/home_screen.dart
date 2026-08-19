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
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        title: const Text('SahaySetu Rescue'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF123B78)), 
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 16),
            Text(
              'Welcome, ${auth.user?.name ?? "Survivor"}! 👋', 
              style: const TextStyle(
                color: Color(0xFF123B78),
                fontSize: 24,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFE6F6EF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF16A66A)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.check_circle_outline, size: 14, color: Color(0xFF16A66A)),
                  SizedBox(width: 6),
                  Text(
                    'STATUS: SECURE & SAFE', 
                    style: TextStyle(
                      color: Color(0xFF16A66A), 
                      fontSize: 11, 
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
            const Spacer(),
            if (sos.activeSos != null)
              Card(
                color: const Color(0xFFFDECEC),
                margin: const EdgeInsets.only(bottom: 24),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: Color(0xFFEF3340)),
                ),
                child: ListTile(
                  leading: const Icon(Icons.crisis_alert, color: Color(0xFFEF3340)),
                  title: Text(
                    'Active SOS: ${sos.activeSos!.messageId.substring(0, 8)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFEF3340)),
                  ),
                  subtitle: Text('Status: ${sos.activeSos!.status.toUpperCase()}'),
                ),
              ),
            GestureDetector(
              onTap: sos.sending
                  ? null
                  : () => _confirmSos(context),
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEF3340), Color(0xFFFF2D55)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFEF3340).withOpacity(0.4), 
                      blurRadius: 30, 
                      spreadRadius: 8,
                    ),
                    BoxShadow(
                      color: const Color(0xFFEF3340).withOpacity(0.2), 
                      blurRadius: 15, 
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: sos.sending
                    ? const Center(child: CircularProgressIndicator(color: Colors.white))
                    : const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.emergency, size: 56, color: Colors.white),
                          SizedBox(height: 8),
                          Text(
                            'SEND SOS', 
                            style: TextStyle(
                              color: Colors.white, 
                              fontSize: 22, 
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.0,
                            ),
                          ),
                          Text(
                            'TAP IN EMERGENCY',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            const Spacer(),
            TextField(
              controller: _messageController,
              decoration: const InputDecoration(
                labelText: 'Emergency details (optional)',
                prefixIcon: Icon(Icons.edit_note, color: Color(0xFF667085)),
              ),
              maxLines: 2,
            ),
            if (sos.error != null) ...[
              const SizedBox(height: 12),
              Text(
                sos.error!, 
                style: const TextStyle(color: Color(0xFFEF3340), fontWeight: FontWeight.bold),
              ),
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
