const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/database');
const config = require('../config/config');

/**
 * Registro de nuevo usuario (Email, Usuario, Password)
 */
async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario, el correo y la contraseña son obligatorios'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 4 caracteres'
      });
    }

    // Verificar si ya existe por nombre de usuario o por email
    const existingUser = await db.findUserByUsernameOrEmail(username);
    const existingEmail = await db.findUserByUsernameOrEmail(email);

    if (existingUser || existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'El nombre de usuario o el correo electrónico ya se encuentra registrado'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'user'
    });

    const token = jwt.sign(
      {
        id: newUser.id || newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: newUser.id || newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive
      }
    });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno en el registro de usuario'
    });
  }
}

/**
 * Inicio de sesión (soporta Usuario o Email)
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Debe ingresar nombre de usuario o email y su contraseña'
      });
    }

    const user = await db.findUserByUsernameOrEmail(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Usuario no encontrado'
      });
    }

    // Verificar si la cuenta ha sido suspendida/bloqueada por el administrador
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Tu cuenta ha sido suspendida o desactivada por un administrador'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Contraseña incorrecta'
      });
    }

    const token = jwt.sign(
      {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      success: true,
      message: 'Autenticación exitosa',
      token,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno en la autenticación'
    });
  }
}

/**
 * Consulta de perfil del usuario logueado
 */
async function getProfile(req, res) {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id || user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Error al consultar perfil'
    });
  }
}

module.exports = {
  register,
  login,
  getProfile
};
