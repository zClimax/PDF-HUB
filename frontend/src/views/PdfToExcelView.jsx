// frontend/src/views/PdfToExcelView.jsx
import { useState } from "react";
import AppShell from "../components/AppShell";
import { API_BASE } from "../services/api";

export default function PdfToExcelView({ onBack }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null); // { pages }
  const [error, setError]     = useState("");

  const formatSize = (bytes) =>
    bytes < 1024 * 1024
      ? (bytes / 1024).toFixed(0) + " KB"
      : (bytes / 1024 / 1024).toFixed(2) + " MB";

  async function handleConvertir() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResultado(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/pdf-to-excel`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const pages = Number(res.headers.get("x-pages") || "0");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = file.name.replace(/\.pdf$/i, "") + ".xlsx";
      a.click();
      URL.revokeObjectURL(url);

      setResultado({ pages });
    } catch (err) {
      setError(err.message || "Error al convertir el PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="PDF a Excel"
      subtitle="Extrae el contenido de un PDF exportado desde Excel"
      actions={
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Volver
        </button>
      }
    >
      <div className="mx-auto max-w-lg space-y-6">

        {/* Aviso de limitación */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Solo funciona con PDFs exportados desde Excel</p>
              <p className="mt-1 text-xs text-amber-700">
                Cada página del PDF se convierte en una hoja del Excel resultante.
                No funciona con PDFs escaneados ni con documentos de Word o imágenes.
              </p>
            </div>
          </div>
        </div>

        {/* Selector de archivo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Selecciona un PDF
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setResultado(null);
              setError("");
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          {file && (
            <p className="mt-2 text-xs text-slate-500">
              {file.name} — {formatSize(file.size)}
            </p>
          )}
        </div>

        {/* Botón */}
        <button
          onClick={handleConvertir}
          disabled={!file || loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Convirtiendo…" : "Convertir a Excel"}
        </button>

        {/* Resultado */}
        {resultado && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-semibold text-green-800">
              ✓ Excel generado y descargado correctamente
            </p>
            <p className="text-xs text-green-600 mt-1">
              {resultado.pages} {resultado.pages === 1 ? "página convertida en 1 hoja" : `páginas convertidas en ${resultado.pages} hojas`}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">No se pudo convertir el archivo</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

      </div>
    </AppShell>
  );
}
