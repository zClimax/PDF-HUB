// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../database/db");
const { requireAuth } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_DOMAIN = "@estrellaguia.mx";

// ─── POST /auth/login ────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "El correo y la contraseña son requeridos." });
  }

  const emailLower = email.toLowerCase().trim();

  // Solo correos institucionales
  if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
    return res.status(403).json({
      error: `Solo se permiten correos con dominio ${ALLOWED_DOMAIN}`,
    });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(emailLower);

  // Respuesta genérica para no revelar si el email existe
  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }

  if (!user.is_active) {
    return res.status(403).json({
      error: "Tu cuenta está deshabilitada. Contacta al administrador.",
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Credenciales incorrectas." });
  }

  // Generar JWT sin expiración (sesión hasta logout manual)
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    },
    JWT_SECRET
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      must_change_password: user.must_change_password === 1,
    },
  });
});

// ─── POST /auth/logout ───────────────────────────────────────────────────────
router.post("/logout", requireAuth, (req, res) => {
  const db = getDb();
  // Incrementar token_version invalida todos los tokens existentes del usuario
  db.prepare(
    `UPDATE users SET token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?`
  ).run(req.user.id);

  res.json({ message: "Sesión cerrada correctamente." });
});

// ─── POST /auth/change-password ──────────────────────────────────────────────
router.post("/change-password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({
      error: "Se requieren la contraseña actual y la nueva.",
    });
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      error: "La nueva contraseña debe tener al menos 8 caracteres.",
    });
  }

  if (current_password === new_password) {
    return res.status(400).json({
      error: "La nueva contraseña debe ser diferente a la actual.",
    });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  const passwordMatch = await bcrypt.compare(current_password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "La contraseña actual es incorrecta." });
  }

  const hash = await bcrypt.hash(new_password, 12);

  // Actualizar contraseña, limpiar flag must_change_password,
  // e incrementar token_version para invalidar el token actual
  db.prepare(
    `UPDATE users SET
       password = ?,
       must_change_password = 0,
       token_version = token_version + 1,
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(hash, req.user.id);

  // Emitir un nuevo token con la token_version actualizada
  const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  const newToken = jwt.sign(
    {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      token_version: updatedUser.token_version,
    },
    JWT_SECRET
  );

  res.json({
    message: "Contraseña actualizada correctamente.",
    token: newToken,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      must_change_password: false,
    },
  });
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────
// Verifica si el token sigue siendo válido y devuelve datos del usuario
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;