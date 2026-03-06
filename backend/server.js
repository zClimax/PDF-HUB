const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs-extra");
const { PDFDocument } = require("pdf-lib");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const FileType = require("file-type");

const { mergePDFs, deletePages, reorderPages, extractPages, stampSignature } =
  require("./services/pdfService");
const { compressPDF } = require("./services/compressService");

const app = express();

// ─── SEGURIDAD: Headers HTTP ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // desactivado para no romper el frontend React
}));

// ─── SEGURIDAD: Rate limiting ──────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,                   // máximo 60 requests por IP
  message: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limit más estricto solo para uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // máximo 20 uploads por IP cada 15 min
  message: "Límite de subidas alcanzado. Intenta en 15 minutos.",
});

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "https://pdf.estrellaguia.mx",
  "http://localhost:5173",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS no permitido para: " + origin));
    }
  },
  credentials: true,
}));


app.use(express.json());

const TEMP_DIR = path.join(__dirname, "temp");
fs.ensureDirSync(TEMP_DIR);

// ─── SEGURIDAD: Validación MIME real (no solo extensión) ───────────────────
async function validateFileMime(filePath, allowedTypes) {
  const buffer = await fs.readFile(filePath);
  const type = await FileType.fromBuffer(buffer);
  if (!type) return false;
  return allowedTypes.includes(type.mime);
}


function isPdfFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  return ext === ".pdf" || mime === "application/pdf";
}

function isImageFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  return (
    ext === ".png" || ext === ".jpg" || ext === ".jpeg" ||
    mime === "image/png" || mime === "image/jpeg"
  );
}

// ─── MULTER ────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    // Sanitiza: solo guarda extensión segura, nombre con UUID
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".pdf", ".png", ".jpg", ".jpeg"].includes(ext) ? ext : "";
    cb(null, uuidv4() + safeExt);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (isPdfFile(file) || isImageFile(file)) return cb(null, true);
    cb(new Error("Solo se permiten archivos PDF o imágenes (PNG/JPG)"));
  },
});

// ─── HELPER CLEANUP ────────────────────────────────────────────────────────
function cleanupAfterResponse(res, absolutePaths) {
  let done = false;
  const cleanup = async () => {
    if (done) return;
    done = true;
    await Promise.all(absolutePaths.map((p) => fs.remove(p).catch(() => {})));
  };
  res.on("finish", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);
}

// ─── RUTAS ─────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend funcionando 🔥");
});

app.post("/upload", uploadLimiter, upload.single("file"), async (req, res) => {
  const filePath = path.join(TEMP_DIR, req.file.filename);
  // Validación MIME real
  const valid = await validateFileMime(filePath, ["application/pdf", "image/png", "image/jpeg"]);
  if (!valid) {
    await fs.remove(filePath).catch(() => {});
    return res.status(400).send("El archivo no es un PDF o imagen válido.");
  }
  res.json({ message: "Archivo recibido", file: req.file.filename });
});

app.post("/merge", uploadLimiter, upload.array("files"), async (req, res) => {
  const inputNames = (req.files || []).map((f) => f.filename);

  if (inputNames.length < 2) {
    await Promise.all(inputNames.map((n) => fs.remove(path.join(TEMP_DIR, n)).catch(() => {})));
    return res.status(400).send("Sube al menos 2 PDFs para unir");
  }

  // Validación MIME real en todos los archivos
  for (const name of inputNames) {
    const valid = await validateFileMime(path.join(TEMP_DIR, name), ["application/pdf"]);
    if (!valid) {
      await Promise.all(inputNames.map((n) => fs.remove(path.join(TEMP_DIR, n)).catch(() => {})));
      return res.status(400).send("Uno o más archivos no son PDFs válidos.");
    }
  }

  let mergedName = null;
  try {
    mergedName = await mergePDFs(inputNames);
    const inputPaths = inputNames.map((n) => path.join(TEMP_DIR, n));
    const mergedPath = path.join(TEMP_DIR, mergedName);
    cleanupAfterResponse(res, [...inputPaths, mergedPath]);
    res.setHeader("Cache-Control", "no-store");
    return res.download(mergedPath, "unido.pdf", (err) => {
      if (err) console.error("Error download /merge:", err);
    });
  } catch (error) {
    console.error(error);
    const paths = [
      ...inputNames.map((n) => path.join(TEMP_DIR, n)),
      mergedName ? path.join(TEMP_DIR, mergedName) : null,
    ].filter(Boolean);
    await Promise.all(paths.map((p) => fs.remove(p).catch(() => {})));
    return res.status(500).send("Error al unir PDFs");
  }
});

