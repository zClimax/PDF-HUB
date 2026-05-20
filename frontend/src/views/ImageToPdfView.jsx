// frontend/src/views/ImageToPdfView.jsx
import { useState } from "react";
import AppShell from "../components/AppShell";
import { API_BASE } from "../services/api";

export default function ImageToPdfView({ onBack }) {
  const [files, setFiles]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const formatSize = (bytes) =>
    bytes < 1024 * 1024
      ? (bytes / 1024).toFixed(0) + " KB"
      : (bytes / 1024 / 1024).toFixed(2) + " MB";

  function handleFileChange(e) {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
    setSuccess(false);
    setError("");
    e.target.value = ""; // permite volver a seleccionar el mismo archivo
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSuccess(false);
  }

  async function handleConvert() {
    if (files.length === 0) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));

    try {
      const res = await fetch(`${API_BASE}/image-to-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = files.length === 1
        ? files[0].name.replace(/\.[^.]+$/, "") + ".pdf"
        : "imagenes.pdf";
      a.click();
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      setError(err.message || "Error al convertir imágenes a PDF.");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = files.length;

  return (
    <AppShell
      title="Imagen a PDF"
      subtitle="Convierte una o varias imágenes PNG/JPG en un archivo PDF"
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

        {/* Selector de imágenes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Selecciona imágenes
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          <p className="mt-2 text-xs text-slate-400">
            Formatos aceptados: PNG, JPG, JPEG · Cada imagen se convierte en una página, en el orden que las agregues.
          </p>
        </div>

        {/* Lista de imágenes seleccionadas */}
        {files.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">
                {totalPages} {totalPages === 1 ? "imagen · 1 página" : `imágenes · ${totalPages} páginas`}
              </p>
              <button
                onClick={() => { setFiles([]); setSuccess(false); }}
                className="text-xs text-slate-400 hover:text-red-500 transition"
              >
                Limpiar todo
              </button>
            </div>

            <ul className="space-y-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  {/* Número de página */}
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>

                  {/* Nombre */}
                  <span className="flex-1 text-sm text-slate-700 truncate">
                    {f.name}
                  </span>

                  {/* Tamaño */}
                  <span className="flex-shrink-0 text-xs text-slate-400">
                    {formatSize(f.size)}
                  </span>

                  {/* Eliminar */}
                  <button
                    onClick={() => removeFile(i)}
                    className="flex-shrink-0 text-slate-300 hover:text-red-500 transition"
                    title="Quitar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botón convertir */}
        <button
          onClick={handleConvert}
          disabled={files.length === 0 || loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading
            ? "Convirtiendo…"
            : files.length === 0
              ? "Selecciona al menos una imagen"
              : `Convertir ${files.length} ${files.length === 1 ? "imagen" : "imágenes"} a PDF`}
        </button>

        {/* Éxito */}
        {success && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">
              ✓ PDF generado y descargado correctamente
            </p>
            <p className="text-xs text-green-600 mt-1">
              {totalPages} {totalPages === 1 ? "imagen convertida en 1 página" : `imágenes convertidas en ${totalPages} páginas`}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

      </div>
    </AppShell>
  );
}
