import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;



/* ========= COMPONENTE TARJETA ========= */
function ToolCard({ title, description, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow hover:shadow-lg cursor-pointer transition border"
    >
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-gray-500 mt-2">{description}</p>
    </div>
  );
}

/* ========= VISTA UNIR PDF ========= */
function MergeView({ onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList) => {
    const pdfs = Array.from(fileList).filter(
      (f) => f.type === "application/pdf"
    );
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const moveFile = (index, direction) => {
    const newFiles = [...files];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= newFiles.length) return;

    [newFiles[index], newFiles[targetIndex]] =
      [newFiles[targetIndex], newFiles[index]];

    setFiles(newFiles);
  };

  const handleUpload = async () => {
    if (!files.length) return;

    setLoading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("http://localhost:5000/merge", {
        method: "POST",
        body: formData
      });

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "unido.pdf";
      a.click();

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

        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-black"
        >
          ← Volver
        </button>

        <div className="bg-white rounded-2xl shadow-sm border p-8">

          <h2 className="text-2xl font-semibold mb-6">
            Unir PDFs
          </h2>

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
            className={`border-2 border-dashed rounded-xl p-12 text-center transition
            ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
            `}
          >
            <p className="text-gray-600">
              Arrastra tus PDFs aquí
            </p>

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
                key={i}
                className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-2"
              >
                <span className="text-sm">{f.name}</span>

                <div className="flex gap-2">

                  <button
                    onClick={() => moveFile(i, -1)}
                    className="text-gray-500 hover:text-black"
                  >
                    ↑
                  </button>

                  <button
                    onClick={() => moveFile(i, 1)}
                    className="text-gray-500 hover:text-black"
                  >
                    ↓
                  </button>

                  <button
                    onClick={() =>
                      setFiles(files.filter((_, idx) => idx !== i))
                    }
                    className="text-red-500 hover:text-red-700"
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
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Procesando..." : "Unir archivos"}
          </button>

        </div>
      </div>
    </div>
  );
}

/* ========= VISTA ELIMINAR PAGINAS ========= */
function DeletePagesView({ onBack }) {

  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [thumbnails, setThumbnails] = useState([]);


const generateThumbnails = async (file) => {

  const fileReader = new FileReader();

  fileReader.onload = async function () {

    const typedarray = new Uint8Array(this.result);

    const pdf = await pdfjsLib.getDocument({
      data: typedarray
    }).promise;

    const thumbs = [];

    for (let i = 1; i <= pdf.numPages; i++) {

      const page = await pdf.getPage(i);

      const viewport = page.getViewport({ scale: 0.4 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      thumbs.push(canvas.toDataURL());
    }

    setThumbnails(thumbs);
    setPageCount(pdf.numPages);
  };

  fileReader.readAsArrayBuffer(file);
};


  /* ===== OBTENER INFO DEL PDF ===== */
  const loadPDFInfo = async (selectedFile) => {

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {

      const res = await fetch(
        "http://localhost:5000/pdf-info",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await res.json();

      setPageCount(data.pages);
      setSelectedPages([]);

    } catch (error) {
      console.error(error);
      setStatus("Error leyendo PDF ❌");
    }
  };

  /* ===== SUBIR PDF EDITADO ===== */
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

      formData.append(
      "pages",
       JSON.stringify(
    selectedPages.map(p => p - 1)
     )
    );

    try {

      setLoading(true);
      setStatus("Procesando PDF...");

      const res = await fetch(
        "http://localhost:5000/delete-pages",
        {
          method: "POST",
          body: formData
        }
      );

      if (!res.ok) throw new Error();

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "pdf_editado.pdf";
      a.click();

      setStatus("PDF generado correctamente ✅");

    } catch (error) {
      console.error(error);
      setStatus("Error procesando PDF ❌");

    } finally {
      setLoading(false);
    }
  };

  /* ===== UI ===== */
  return (
    <div className="min-h-screen bg-gray-100 p-10">

      <button
        onClick={onBack}
        className="mb-6 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >
        ← Volver
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-md max-w-3xl">

        <h2 className="text-2xl font-semibold mb-6">
          Eliminar páginas de PDF
        </h2>

        {/* INPUT ARCHIVO */}
        <input
          type="file"
          accept=".pdf"
          className="mb-4"
          onChange={(e) => {
            const selected = e.target.files[0];
            setFile(selected);
          generateThumbnails(selected);
          }}
        />

        {/* GRID PAGINAS */}
<div className="grid grid-cols-4 gap-4 my-4">

  {thumbnails.map((thumb, i) => {

    const page = i + 1;
    const selected = selectedPages.includes(page);

    return (
      <div
        key={i}
        onClick={() => {

          if (selected) {
            setSelectedPages(
              selectedPages.filter(p => p !== page)
            );
          } else {
            setSelectedPages([
              ...selectedPages,
              page
            ]);
          }
        }}
        className={`cursor-pointer border rounded-lg p-2 transition ${
          selected
            ? "border-red-500 bg-red-50"
            : "hover:bg-gray-50"
        }`}
      >
        <img
          src={thumb}
          className="w-full rounded"
        />

        <p className="text-center text-sm mt-2">
          Página {page}
        </p>
      </div>
    );
  })}

</div>


        {/* BOTON */}
        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-medium ${
            loading
              ? "bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading
            ? "Procesando..."
            : "Eliminar páginas seleccionadas"}
        </button>

        {status && (
          <p className="mt-4 text-center text-sm">
            {status}
          </p>
        )}

      </div>
    </div>
  );
}




/* ========= APP PRINCIPAL ========= */
export default function App() {
  const [view, setView] = useState("home");

  if (view === "merge") {
    return <MergeView onBack={() => setView("home")} />;
  }
if (view === "delete") {
  return <DeletePagesView onBack={() => setView("home")} />;
}
  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-4xl font-bold mb-8">
        Herramientas PDF Internas
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ToolCard
          title="Unir PDFs"
          description="Combina varios archivos PDF en uno solo"
          onClick={() => setView("merge")}
        />

        <ToolCard
          title="PDF a Word"
          description="Próximamente"
        />

        <ToolCard
          title="Word a PDF"
          description="Próximamente"
        />
        <ToolCard
          title="Eliminar páginas"
          description="Borra páginas específicas de un PDF"
          onClick={() => setView("delete")}
        />
      </div>
    </div>
  );
}
