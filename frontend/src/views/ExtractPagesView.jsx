import { useState } from "react";
import { pdfjsLib } from "../lib/pdfjs";
import { API_BASE } from "../services/api";
import FilePicker from "../components/FilePicker";

export default function ExtractPagesView({ onBack }) {
  const [file, setFile] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]); // 1-based en UI
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [thumbnails, setThumbnails] = useState([]);

  const generateThumbnails = async (selectedFile) => {
    setStatus("Generando miniaturas...");
    setThumbnails([]);
    setSelectedPages([]);

    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

      const thumbs = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        thumbs.push(canvas.toDataURL());
      }

      setThumbnails(thumbs);
      setStatus("");
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const togglePage = (page) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    );
  };

  const clearSelection = () => setSelectedPages([]);

  const selectAll = () => {
    const all = thumbnails.map((_, i) => i + 1);
    setSelectedPages(all);
  };

  const handleUpload = async () => {
    if (!file) return alert("Selecciona un PDF");
    if (selectedPages.length === 0) return alert("Selecciona páginas a extraer");

    const formData = new FormData();
    formData.append("file", file);

    // Convertimos a 0-based para el backend
    formData.append("pages", JSON.stringify(selectedPages.map((p) => p - 1)));

    try {
      setLoading(true);
      setStatus("Extrayendo páginas...");

      const res = await fetch(`${API_BASE}/extract-pages`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pdfextraido.pdf";
      a.click();
      window.URL.revokeObjectURL(url);

      setStatus("PDF extraído generado correctamente");
    } catch (e) {
      console.error(e);
      setStatus("Error extrayendo páginas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <button
        onClick={onBack}
        className="mb-6 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >
        Volver
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-md max-w-4xl">
        <h2 className="text-2xl font-semibold mb-6">Extraer páginas</h2>

        <FilePicker
        id="extract-file"
        label="Seleccionar archivo"
        accept=".pdf"
        onChange={(e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        generateThumbnails(selected);
        }}
        helper={file ? file.name : "Sin archivos seleccionados"}
        />


        <div className="flex gap-3 mb-4">
          <button
            onClick={selectAll}
            disabled={!thumbnails.length || loading}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Seleccionar todas
          </button>
          <button
            onClick={clearSelection}
            disabled={!selectedPages.length || loading}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Limpiar selección
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || !selectedPages.length}
            className={`px-4 py-2 rounded text-white disabled:opacity-50 ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Procesando..." : `Descargar (${selectedPages.length})`}
          </button>
        </div>

        {status && <p className="text-sm text-gray-600 mb-4">{status}</p>}

        <div className="grid grid-cols-4 gap-4 my-4">
          {thumbnails.map((thumb, i) => {
            const page = i + 1;
            const selected = selectedPages.includes(page);

            return (
              <div
                key={i}
                onClick={() => togglePage(page)}
                className={`cursor-pointer border rounded-lg p-2 transition ${
                  selected ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <img src={thumb} className="w-full rounded" />
                <p className="text-center text-sm mt-2">Página {page}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
