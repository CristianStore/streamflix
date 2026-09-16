import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  UserModel? _user;
  String? _token;
  bool _isLoading = false;
  String? _errorMessage;

  AuthProvider(this._authService, this._apiService) {
    _initSession();
  }

  UserModel? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> _initSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      _token = await _authService.getSavedToken();
      _user = await _authService.getSavedUser();
      if (_token != null) {
        _apiService.setAuthToken(_token);
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _authService.login(username, password);
      _user = res['user'] as UserModel;
      _token = res['token'] as String;
      _apiService.setAuthToken(_token);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(String username, String password, {String? email}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _authService.register(username, password, email: email);
      _user = res['user'] as UserModel;
      _token = res['token'] as String;
      _apiService.setAuthToken(_token);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _token = null;
    _apiService.setAuthToken(null);
    notifyListeners();
  }
}
