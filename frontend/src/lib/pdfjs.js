import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

// Apunta al archivo estático en public/, ignorando el bundle de Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export { pdfjsLib };
