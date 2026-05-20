// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const { getDb } = require("../database/db");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET no está definido en las variables de entorno.");
  console.error("Agrégalo en Plesk → Node.js → Variables de entorno personalizadas.");
  process.exit(1);
}

// Verifica que el request tenga un JWT válido y activo
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado. Inicia sesión." });
  }

  const token = authHeader.split(" ")[1];

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: "Sesión inválida. Inicia sesión de nuevo." });
  }

  // Verificar que el usuario siga activo y que el token no haya sido invalidado
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.id);

  if (!user) {
    return res.status(401).json({ error: "Usuario no encontrado." });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: "Tu cuenta está deshabilitada. Contacta al administrador." });
  }

  // token_version: si el usuario cerró sesión, su version en DB aumenta
  // y el token viejo queda inválido automáticamente
  if (user.token_version !== payload.token_version) {
    return res.status(401).json({ error: "Sesión cerrada. Inicia sesión de nuevo." });
  }

  // Adjuntar datos del usuario al request para uso en los endpoints
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    must_change_password: user.must_change_password === 1,
  };

  next();
}

// Verifica que el usuario autenticado sea administrador
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso denegado. Se requiere rol de administrador." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };