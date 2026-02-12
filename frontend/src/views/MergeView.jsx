import { useState } from "react";
import { API_BASE } from "../services/api";
import FilePicker from "../components/FilePicker";

export default function MergeView({ onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList) => {
    const pdfs = Array.from(fileList).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const moveFile = (index, direction) => {
    const newFiles = [...files];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setFiles(newFiles);
  };

  const handleUpload = async () => {
    if (!files.length) return;

    setLoading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch(`${API_BASE}/merge`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "unido.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error al unir archivos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-10">
      <div className="w-full max-w-3xl">
        <button onClick={onBack} className="mb-6 text-gray-600 hover:text-black">
          Volver
        </button>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h2 className="text-2xl font-semibold mb-6">Unir PDFs</h2>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
          >
            <p className="text-gray-600">Arrastra tus PDFs aquí</p>

            <label className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
              Seleccionar archivos
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-6 space-y-2">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-2"
              >
                <span className="text-sm">{f.name}</span>

                <div className="flex gap-2">
                  <button
                    onClick={() => moveFile(i, -1)}
                    className="text-gray-500 hover:text-black"
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveFile(i, 1)}
                    className="text-gray-500 hover:text-black"
                    title="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700"
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className={`mt-6 w-full text-white py-3 rounded-xl hover:bg-blue-700 ${
              loading ? "bg-gray-400" : "bg-blue-600"
            }`}
          >
            {loading ? "Procesando..." : "Unir archivos"}
          </button>
        </div>
      </div>
    </div>
  );
}
