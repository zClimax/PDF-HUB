import { useMemo, useRef, useState } from "react";
import { pdfjsLib } from "../lib/pdfjs";
import { API_BASE } from "../services/api";
import FilePicker from "../components/FilePicker";

export default function StampSignatureView({ onBack }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [sigFile, setSigFile] = useState(null);

  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  const [pagePreview, setPagePreview] = useState(""); // dataURL
  const [sigPreview, setSigPreview] = useState("");   // dataURL

  // Posición normalizada (0..1), origen ABAJO-IZQ para el backend
  const [pos, setPos] = useState({ xNorm: 0.8, yNorm: 0.2 });

  // Tamaño del sello como % del ancho de la página
  const [widthNorm, setWidthNorm] = useState(0.25);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const previewRef = useRef(null);

  const sigWidthPercent = useMemo(() => Math.round(widthNorm * 100), [widthNorm]);

  const loadSigPreview = async (file) => {
    const reader = new FileReader();
    reader.onload = () => setSigPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const renderSelectedPage = async (file, idx) => {
    setStatus("Generando vista previa...");
    const reader = new FileReader();

    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

      setPageCount(pdf.numPages);

      const safeIdx = Math.min(Math.max(idx, 0), pdf.numPages - 1);
      const page = await pdf.getPage(safeIdx + 1);

      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      setPagePreview(canvas.toDataURL());
      setStatus("");
    };

    reader.readAsArrayBuffer(file);
  };

  const onPickPdf = async (file) => {
    setPdfFile(file);
    setPageIndex(0);
    setPos({ xNorm: 0.8, yNorm: 0.2 });
    await renderSelectedPage(file, 0);
  };

  const onPickSignature = async (file) => {
    setSigFile(file);
    await loadSigPreview(file);
  };

  const onClickPreview = (e) => {
    if (!previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // px desde izq
    const y = e.clientY - rect.top;  // px desde arriba

    const xNorm = Math.min(Math.max(x / rect.width, 0), 1);
    const yNormTop = Math.min(Math.max(y / rect.height, 0), 1);

    // Convertimos a origen abajo-izq:
    const yNorm = 1 - yNormTop;

    setPos({ xNorm, yNorm });
  };

  const goPage = async (nextIndex) => {
    if (!pdfFile) return;
    const clamped = Math.min(Math.max(nextIndex, 0), pageCount - 1);
    setPageIndex(clamped);
    await renderSelectedPage(pdfFile, clamped);
  };

  const handleUpload = async () => {
    if (!pdfFile) return alert("Selecciona un PDF");
    if (!sigFile) return alert("Selecciona una imagen de firma/sello");

    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("signature", sigFile);
    formData.append(
      "options",
      JSON.stringify({
        pageIndex,
        xNorm: pos.xNorm,
        yNorm: pos.yNorm,
        widthNorm,
      })
    );

    try {
      setLoading(true);
      setStatus("Firmando PDF...");

      const res = await fetch(`${API_BASE}/stamp-signature`, {
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
      a.download = "pdf_firmado.pdf";
      a.click();
      window.URL.revokeObjectURL(url);

      setStatus("PDF firmado generado correctamente");
    } catch (err) {
      console.error(err);
      setStatus("Error firmando PDF");
    } finally {
      setLoading(false);
    }
  };

  // Para dibujar el sello encima en el preview: DOM usa origen arriba-izq
  const stampStyle = useMemo(() => {
    if (!previewRef.current) return {};
    // En el preview, colocamos el centro del sello en el click
    const left = `${pos.xNorm * 100}%`;
    const top = `${(1 - pos.yNorm) * 100}%`;
    const width = `${widthNorm * 100}%`;
    return { left, top, width };
  }, [pos.xNorm, pos.yNorm, widthNorm]);

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <button
        onClick={onBack}
        className="mb-6 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
      >
        Volver
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-md max-w-5xl">
        <h2 className="text-2xl font-semibold mb-6">Firma visible (sello)</h2>

        <div className="flex flex-col gap-4">
          <FilePicker
            id="stamp-pdf"
            label="Seleccionar PDF"
            accept=".pdf"
            helper={pdfFile ? pdfFile.name : "Sin archivos seleccionados"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              onPickPdf(f);
            }}
          />

          <FilePicker
            id="stamp-sig"
            label="Seleccionar firma (PNG/JPG)"
            accept=".png,.jpg,.jpeg"
            helper={sigFile ? sigFile.name : "Sin archivos seleccionados"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              onPickSignature(f);
            }}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <p className="text-sm text-slate-600 mb-2">
              Haz click en el PDF para colocar el sello.
            </p>

            <div
              ref={previewRef}
              onClick={pagePreview ? onClickPreview : undefined}
              className="relative w-full overflow-hidden rounded-xl border bg-slate-50"
              style={{ cursor: pagePreview ? "crosshair" : "default" }}
            >
              {pagePreview ? (
                <img src={pagePreview} className="block w-full select-none" />
              ) : (
                <div className="p-10 text-sm text-slate-500">
                  Selecciona un PDF para ver la vista previa.
                </div>
              )}

              {pagePreview && sigPreview && (
                <img
                  src={sigPreview}
                  className="absolute select-none pointer-events-none opacity-90"
                  style={{
                    ...stampStyle,
                    transform: "translate(-50%, -50%)",
                  }}
                  alt="Sello"
                />
              )}
            </div>

            {pageCount > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  disabled={pageIndex <= 0 || loading}
                  onClick={() => goPage(pageIndex - 1)}
                >
                  ← Página
                </button>

                <div className="text-sm text-slate-600">
                  Página {pageIndex + 1} de {pageCount}
                </div>

                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  disabled={pageIndex >= pageCount - 1 || loading}
                  onClick={() => goPage(pageIndex + 1)}
                >
                  Página →
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border p-4 bg-white">
              <div className="text-sm font-medium mb-2">Tamaño del sello</div>

              <input
                type="range"
                min="0.10"
                max="0.50"
                step="0.01"
                value={widthNorm}
                onChange={(e) => setWidthNorm(Number(e.target.value))}
                className="w-full"
                disabled={!pagePreview || loading}
              />
              <div className="mt-1 text-sm text-slate-500">{sigWidthPercent}% del ancho</div>

              <button
                onClick={handleUpload}
                disabled={loading || !pdfFile || !sigFile}
                className={`mt-4 w-full py-3 rounded-lg text-white font-medium ${
                  loading ? "bg-gray-400" : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {loading ? "Procesando..." : "Descargar PDF firmado"}
              </button>

              {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
