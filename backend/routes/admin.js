// backend/routes/admin.js
const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../database/db");

const ALLOWED_DOMAIN = "@estrellaguia.mx";

// ─── Genera una contraseña temporal segura ─────────────────────────────────
function generateTempPassword() {
  const upper   = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower   = "abcdefghjkmnpqrstuvwxyz";
  const digits  = "23456789";
  const special = "!@#$";
  const all     = upper + lower + digits + special;

  // Al menos un carácter de cada tipo
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];

  for (let i = 0; i < 8; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  // Mezclar caracteres
  return pwd.split("").sort(() => 0.5 - Math.random()).join("");
}

// ─── GET /admin/users ── Listar todos los usuarios ──────────────────────────
router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, email, role, is_active, must_change_password, created_at
       FROM users
       ORDER BY created_at ASC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error("Error listando usuarios:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ─── POST /admin/users ── Crear usuario ─────────────────────────────────────
router.post("/users", async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ error: "El correo y el rol son requeridos." });
  }

  const emailLower = email.toLowerCase().trim();

  if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
    return res.status(400).json({
      error: `Solo se permiten correos con dominio ${ALLOWED_DOMAIN}`,
    });
  }

  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "El rol debe ser 'admin' o 'user'." });
  }

  try {
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [emailLower]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario con ese correo." });
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    await pool.execute(
      `INSERT INTO users (id, email, password, role, is_active, must_change_password)
       VALUES (?, ?, ?, ?, 1, 1)`,
      [uuidv4(), emailLower, hash, role]
    );

    // Devolver la contraseña temporal en texto plano (solo esta vez)
    res.status(201).json({
      message: "Usuario creado correctamente.",
      email: emailLower,
      temp_password: tempPassword,
    });
  } catch (err) {
    console.error("Error creando usuario:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ─── PUT /admin/users/:id ── Editar usuario (email y/o rol) ─────────────────
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { email, role } = req.body;

  // No puede editar su propia cuenta desde aquí
  if (id === req.user.id) {
    return res.status(400).json({ error: "No puedes editar tu propia cuenta desde el panel." });
  }

  if (!email && !role) {
    return res.status(400).json({ error: "Debes enviar al menos un campo a actualizar." });
  }

  if (email) {
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
      return res.status(400).json({
        error: `Solo se permiten correos con dominio ${ALLOWED_DOMAIN}`,
      });
    }
  }

  if (role && !["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "El rol debe ser 'admin' o 'user'." });
  }

  try {
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    if (email) {
      const [dup] = await pool.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email.toLowerCase().trim(), id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ error: "Ese correo ya está en uso." });
      }
    }

    const fields = [];
    const values = [];

    if (email) { fields.push("email = ?"); values.push(email.toLowerCase().trim()); }
    if (role)  { fields.push("role = ?");  values.push(role); }
    values.push(id);

    await pool.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    res.json({ message: "Usuario actualizado correctamente." });
  } catch (err) {
    console.error("Error editando usuario:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ─── DELETE /admin/users/:id ── Eliminar usuario ────────────────────────────
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });
  }

  try {
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    await pool.execute("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "Usuario eliminado correctamente." });
  } catch (err) {
    console.error("Error eliminando usuario:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ─── POST /admin/users/:id/reset ── Resetear contraseña ─────────────────────
router.post("/users/:id/reset", async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: "Usa la opción de cambiar contraseña de tu perfil." });
  }

  try {
    const [existing] = await pool.execute(
      "SELECT id, email FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    // Resetear: nueva contraseña temporal + must_change_password + invalidar tokens
    await pool.execute(
      `UPDATE users SET
         password = ?,
         must_change_password = 1,
         token_version = token_version + 1
       WHERE id = ?`,
      [hash, id]
    );

    res.json({
      message: "Contraseña reseteada correctamente.",
      email: existing[0].email,
      temp_password: tempPassword,
    });
  } catch (err) {
    console.error("Error reseteando contraseña:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ─── PATCH /admin/users/:id/status ── Habilitar / Deshabilitar ──────────────
router.patch("/users/:id/status", async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: "No puedes deshabilitar tu propia cuenta." });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT id, is_active FROM users WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const newStatus = rows[0].is_active ? 0 : 1;

    await pool.execute(
      "UPDATE users SET is_active = ?, token_version = token_version + 1 WHERE id = ?",
      [newStatus, id]
    );

    res.json({
      message: newStatus ? "Usuario habilitado." : "Usuario deshabilitado.",
      is_active: newStatus,
    });
  } catch (err) {
    console.error("Error cambiando estado:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

module.exports = router;