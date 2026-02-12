import { useState } from "react";
import "./lib/pdfjs"; // inicializa el worker una vez

import ToolCard from "./components/ToolCard";
import MergeView from "./views/MergeView";
import DeletePagesView from "./views/DeletePagesView";
import ReorderPagesView from "./views/ReorderPagesView";
import ExtractPagesView from "./views/ExtractPagesView";

export default function App() {
  const [view, setView] = useState("home");

  if (view === "merge") return <MergeView onBack={() => setView("home")} />;
  if (view === "delete") return <DeletePagesView onBack={() => setView("home")} />;
  if (view === "reorder") return <ReorderPagesView onBack={() => setView("home")} />;
  if (view === "extract") return <ExtractPagesView onBack={() => setView("home")} />;
  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-4xl font-bold mb-8">Herramientas PDF Internas</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ToolCard
          title="Unir PDFs"
          description="Combina varios archivos PDF en uno solo"
          onClick={() => setView("merge")}
        />
        <ToolCard
          title="PDF a Word"
          description="Próximamente"
          onClick={() => {}}
        />
        <ToolCard
          title="Word a PDF"
          description="Próximamente"
          onClick={() => {}}
        />
        <ToolCard
          title="Eliminar páginas"
          description="Borra páginas específicas de un PDF"
          onClick={() => setView("delete")}
        />
        <ToolCard
         title="Reordenar páginas"
         description="Cambia el orden de páginas de un PDF"
        onClick={() => setView("reorder")}
        />
        <ToolCard
        title="Extraer páginas"
        description="Crea un nuevo PDF con las páginas seleccionadas"
        onClick={() => setView("extract")}
        />
      </div>
    </div>
  );
}
