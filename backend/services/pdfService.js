const { PDFDocument } = require("pdf-lib");
const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function mergePDFs(files) {

  const mergedPdf = await PDFDocument.create();
  console.log("FILES RECIBIDOS:", files);

  for (const file of files) {
    const filePath = path.join("temp", file);
    const pdfBytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(pdfBytes);

    const copiedPages = await mergedPdf.copyPages(
      pdf,
      pdf.getPageIndices()
    );

    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  const outputName = uuidv4() + ".pdf";
  const outputPath = path.join("temp", outputName);

  const mergedBytes = await mergedPdf.save();
  await fs.writeFile(outputPath, mergedBytes);

  return outputName;
}

async function deletePages(fileName, pagesToDelete) {

  const inputPath = path.join("temp", fileName);

  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);

  const newPdf = await PDFDocument.create();

  const pages = pdf.getPageIndices();

  const pagesToKeep = pages.filter(
    (p) => !pagesToDelete.includes(p)
  );

  const copiedPages = await newPdf.copyPages(pdf, pagesToKeep);

  copiedPages.forEach(p => newPdf.addPage(p));

  const outputName = uuidv4() + ".pdf";
  const outputPath = path.join("temp", outputName);

  const newBytes = await newPdf.save();

  await fs.writeFile(outputPath, newBytes);

  return outputName;
}


async function extractPages(fileName, pagesToExtract) {
  const inputPath = path.join("temp", fileName);

  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);

  const totalPages = pdf.getPageCount();

  if (!Array.isArray(pagesToExtract) || pagesToExtract.length === 0) {
    throw new Error("pages debe ser un arreglo con al menos una página");
  }

  // Validar enteros, rango y sin repetidos
  const seen = new Set();
  for (const idx of pagesToExtract) {
    if (!Number.isInteger(idx)) throw new Error("pages debe contener enteros");
    if (idx < 0 || idx >= totalPages) throw new Error("pages contiene índices fuera de rango");
    if (seen.has(idx)) throw new Error("pages contiene páginas repetidas");
    seen.add(idx);
  }

  // Ordenar para que el PDF extraído quede en orden ascendente (opcional pero recomendado)
  const ordered = [...pagesToExtract].sort((a, b) => a - b);

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, ordered);
  copiedPages.forEach((p) => newPdf.addPage(p));

  const outputName = uuidv4() + ".pdf";
  const outputPath = path.join("temp", outputName);

  const newBytes = await newPdf.save();
  await fs.writeFile(outputPath, newBytes);

  return outputName;
}



async function reorderPages(fileName, pageOrder) {
  const inputPath = path.join("temp", fileName);

  const pdfBytes = await fs.readFile(inputPath);
  const pdf = await PDFDocument.load(pdfBytes);

  const totalPages = pdf.getPageCount();

  if (!Array.isArray(pageOrder)) {
    throw new Error("order debe ser un arreglo");
  }

  // Validaciones: longitud, rango, enteros y sin repetidos
  if (pageOrder.length !== totalPages) {
    throw new Error("El orden no coincide con el número de páginas");
  }

  const seen = new Set();
  for (const idx of pageOrder) {
    if (!Number.isInteger(idx)) throw new Error("order debe contener enteros");
    if (idx < 0 || idx >= totalPages) throw new Error("order contiene índices fuera de rango");
    if (seen.has(idx)) throw new Error("order contiene páginas repetidas");
    seen.add(idx);
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdf, pageOrder);
  copiedPages.forEach((p) => newPdf.addPage(p));

  const outputName = uuidv4() + ".pdf";
  const outputPath = path.join("temp", outputName);

  const newBytes = await newPdf.save();
  await fs.writeFile(outputPath, newBytes);

  return outputName;
}


module.exports = { mergePDFs, deletePages, reorderPages, extractPages };


