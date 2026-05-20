// frontend/src/views/ProfileView.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../services/api";

const IconEye = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const IconEyeOff = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
  </svg>
);

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        tabIndex={-1}
      >
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

export default function ProfileView({ onBack }) {
  const { user, token, updateAuth } = useAuth();
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPwd !== confirm) { setError("Las contraseñas nuevas no coinciden."); return; }
    if (newPwd.length < 8)  { setError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    if (current === newPwd) { setError("La nueva contraseña debe ser diferente a la actual."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: current, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al cambiar la contraseña."); return; }
      updateAuth(data.token, data.user);
      setSuccess(true);
      setCurrent(""); setNewPwd(""); setConfirm("");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Volver
        </button>
        <span className="text-slate-300">|</span>
        <h1 className="text-base font-semibold text-slate-900">Mi perfil</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Info del usuario */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-600">
                {user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.email}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                user.role === "admin"
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {user.role === "admin" ? "Administrador" : "Usuario"}
              </span>
            </div>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-5">Cambiar contraseña</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña actual</label>
              <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
              <PasswordInput value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar nueva contraseña</label>
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <p className="text-sm text-green-700 font-medium">✓ Contraseña actualizada correctamente.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
