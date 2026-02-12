import { useState } from "react";
import { pdfjsLib } from "../lib/pdfjs";
import { API_BASE } from "../services/api";
import FilePicker from "../components/FilePicker";

export default function DeletePagesView({ onBack }) {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [thumbnails, setThumbnails] = useState([]);

  const generateThumbnails = async (selectedFile) => {
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

      setThumbnails(thumbs);
      setPageCount(pdf.numPages);
      setSelectedPages([]);
      setStatus("");
    };

    fileReader.readAsArrayBuffer(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Selecciona un PDF");
      return;
    }
    if (selectedPages.length === 0) {
      alert("Selecciona páginas a eliminar");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pages", JSON.stringify(selectedPages.map((p) => p - 1)));

    try {
      setLoading(true);
      setStatus("Procesando PDF...");

      const res = await fetch(`${API_BASE}/delete-pages`, {
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
      a.download = "pdfeditado.pdf";
      a.click();
      window.URL.revokeObjectURL(url);

      setStatus("PDF generado correctamente");
    } catch (error) {
      console.error(error);
      setStatus("Error procesando PDF");
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

      <div className="bg-white p-8 rounded-2xl shadow-md max-w-3xl">
        <h2 className="text-2xl font-semibold mb-6">Eliminar páginas de PDF</h2>

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


        {!!pageCount && (
          <div className="grid grid-cols-4 gap-4 my-4">
            {thumbnails.map((thumb, i) => {
              const page = i + 1;
              const selected = selectedPages.includes(page);

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (selected) {
                      setSelectedPages(selectedPages.filter((p) => p !== page));
                    } else {
                      setSelectedPages([...selectedPages, page]);
                    }
                  }}
                  className={`cursor-pointer border rounded-lg p-2 transition ${
                    selected ? "border-red-500 bg-red-50" : "hover:bg-gray-50"
                  }`}
                  title={`Página ${page}`}
                >
                  <img src={thumb} className="w-full rounded" />
                  <p className="text-center text-sm mt-2">Página {page}</p>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-medium ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Procesando..." : "Eliminar páginas seleccionadas"}
        </button>

        {status && <p className="mt-4 text-center text-sm">{status}</p>}
      </div>
    </div>
  );
}
