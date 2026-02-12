const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs-extra");
const { mergePDFs } = require("./services/pdfService");
const { deletePages } = require("./services/pdfService");
const { PDFDocument } = require("pdf-lib");
const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: "temp/",
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("Backend funcionando 🔥");
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    message: "Archivo recibido",
    file: req.file.filename
  });
});

//METODO DE UNION DE PDFS
app.post("/merge", upload.array("files"), async (req, res) => {

  try {

    const fileNames = req.files.map(f => f.filename);

    const mergedFile = await mergePDFs(fileNames);

    res.download("temp/" + mergedFile, async () => {

      // borrar archivos temporales
      for (const file of fileNames) {
        await fs.remove("temp/" + file);
      }

      await fs.remove("temp/" + mergedFile);
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error al unir PDFs");
  }

});

//METODO DE BORRADO DE PAGINA
app.post("/delete-pages", upload.single("file"), async (req, res) => {
  try {

    const pagesToDelete = JSON.parse(req.body.pages);

    const resultFile = await deletePages(
      req.file.filename,
      pagesToDelete
    );

    res.download("temp/" + resultFile, async () => {

      await fs.remove("temp/" + req.file.filename);
      await fs.remove("temp/" + resultFile);

    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error al eliminar páginas");
  }
});

//METODO PDF-INFO

app.post("/pdf-info", upload.single("file"), async (req, res) => {

  try {

    const filePath = "temp/" + req.file.filename;
    const bytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(bytes);

    const pageCount = pdf.getPageCount();

    await fs.remove(filePath);

    res.json({
      pages: pageCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error leyendo PDF");
  }
});



app.listen(5000, () => {
  console.log("Servidor en http://localhost:5000");
});
