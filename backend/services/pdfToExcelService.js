// backend/services/pdfToExcelService.js
// Requiere pdfjs-dist@3.11.174 (CommonJS legacy build — sin dependencias DOM)
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const ExcelJS  = require("exceljs");
const fs       = require("fs-extra");
const path     = require("path");
const { v4: uuidv4 } = require("uuid");

// Desactivar worker (no disponible en Node.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

const TEMP_DIR   = path.join(__dirname, "../temp");
const Y_TOLERANCE = 5; // puntos de tolerancia para agrupar en la misma fila

/**
 * Convierte un PDF (exportado desde Excel) a un archivo .xlsx.
 * Cada página del PDF se convierte en una hoja del Excel.
 *
 * @param {string} inputFileName - nombre del archivo en TEMP_DIR
 * @returns {{ outputName: string, pages: number }}
 */
async function pdfToExcel(inputFileName) {
  const inputPath  = path.join(TEMP_DIR, inputFileName);
  const fileBuffer = await fs.readFile(inputPath);
  const data       = new Uint8Array(fileBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch:  false,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdfDocument = await loadingTask.promise;
  const workbook    = new ExcelJS.Workbook();
  let sheetsCreated = 0;

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page        = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Filtrar items con texto real y extraer posición
    const items = textContent.items
      .filter((item) => item.str && item.str.trim().length > 0)
      .map((item) => ({
        text: item.str.trim(),
        x: item.transform[4],   // posición horizontal
        y: item.transform[5],   // posición vertical (↑ en PDF = mayor Y)
      }));

    if (items.length === 0) continue;

    // ── Agrupar items por fila (Y similar dentro de tolerancia) ──────────
    const rowMap = new Map(); // key: Y representativo, value: [items]

    for (const item of items) {
      let foundKey = null;
      for (const key of rowMap.keys()) {
        if (Math.abs(key - item.y) <= Y_TOLERANCE) {
          foundKey = key;
          break;
        }
      }
      if (foundKey !== null) {
        rowMap.get(foundKey).push(item);
      } else {
        rowMap.set(item.y, [item]);
      }
    }

    // ── Ordenar filas de arriba a abajo (Y mayor = parte superior) ───────
    const sortedRows = [...rowMap.entries()]
      .sort(([ya], [yb]) => yb - ya)
      .map(([, rowItems]) =>
        rowItems.sort((a, b) => a.x - b.x) // celdas de izquierda a derecha
      );

    // ── Crear hoja en el Excel ────────────────────────────────────────────
    const sheet = workbook.addWorksheet(`Página ${pageNum}`);

    sortedRows.forEach((rowItems, idx) => {
      const row = sheet.addRow(rowItems.map((item) => item.text));

      // Estilo de encabezado para la primera fila de cada hoja
      if (idx === 0) {
        row.font = { bold: true };
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8EAF6" },
        };
      }
    });

    // ── Ajustar ancho de columnas automáticamente ────────────────────────
    if (sheet.columns && sheet.columns.length > 0) {
      sheet.columns.forEach((col) => {
        let maxLen = 8;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const len = String(cell.value || "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 60);
      });
    }

    sheetsCreated++;
  }

  if (sheetsCreated === 0) {
    throw new Error(
      "No se encontró texto extraíble en el PDF. " +
      "Asegúrate de que el archivo fue exportado directamente desde Excel."
    );
  }

  const outputName = uuidv4() + ".xlsx";
  const outputPath = path.join(TEMP_DIR, outputName);
  await workbook.xlsx.writeFile(outputPath);

  return { outputName, pages: sheetsCreated };
}

module.exports = { pdfToExcel };
