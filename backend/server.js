const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs-extra");
const { PDFDocument } = require("pdf-lib");

const { mergePDFs, deletePages, reorderPages, extractPages } = require("./services/pdfService");


const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(__dirname, "temp");
fs.ensureDirSync(TEMP_DIR);

function isPdfFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  return ext === ".pdf" || mime === "application/pdf";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 20 }, // ajusta a tu gusto
  fileFilter: (req, file, cb) => {
    if (!isPdfFile(file)) return cb(new Error("Solo se permiten archivos PDF"));
    cb(null, true);
  },
});

function cleanupAfterResponse(res, absolutePaths) {
  let done = false;

  const cleanup = async () => {
    if (done) return;
    done = true;
    await Promise.all(
      absolutePaths.map((p) => fs.remove(p).catch(() => {}))
    );
  };

  // finish: respuesta enviada; close: conexión cerrada/abortada
  res.on("finish", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);
}

app.get("/", (req, res) => {
  res.send("Backend funcionando 🔥");
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ message: "Archivo recibido", file: req.file.filename });
});

app.post("/merge", upload.array("files"), async (req, res) => {
  const inputNames = (req.files || []).map((f) => f.filename);

  if (inputNames.length < 2) {
    // limpia lo que haya llegado
    await Promise.all(inputNames.map((n) => fs.remove(path.join(TEMP_DIR, n)).catch(() => {})));
    return res.status(400).send("Sube al menos 2 PDFs para unir");
  }

  let mergedName = null;

  try {
    mergedName = await mergePDFs(inputNames);

    const inputPaths = inputNames.map((n) => path.join(TEMP_DIR, n));
    const mergedPath = path.join(TEMP_DIR, mergedName);

    cleanupAfterResponse(res, [...inputPaths, mergedPath]);

    // Opcional: evita cache del navegador/proxy
    res.setHeader("Cache-Control", "no-store");
    return res.download(mergedPath, "unido.pdf", (err) => {
      if (err) console.error("Error download /merge:", err);
    });
  } catch (error) {
    console.error(error);

    // si falló antes de responder, limpia inputs y el output si existiera
    const paths = [
      ...inputNames.map((n) => path.join(TEMP_DIR, n)),
      mergedName ? path.join(TEMP_DIR, mergedName) : null,
    ].filter(Boolean);

    await Promise.all(paths.map((p) => fs.remove(p).catch(() => {})));
    return res.status(500).send("Error al unir PDFs");
  }
});

app.post("/delete-pages", upload.single("file"), async (req, res) => {
  const inputName = req.file?.filename;
  const inputPath = inputName ? path.join(TEMP_DIR, inputName) : null;

  let pagesToDelete;
  try {
    pagesToDelete = JSON.parse(req.body.pages || "[]");
  } catch {
    if (inputPath) await fs.remove(inputPath).catch(() => {});
    return res.status(400).send("El parámetro 'pages' debe ser JSON válido");
  }

  if (!Array.isArray(pagesToDelete) || pagesToDelete.some((p) => !Number.isInteger(p) || p < 0)) {
    if (inputPath) await fs.remove(inputPath).catch(() => {});
    return res.status(400).send("Las páginas deben ser un arreglo de enteros (0-based) >= 0");
  }

  let resultName = null;

  try {
    resultName = await deletePages(inputName, pagesToDelete);

    const resultPath = path.join(TEMP_DIR, resultName);
    cleanupAfterResponse(res, [inputPath, resultPath].filter(Boolean));

    res.setHeader("Cache-Control", "no-store");
    return res.download(resultPath, "pdfeditado.pdf", (err) => {
      if (err) console.error("Error download /delete-pages:", err);
    });
  } catch (error) {
    console.error(error);

    const paths = [
      inputPath,
      resultName ? path.join(TEMP_DIR, resultName) : null,
    ].filter(Boolean);

    await Promise.all(paths.map((p) => fs.remove(p).catch(() => {})));
    return res.status(500).send("Error al eliminar páginas");
  }
});

// METODO REORDENAR PAGINAS
app.post("/reorder-pages", upload.single("file"), async (req, res) => {
  try {
    const order = JSON.parse(req.body.order); // 0-based, ej [2,0,1,...]

    const resultFile = await reorderPages(req.file.filename, order);

    res.download("temp/" + resultFile, async () => {
      await fs.remove("temp/" + req.file.filename);
      await fs.remove("temp/" + resultFile);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al reordenar páginas");
  }
});


// METODO EXTRAER PAGINAS
app.post("/extract-pages", upload.single("file"), async (req, res) => {
  try {
    const pages = JSON.parse(req.body.pages); // 0-based

    const resultFile = await extractPages(req.file.filename, pages);

    res.download("temp/" + resultFile, async () => {
      await fs.remove("temp/" + req.file.filename);
      await fs.remove("temp/" + resultFile);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al extraer páginas");
  }
});



app.post("/pdf-info", upload.single("file"), async (req, res) => {
  const filePath = path.join(TEMP_DIR, req.file.filename);

  try {
    const bytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(bytes);
    const pageCount = pdf.getPageCount();
    return res.json({ pages: pageCount });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error leyendo PDF");
  } finally {
    await fs.remove(filePath).catch(() => {});
  }
});

// Manejo simple de errores (incluye multer/fileFilter)
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(400).send(err.message || "Solicitud inválida");
});

app.listen(5000, () => {
  console.log("Servidor en http://localhost:5000");
});
