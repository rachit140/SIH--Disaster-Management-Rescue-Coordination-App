import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  UserModel? _user;
  bool _isLoading = true;
  String? _error;

  UserModel? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    try {
      await _api.loadToken();
      _user = await _api.getMe();
    } catch (_) {
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login({required String password, String? email, String? phone}) async {
    _error = null;
    try {
      final result = await _api.login(password: password, email: email, phone: phone);
      await _api.saveToken(result['accessToken'] as String);
      _user = UserModel.fromJson(result['user'] as Map<String, dynamic>);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'SURVIVOR',
  }) async {
    _error = null;
    try {
      final result = await _api.register(
        name: name,
        password: password,
        email: email,
        phone: phone,
        role: role,
      );
      await _api.saveToken(result['accessToken'] as String);
      _user = UserModel.fromJson(result['user'] as Map<String, dynamic>);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    _user = null;
    notifyListeners();
  }
}
