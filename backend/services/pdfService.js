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

module.exports = { mergePDFs, deletePages };

