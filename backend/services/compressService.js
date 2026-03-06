const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");

const TEMP_DIR = path.join(__dirname, "../temp");

const GS_SETTINGS = {
  baja: "screen",
  media: "ebook",
  alta: "printer",
};

// Ruta absoluta en Windows, comando directo en Linux
const isWindows = process.platform === "win32";
const gsCmd = isWindows
  ? `"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe"`
  : "gs";

async function compressPDF(inputName, nivel = "media") {
  const setting = GS_SETTINGS[nivel] || "ebook";
  const outputName = uuidv4() + ".pdf";
  const inputPath = path.join(TEMP_DIR, inputName);
  const outputPath = path.join(TEMP_DIR, outputName);

const cmd = [
  gsCmd,
  "-sDEVICE=pdfwrite",
  "-dCompatibilityLevel=1.4",
  `-dPDFSETTINGS=/${setting}`,
  "-dNOPAUSE",
  "-dQUIET",
  "-dBATCH",
  "-dDetectDuplicateImages=true",   // elimina imágenes duplicadas
  "-dCompressFonts=true",            // comprime fuentes embebidas
  "-dSubsetFonts=true",              // solo embebe caracteres usados
  `-sOutputFile="${outputPath}"`,
  `"${inputPath}"`,
].join(" ");

  execSync(cmd);

  const inputSize = (await fs.stat(inputPath)).size;
  const outputSize = (await fs.stat(outputPath)).size;
  const reduccion = Math.round((1 - outputSize / inputSize) * 100);

  return { outputName, inputSize, outputSize, reduccion };
}

module.exports = { compressPDF };
