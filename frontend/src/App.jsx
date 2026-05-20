// frontend/src/App.jsx
import { useState } from "react";
import "./lib/pdfjs";
import "./services/api"; // ← activa el interceptor de fetch (Bearer token automático)

import { AuthProvider, useAuth } from "./context/AuthContext";

import AppShell from "./components/AppShell";
import ToolCard from "./components/ToolCard";

import LoginView          from "./views/LoginView";
import ChangePasswordView from "./views/ChangePasswordView";
import AdminView          from "./views/AdminView";

import MergeView          from "./views/MergeView";
import DeletePagesView    from "./views/DeletePagesView";
import ReorderPagesView   from "./views/ReorderPagesView";
import ExtractPagesView   from "./views/ExtractPagesView";
import StampSignatureView from "./views/StampSignatureView";
import CompressView       from "./views/CompressView";
import PdfToImageView     from "./views/PdfToImageView";

// ─── CATÁLOGO DE HERRAMIENTAS ──────────────────────────────────────────────
const TOOLS = [
  { key: "merge",    title: "Unir PDFs",          description: "Combina varios archivos PDF en uno solo",        enabled: true  },
  { key: "delete",   title: "Eliminar páginas",    description: "Quita páginas específicas de un PDF",           enabled: true  },
  { key: "reorder",  title: "Reordenar páginas",   description: "Cambia el orden de páginas de un PDF",          enabled: true  },
  { key: "extract",  title: "Extraer páginas",     description: "Crea un PDF nuevo con páginas seleccionadas",   enabled: true  },
  { key: "pdf2word", title: "PDF a Word",           description: "Próximamente",                                  enabled: false },
  { key: "word2pdf", title: "Word a PDF",           description: "Próximamente",                                  enabled: false },
  { key: "stamp",    title: "Firma visible",        description: "Coloca un sello/firma en cualquier posición",  enabled: true  },
  { key: "compress", title: "Comprimir PDF",        description: "Reduce el tamaño de un archivo PDF",           enabled: true  },
  { key: "pdf2image",title: "PDF a Imagen",         description: "Convierte páginas de un PDF a JPG, PNG o JPEG",enabled: true  },
];

// ─── PANTALLA DE CARGA ─────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Cargando…</p>
    </div>
  );
}

// ─── CONTENIDO PRINCIPAL ───────────────────────────────────────────────────
function AppContent() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState("home");
  const goHome = () => setView("home");

  // 1. Cargando token guardado
  if (loading) return <LoadingScreen />;

  // 2. Sin sesión → login
  if (!user) return <LoginView />;

  // 3. Primer login → cambio obligatorio de contraseña
  if (user.must_change_password) return <ChangePasswordView />;

  // 4. Panel de administración (solo admins)
  if (view === "admin") {
    if (user.role !== "admin") { setView("home"); return null; }
    return <AdminView onBack={goHome} />;
  }

  // 5. Vistas de herramientas
  switch (view) {
    case "merge":     return <MergeView onBack={goHome} />;
    case "delete":    return <DeletePagesView onBack={goHome} />;
    case "reorder":   return <ReorderPagesView onBack={goHome} />;
    case "extract":   return <ExtractPagesView onBack={goHome} />;
    case "stamp":     return <StampSignatureView onBack={goHome} />;
    case "compress":  return <CompressView onBack={goHome} />;
    case "pdf2image": return <PdfToImageView onBack={goHome} />;
    default: break;
  }

  // 6. Home — grid de herramientas
  return (
    <AppShell
      title="PDF HUB"
      subtitle="Herramientas para gestionar y editar PDFs"
      actions={
        <div className="flex items-center gap-2">
          {/* Botón admin — solo visible para usuarios con rol admin */}
          {user.role === "admin" && (
            <button
              onClick={() => setView("admin")}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Admin
            </button>
          )}

          {/* Email del usuario */}
          <span className="hidden md:block text-xs text-slate-500 truncate max-w-[180px]">
            {user.email}
          </span>

          {/* Botón cerrar sesión */}
          <button
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Salir
          </button>
        </div>
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
          Tip: si extraes páginas y luego quieres cambiar su orden, usa "Reordenar páginas".
        </p>
      </section>
    </AppShell>
  );
}

// ─── ENTRY POINT ───────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}