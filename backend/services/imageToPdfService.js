// backend/services/imageToPdfService.js
const { PDFDocument } = require("pdf-lib");
const fs   = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const TEMP_DIR = path.join(__dirname, "../temp");

/**
 * Convierte un arreglo de imágenes (PNG/JPG) en un PDF de una página por imagen.
 * @param {string[]} imageFileNames  - nombres de archivo en TEMP_DIR
 * @returns {string} nombre del archivo PDF generado en TEMP_DIR
 */
async function imagesToPdf(imageFileNames) {
  const pdfDoc = await PDFDocument.create();

  for (const fileName of imageFileNames) {
    const filePath   = path.join(TEMP_DIR, fileName);
    const imageBytes = await fs.readFile(filePath);
    const ext        = path.extname(fileName).toLowerCase();

    // pdf-lib tiene métodos distintos para PNG y JPG
    const image = ext === ".png"
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

    // Cada imagen ocupa una página de su mismo tamaño
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x:      0,
      y:      0,
      width:  image.width,
      height: image.height,
    });
  }

  const pdfBytes  = await pdfDoc.save();
  const outputName = uuidv4() + ".pdf";
  await fs.writeFile(path.join(TEMP_DIR, outputName), pdfBytes);

  return outputName;
}

module.exports = { imagesToPdf };
