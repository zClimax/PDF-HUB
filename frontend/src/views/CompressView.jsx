import { useState } from "react";
import AppShell from "../components/AppShell";
import { API_BASE } from "../services/api";

export default function CompressView({ onBack }) {
  const [file, setFile] = useState(null);
  const [nivel, setNivel] = useState("media");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  const formatSize = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";

  const handleComprimir = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResultado(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("nivel", nivel);

    try {
      const res = await fetch(`${API_BASE}/compress`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const reduccion = res.headers.get("x-Reduccion");
      const inputSize = res.headers.get("x-Input-Size");
      const outputSize = res.headers.get("x-Output-Size");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "comprimido.pdf";
      a.click();
      URL.revokeObjectURL(url);

      setResultado({ reduccion, inputSize, outputSize });
    } catch (err) {
      setError(err.message || "Error al comprimir el PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Comprimir PDF"
      subtitle="Reduce el tamaño de tu archivo PDF"
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
              {file.name} — {formatSize(file.size)}
            </p>
          )}
        </div>

        {/* Nivel de compresión */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Nivel de compresión
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "alta", label: "Alta calidad", desc: "Menor compresión" },
              { value: "media", label: "Balanceado", desc: "Recomendado" },
              { value: "baja", label: "Máx. compresión", desc: "Menor calidad" },
            ].map((op) => (
              <button
                key={op.value}
                onClick={() => setNivel(op.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  nivel === op.value
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
          onClick={handleComprimir}
          disabled={!file || loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Comprimiendo..." : "Comprimir y descargar"}
        </button>

        {/* Resultado */}
        {resultado && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-sm font-semibold text-green-800 mb-2"> PDF comprimido exitosamente</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Original</p>
                <p className="text-sm font-medium">{formatSize(resultado.inputSize)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Comprimido</p>
                <p className="text-sm font-medium">{formatSize(resultado.outputSize)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Reducción</p>
                <p className="text-sm font-bold text-green-700">{resultado.reduccion}%</p>
              </div>
            </div>
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
