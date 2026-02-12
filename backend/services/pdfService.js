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

async function stampSignature(pdfFileName, imageFileName, options) {
  const pdfPath = path.join("temp", pdfFileName);
  const imgPath = path.join("temp", imageFileName);

  const pdfBytes = await fs.readFile(pdfPath);
  const imgBytes = await fs.readFile(imgPath);

  const pdfDoc = await PDFDocument.load(pdfBytes);

  const pageIndex = Number(options.pageIndex ?? 0); // 0-based
  const xNorm = Number(options.xNorm ?? 0.8); // 0..1
  const yNorm = Number(options.yNorm ?? 0.2); // 0..1 (origen abajo-izq)
  const widthNorm = Number(options.widthNorm ?? 0.25); // % del ancho de la página
  const opacity = Number(options.opacity ?? 1);

  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
    throw new Error("pageIndex inválido");
  }
  if (!(xNorm >= 0 && xNorm <= 1 && yNorm >= 0 && yNorm <= 1)) {
    throw new Error("xNorm/yNorm deben estar entre 0 y 1");
  }
  if (!(widthNorm > 0 && widthNorm <= 1)) {
    throw new Error("widthNorm debe estar entre (0, 1]");
  }

  const ext = path.extname(imageFileName).toLowerCase();
  const img =
    ext === ".png"
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);

  const page = pdfDoc.getPage(pageIndex);
  const { width: pageW, height: pageH } = page.getSize();

  const stampW = pageW * widthNorm;
  const scale = stampW / img.width;
  const stampH = img.height * scale;

  // Click representa el CENTRO del sello
  let x = xNorm * pageW - stampW / 2;
  let y = yNorm * pageH - stampH / 2;

  // Clamp para que no se salga de la página
  x = Math.max(0, Math.min(x, pageW - stampW));
  y = Math.max(0, Math.min(y, pageH - stampH));

  page.drawImage(img, { x, y, width: stampW, height: stampH, opacity });

  const outputName = uuidv4() + ".pdf";
  const outputPath = path.join("temp", outputName);

  const outBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, outBytes);

  return outputName;
}



module.exports = { mergePDFs, deletePages, reorderPages, extractPages, stampSignature };
