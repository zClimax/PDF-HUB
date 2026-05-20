const { execSync } = require("child_process");

const commands = ["soffice --version", "libreoffice --version"];
let found = false;

for (const cmd of commands) {
  try {
    const result = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    console.log("✓ LibreOffice encontrado:", result.trim());
    found = true;
    break;
  } catch {}
}

if (!found) {
  console.log("✗ LibreOffice NO está disponible en este servidor.");
  console.log("  Word ↔ PDF requerirá una solución alternativa.");
}