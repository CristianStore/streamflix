import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';
import '../models/user_model.dart';

class AuthService {
  final String baseUrl;

  AuthService({this.baseUrl = AppConstants.defaultBaseUrl});

  /// Inicia sesión con usuario y contraseña
  Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200 && data['success'] == true) {
      final token = data['token'] as String;
      final user = UserModel.fromJson(data['user']);
      await _saveSession(token, user);
      return {'user': user, 'token': token};
    } else {
      throw Exception(data['error'] ?? 'Credenciales inválidas');
    }
  }

  /// Registra un nuevo usuario
  Future<Map<String, dynamic>> register(String username, String password, {String? email}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
        if (email != null && email.isNotEmpty) 'email': email,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 201 && data['success'] == true) {
      final token = data['token'] as String;
      final user = UserModel.fromJson(data['user']);
      await _saveSession(token, user);
      return {'user': user, 'token': token};
    } else {
      throw Exception(data['error'] ?? 'Error en el registro');
    }
  }

  /// Guarda token y usuario en almacenamiento local
  Future<void> _saveSession(String token, UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.tokenKey, token);
    await prefs.setString(AppConstants.userKey, jsonEncode(user.toJson()));
  }

  /// Recupera token almacenado
  Future<String?> getSavedToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tokenKey);
  }

  /// Recupera usuario almacenado
  Future<UserModel?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userRaw = prefs.getString(AppConstants.userKey);
    if (userRaw != null) {
      try {
        return UserModel.fromJson(jsonDecode(userRaw));
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  /// Cierra sesión y borra datos locales
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    await prefs.remove(AppConstants.userKey);
  }
}
