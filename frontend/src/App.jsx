import { useState } from "react";
import "./lib/pdfjs";

import AppShell from "./components/AppShell";
import ToolCard from "./components/ToolCard";

import MergeView from "./views/MergeView";
import DeletePagesView from "./views/DeletePagesView";
import ReorderPagesView from "./views/ReorderPagesView";
import ExtractPagesView from "./views/ExtractPagesView";
import StampSignatureView from "./views/StampSignatureView";


const TOOLS = [
  {
    key: "merge",
    title: "Unir PDFs",
    description: "Combina varios archivos PDF en uno solo",
    enabled: true,
  },
  {
    key: "delete",
    title: "Eliminar páginas",
    description: "Quita páginas específicas de un PDF",
    enabled: true,
  },
  {
    key: "reorder",
    title: "Reordenar páginas",
    description: "Cambia el orden de páginas de un PDF",
    enabled: true,
  },
  {
    key: "extract",
    title: "Extraer páginas",
    description: "Crea un PDF nuevo con páginas seleccionadas",
    enabled: true,
  },
  {
    key: "pdf2word",
    title: "PDF a Word",
    description: "Próximamente",
    enabled: false,
  },
  {
    key: "word2pdf",
    title: "Word a PDF",
    description: "Próximamente",
    enabled: false,
  },
  {
  key: "stamp",
  title: "Firma visible",
  description: "Coloca un sello/firma en cualquier posición",
  enabled: true,
},

];

export default function App() {
  const [view, setView] = useState("home");
  const goHome = () => setView("home");

  switch (view) {
    case "merge":
      return <MergeView onBack={goHome} />;
    case "delete":
      return <DeletePagesView onBack={goHome} />;
    case "reorder":
      return <ReorderPagesView onBack={goHome} />;
    case "extract":
      return <ExtractPagesView onBack={goHome} />;
    case "stamp":
      return <StampSignatureView onBack={goHome} />;
    default:
      break;
      
  }

  return (
    <AppShell
      title="PDF HUB"
      subtitle="Herramientas locales para unir y editar PDFs"
      actions={
        <span className="hidden sm:inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
          Local
        </span>
      }
    >
      <section className="mb-6">
        <h2 className="text-base font-semibold text-slate-900">Herramientas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Selecciona una opción. Los archivos se procesan y se descargan al momento.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((t) => (
          <ToolCard
            key={t.key}
            title={t.title}
            description={t.description}
            disabled={!t.enabled}
            onClick={() => (t.enabled ? setView(t.key) : undefined)}
          />
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Tip: si extraes páginas y luego quieres cambiar su orden, usa “Reordenar páginas”.
        </p>
      </section>
    </AppShell>
  );
}
