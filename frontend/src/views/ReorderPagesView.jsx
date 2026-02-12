import { useState } from "react";
import { pdfjsLib } from "../lib/pdfjs";
import { API_BASE } from "../services/api";
import FilePicker from "../components/FilePicker";

export default function ReorderPagesView({ onBack }) {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // [{ originalIndex, pageNumber, thumb }]
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const generateThumbnails = async (selectedFile) => {
    setStatus("Generando miniaturas...");
    setPages([]);

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

      const thumbs = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        thumbs.push(canvas.toDataURL());
      }

      const pageItems = thumbs.map((thumb, i) => ({
        originalIndex: i,     // 0-based del PDF original
        pageNumber: i + 1,    // 1-based para UI
        thumb,
      }));

      setPages(pageItems);
      setStatus("");
    };

    fileReader.readAsArrayBuffer(selectedFile);
  };

  const movePage = (index, direction) => {
    const newPages = [...pages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPages.length) return;
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setPages(newPages);
  };

  const resetOrder = () => {
    const sorted = [...pages].sort((a, b) => a.originalIndex - b.originalIndex);
    setPages(sorted);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Selecciona un PDF");
      return;
    }
    if (!pages.length) {
      alert("No hay páginas para reordenar");
      return;
    }

    const order = pages.map((p) => p.originalIndex); // array 0-based

    const formData = new FormData();
    formData.append("file", file);
    formData.append("order", JSON.stringify(order));

    try {
      setLoading(true);
      setStatus("Procesando PDF...");

      const res = await fetch(`${API_BASE}/reorder-pages`, {
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
      a.download = "pdfreordenado.pdf";
      a.click();
      window.URL.revokeObjectURL(url);

      setStatus("PDF reordenado generado correctamente");
    } catch (err) {
      console.error(err);
      setStatus("Error reordenando PDF");
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
        <h2 className="text-2xl font-semibold mb-6">Reordenar páginas</h2>

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
            onClick={resetOrder}
            disabled={!pages.length || loading}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Resetear orden
          </button>

          <button
            onClick={handleUpload}
            disabled={!pages.length || loading}
            className={`px-4 py-2 rounded text-white disabled:opacity-50 ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Procesando..." : "Descargar PDF reordenado"}
          </button>
        </div>

        {status && <p className="text-sm text-gray-600 mb-4">{status}</p>}

        <div className="space-y-2">
          {pages.map((p, i) => (
            <div
              key={p.originalIndex}
              className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-2"
            >
              <div className="flex items-center gap-4">
                <img src={p.thumb} className="w-20 rounded border" />
                <div className="text-sm">
                  <div className="font-medium">Posición: {i + 1}</div>
                  <div className="text-gray-600">Página original: {p.pageNumber}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => movePage(i, -1)}
                  className="text-gray-500 hover:text-black"
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  onClick={() => movePage(i, 1)}
                  className="text-gray-500 hover:text-black"
                  title="Bajar"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
