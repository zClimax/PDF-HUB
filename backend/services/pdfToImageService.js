const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");

const TEMP_DIR = path.join(__dirname, "../temp");

const isWindows = process.platform === "win32";
const gsCmd = isWindows
  ? `"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe"`
  : "gs";

// Formatos soportados y su tipo MIME
const FORMATS = {
  jpg:  { device: "jpeg",     mime: "image/jpeg" },
  jpeg: { device: "jpeg",     mime: "image/jpeg" },
  png:  { device: "png16m",   mime: "image/png"  },
  webp: { device: "png16m",   mime: "image/png"  }, // se convierte desde png
};

/**
 * Convierte un PDF a imágenes por página.
 * @param {string} inputName  - Nombre del archivo en /temp
 * @param {string} formato    - "jpg" | "png" | "jpeg"
 * @param {number} dpi        - Resolución (72, 150, 300)
 * @returns {{ outputFiles: string[], zipName: string }}
 */
async function pdfToImages(inputName, formato = "jpg", dpi = 150) {
  const fmt = FORMATS[formato] || FORMATS["jpg"];
  const inputPath = path.join(TEMP_DIR, inputName);
  const sessionId = uuidv4();
  const outputPrefix = path.join(TEMP_DIR, `${sessionId}_%04d.${formato}`);

  // Ghostscript convierte cada página en un archivo separado
  const cmd = [
    gsCmd,
    `-sDEVICE=${fmt.device}`,
    `-r${dpi}`,
    "-dNOPAUSE",
    "-dBATCH",
    "-dQUIET",
    `-sOutputFile="${outputPrefix}"`,
    `"${inputPath}"`,
  ].join(" ");

  execSync(cmd, { timeout: 120000 });

  // Recopilar archivos generados
  const allFiles = await fs.readdir(TEMP_DIR);
  const outputFiles = allFiles
    .filter((f) => f.startsWith(sessionId))
    .sort()
    .map((f) => f); // solo nombres, sin ruta completa

  return { outputFiles, sessionId };
}

module.exports = { pdfToImages };