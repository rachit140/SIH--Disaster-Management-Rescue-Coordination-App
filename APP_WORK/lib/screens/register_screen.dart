import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String _role = 'SURVIVOR';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Create Account'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Custom Styled Logo Widget
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEAF1FE),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.grid_goldenratio,
                          size: 36,
                          color: Color(0xFF1463E8),
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'SAHAYSETU',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF123B78),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Join the response network',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF667085),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    prefixIcon: Icon(Icons.person_outline, color: Color(0xFF667085)),
                  ),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 16),
                
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.mail_outline, color: Color(0xFF667085)),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                
                TextField(
                  controller: _passwordController,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock_outline, color: Color(0xFF667085)),
                  ),
                  obscureText: true,
                ),
                const SizedBox(height: 16),
                
                DropdownButtonFormField<String>(
                  value: _role,
                  decoration: const InputDecoration(
                    labelText: 'Role',
                    prefixIcon: Icon(Icons.assignment_ind_outlined, color: Color(0xFF667085)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'SURVIVOR', child: Text('Survivor')),
                    DropdownMenuItem(value: 'VOLUNTEER', child: Text('Volunteer')),
                  ],
                  onChanged: (v) => setState(() => _role = v ?? 'SURVIVOR'),
                ),
                const SizedBox(height: 28),
                
                Consumer<AuthProvider>(
                  builder: (context, auth, _) => SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () async {
                        final ok = await auth.register(
                          name: _nameController.text,
                          email: _emailController.text,
                          password: _passwordController.text,
                          role: _role,
                        );
                        if (ok && context.mounted) Navigator.pop(context);
                      },
                      child: const Text('Register'),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: RichText(
                    text: const TextSpan(
                      text: "Already registered? ",
                      style: TextStyle(color: Color(0xFF667085)),
                      children: [
                        TextSpan(
                          text: 'Sign in',
                          style: TextStyle(color: Color(0xFF1463E8), fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
