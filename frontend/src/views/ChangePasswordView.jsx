// frontend/src/views/ChangePasswordView.jsx
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

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
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

export default function ChangePasswordView() {
  const { token, updateAuth, logout } = useAuth();
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
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
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">

      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 shadow-lg mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Establece tu contraseña</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-xs">
          Por seguridad, debes crear una contraseña personal antes de usar la plataforma.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña temporal actual</label>
            <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
            <PasswordInput value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar nueva contraseña</label>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "Actualizando…" : "Establecer nueva contraseña"}
          </button>
        </form>

        <button onClick={logout} className="mt-5 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition">
          Cancelar y cerrar sesión
        </button>
      </div>
    </div>
  );
}
