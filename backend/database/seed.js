// backend/database/seed.js
// Ejecutar UNA sola vez para crear el usuario administrador inicial
// Desde Plesk: "Ejecutar Script" → seed.js  (o node database/seed.js)

const { getDb } = require("./db");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const ADMIN_EMAIL = "administracion@estrellaguia.mx";
const TEMP_PASSWORD = "Admin2025!";

async function seed() {
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(ADMIN_EMAIL);

  if (existing) {
    console.log("El usuario admin ya existe: " + ADMIN_EMAIL);
    console.log("No se realizaron cambios.");
    return;
  }

  const hash = await bcrypt.hash(TEMP_PASSWORD, 12);

  db.prepare(
    `INSERT INTO users (id, email, password, role, is_active, must_change_password)
     VALUES (?, ?, ?, 'admin', 1, 1)`
  ).run(uuidv4(), ADMIN_EMAIL, hash);

  console.log("===========================================");
  console.log("Usuario administrador creado correctamente");
  console.log("===========================================");
  console.log("  Email:      " + ADMIN_EMAIL);
  console.log("  Contraseña: " + TEMP_PASSWORD);
  console.log("  Rol:        admin");
  console.log("===========================================");
  console.log("IMPORTANTE: El usuario deberá cambiar su");
  console.log("contraseña en el primer inicio de sesión.");
  console.log("===========================================");
}

seed().catch(console.error);