import { useState } from "react";
import AppShell from "../components/AppShell";
import { API_BASE } from "../services/api";

export default function PdfToImageView({ onBack }) {
  const [file, setFile] = useState(null);
  const [formato, setFormato] = useState("jpg");
  const [dpi, setDpi] = useState("150");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const handleConvertir = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResultado(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("formato", formato);
    formData.append("dpi", dpi);

    try {
      const res = await fetch(`${API_BASE}/pdf-to-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const pageCount = res.headers.get("x-page-count");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Si es 1 página descarga imagen, si son varias descarga ZIP
      a.download = pageCount === "1"
        ? `pagina_1.${formato}`
        : "paginas.zip";

      a.click();
      URL.revokeObjectURL(url);

      setResultado({ pageCount: Number(pageCount) });
    } catch (err) {
      setError(err.message || "Error al convertir el PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="PDF a Imagen"
      subtitle="Convierte cada página de un PDF en imágenes"
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

        {/* Selección de archivo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Selecciona un PDF
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => { setFile(e.target.files[0]); setResultado(null); }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
          {file && (
            <p className="mt-2 text-xs text-slate-500">
              {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>

        {/* Formato de salida */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Formato de imagen
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "jpg",  label: "JPG",  desc: "Menor tamaño" },
              { value: "jpeg", label: "JPEG", desc: "Compatible" },
              { value: "png",  label: "PNG",  desc: "Sin pérdida" },
            ].map((op) => (
              <button
                key={op.value}
                onClick={() => setFormato(op.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  formato === op.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-medium text-slate-800">{op.label}</p>
                <p className="text-xs text-slate-500">{op.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Resolución DPI */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Resolución (DPI)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "72",  label: "72 DPI",  desc: "Web / vista previa" },
              { value: "150", label: "150 DPI", desc: "Recomendado" },
              { value: "300", label: "300 DPI", desc: "Alta calidad" },
            ].map((op) => (
              <button
                key={op.value}
                onClick={() => setDpi(op.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  dpi === op.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-medium text-slate-800">{op.label}</p>
                <p className="text-xs text-slate-500">{op.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Botón */}
        <button
          onClick={handleConvertir}
          disabled={!file || loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Convirtiendo..." : "Convertir y descargar"}
        </button>

        {/* Resultado */}
        {resultado && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-semibold text-green-800 mb-1">
               Conversión exitosa
            </p>
            <p className="text-sm text-green-700">
              {resultado.pageCount === 1
                ? `Se descargó 1 imagen en formato ${formato.toUpperCase()}.`
                : `Se descargaron ${resultado.pageCount} imágenes en un archivo ZIP.`}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            💡 PDFs con varias páginas se descargan como <strong>ZIP</strong>.
            Para alta resolución imprimible usa <strong>300 DPI</strong>.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Los DPI (Dots Per Inch o Puntos Por Pulgada) 
            indican la densidad de puntos de tinta que una impresora coloca en una pulgada física de papel. <strong>Miden la calidad y resolución de impresión</strong>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}