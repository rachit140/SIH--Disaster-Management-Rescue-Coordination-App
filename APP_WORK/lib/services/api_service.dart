import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';

class ApiService {
  static const baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3001/api',
  );

  String? _token;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('access_token');
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<Map<String, dynamic>> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'SURVIVOR',
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'name': name,
        'password': password,
        if (email != null) 'email': email,
        if (phone != null) 'phone': phone,
        'role': role,
      }),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['message']);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> login({
    required String password,
    String? email,
    String? phone,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers,
      body: jsonEncode({
        'password': password,
        if (email != null) 'email': email,
        if (phone != null) 'phone': phone,
      }),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['message']);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<UserModel> getMe() async {
    final res = await http.get(Uri.parse('$baseUrl/auth/me'), headers: _headers);
    if (res.statusCode >= 400) throw Exception('Not authenticated');
    return UserModel.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<SosModel> createSos({
    required String messageId,
    required double latitude,
    required double longitude,
    String priority = 'CRITICAL',
    String? message,
    int? batteryStatus,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/sos'),
      headers: _headers,
      body: jsonEncode({
        'messageId': messageId,
        'latitude': latitude,
        'longitude': longitude,
        'priority': priority,
        if (message != null) 'message': message,
        if (batteryStatus != null) 'batteryStatus': batteryStatus,
      }),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['message']);
    return SosModel.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<List<SosModel>> listSos() async {
    final res = await http.get(Uri.parse('$baseUrl/sos'), headers: _headers);
    if (res.statusCode >= 400) throw Exception('Failed to load SOS');
    final list = jsonDecode(res.body) as List;
    return list.map((e) => SosModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> syncEvents(List<Map<String, dynamic>> events) async {
    final res = await http.post(
      Uri.parse('$baseUrl/sync'),
      headers: _headers,
      body: jsonEncode({'events': events}),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['message']);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