app.post("/delete-pages", uploadLimiter, upload.single("file"), async (req, res) => {
  const inputName = req.file?.filename;
  const inputPath = inputName ? path.join(TEMP_DIR, inputName) : null;

  // Validación MIME real
  if (inputPath) {
    const valid = await validateFileMime(inputPath, ["application/pdf"]);
    if (!valid) {
      await fs.remove(inputPath).catch(() => {});
      return res.status(400).send("El archivo no es un PDF válido.");
    }
  }

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
    const paths = [inputPath, resultName ? path.join(TEMP_DIR, resultName) : null].filter(Boolean);
    await Promise.all(paths.map((p) => fs.remove(p).catch(() => {})));
    return res.status(500).send("Error al eliminar páginas");
  }
});

app.post("/reorder-pages", uploadLimiter, upload.single("file"), async (req, res) => {
  const inputPath = path.join(TEMP_DIR, req.file.filename);
  const valid = await validateFileMime(inputPath, ["application/pdf"]);
  if (!valid) {
    await fs.remove(inputPath).catch(() => {});
    return res.status(400).send("El archivo no es un PDF válido.");
  }
  try {
    const order = JSON.parse(req.body.order);
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

app.post("/extract-pages", uploadLimiter, upload.single("file"), async (req, res) => {
  const inputPath = path.join(TEMP_DIR, req.file.filename);
  const valid = await validateFileMime(inputPath, ["application/pdf"]);
  if (!valid) {
    await fs.remove(inputPath).catch(() => {});
    return res.status(400).send("El archivo no es un PDF válido.");
  }
  try {
    const pages = JSON.parse(req.body.pages);
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

app.post(
  "/api/stamp-signature",
  uploadLimiter,
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  async (req, res) => {
    const pdfFile = req.files?.pdf?.[0];
    const sigFile = req.files?.signature?.[0];

    if (!pdfFile || !sigFile) {
      if (pdfFile) await fs.remove(path.join(TEMP_DIR, pdfFile.filename)).catch(() => {});
      if (sigFile) await fs.remove(path.join(TEMP_DIR, sigFile.filename)).catch(() => {});
      return res.status(400).send("Debes enviar 'pdf' y 'signature'");
    }

    // Validación MIME real
    const pdfValid = await validateFileMime(path.join(TEMP_DIR, pdfFile.filename), ["application/pdf"]);
    const sigValid = await validateFileMime(path.join(TEMP_DIR, sigFile.filename), ["image/png", "image/jpeg"]);
    if (!pdfValid || !sigValid) {
      await fs.remove(path.join(TEMP_DIR, pdfFile.filename)).catch(() => {});
      await fs.remove(path.join(TEMP_DIR, sigFile.filename)).catch(() => {});
      return res.status(400).send("Archivos inválidos. Se requiere un PDF y una imagen PNG/JPG.");
    }

    let options = {};
    try { options = JSON.parse(req.body.options || "{}"); } catch {}

    let outName = null;
    try {
      outName = await stampSignature(pdfFile.filename, sigFile.filename, options);
      cleanupAfterResponse(res, [
        path.join(TEMP_DIR, pdfFile.filename),
        path.join(TEMP_DIR, sigFile.filename),
        path.join(TEMP_DIR, outName),
      ]);
      res.setHeader("Cache-Control", "no-store");
      return res.download(path.join(TEMP_DIR, outName), "pdf_firmado.pdf");
    } catch (err) {
      console.error(err);
      await Promise.all(
        [
          path.join(TEMP_DIR, pdfFile.filename),
          path.join(TEMP_DIR, sigFile.filename),
          outName ? path.join(TEMP_DIR, outName) : null,
        ]
          .filter(Boolean)
          .map((p) => fs.remove(p).catch(() => {}))
      );
      return res.status(500).send("Error firmando PDF");
    }
  }
);

app.post("/pdf-info", uploadLimiter, upload.single("file"), async (req, res) => {
  const filePath = path.join(TEMP_DIR, req.file.filename);
  const valid = await validateFileMime(filePath, ["application/pdf"]);
  if (!valid) {
    await fs.remove(filePath).catch(() => {});
    return res.status(400).send("El archivo no es un PDF válido.");
  }
  try {
    const bytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(bytes);
    return res.json({ pages: pdf.getPageCount() });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error leyendo PDF");
  } finally {
    await fs.remove(filePath).catch(() => {});
  }
});


// Diagnóstico temporal - quitar después
app.get("/check-gs", (req, res) => {
  const { execSync } = require("child_process");
  try {
    const v = execSync("gs --version 2>&1").toString().trim();
    res.json({ available: true, version: v });
  } catch {
    try {
      const v2 = execSync("ghostscript --version 2>&1").toString().trim();
      res.json({ available: true, version: v2 });
    } catch {
      res.json({ available: false });
    }
  }
});

// ─────────────────────────────────────────────
// ENDPOINT: POST /compress
// Comprime un PDF usando Ghostscript según el
// nivel elegido: "alta", "media" o "baja"
// ─────────────────────────────────────────────
app.post("/compress", uploadLimiter, upload.single("file"), async (req, res) => {
  const inputName = req.file?.filename;
  const inputPath = inputName ? path.join(TEMP_DIR, inputName) : null;

  // Validar que el archivo recibido sea realmente un PDF
  const valid = await validateFileMime(inputPath, ["application/pdf"]);
  if (!valid) {
    await fs.remove(inputPath).catch(() => {});
    return res.status(400).send("El archivo no es un PDF válido.");
  }

  // Validar nivel de compresión; si no viene o es inválido, usar "media"
  const nivel = ["baja", "media", "alta"].includes(req.body.nivel)
    ? req.body.nivel
    : "media";

  let outputName = null;
  try {
    // Ejecutar compresión con Ghostscript
    const result = await compressPDF(inputName, nivel);
    outputName = result.outputName;
    const outputPath = path.join(TEMP_DIR, outputName);

    // Exponer headers personalizados al frontend (necesario para CORS)
    res.setHeader("Access-Control-Expose-Headers",
      "X-Reduccion, X-Input-Size, X-Output-Size"
    );

    // Headers con métricas de compresión para mostrar en la UI
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Reduccion", String(result.reduccion));
    res.setHeader("X-Input-Size", String(result.inputSize));
    res.setHeader("X-Output-Size", String(result.outputSize));

    // Limpiar archivos temporales después de enviar la respuesta
    cleanupAfterResponse(res, [inputPath, outputPath]);

    // Enviar el PDF comprimido como descarga
    return res.download(outputPath, "comprimido.pdf", (err) => {
      if (err) console.error("Error al enviar /compress:", err);
    });

  } catch (error) {
    console.error("Error en /compress:", error);

    // Limpiar archivos temporales en caso de error
    const paths = [
      inputPath,
      outputName ? path.join(TEMP_DIR, outputName) : null,
    ].filter(Boolean);
    await Promise.all(paths.map((p) => fs.remove(p).catch(() => {})));

    return res.status(500).send("Error al comprimir PDF");
  }
});



// ─── MANEJO DE ERRORES ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(400).send(err.message || "Solicitud inválida");
});

// ─── FRONTEND ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(5000, () => {
  console.log("Servidor en http://localhost:5000");
});
