// frontend/src/views/AdminView.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../services/api";

// ─── ICONOS ────────────────────────────────────────────────────────────────
const IconBack    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>;
const IconPlus    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>;
const IconReset   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
const IconEdit    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
const IconTrash   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
const IconCopy    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>;
const IconCheck   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>;

// ─── COMPONENTE: Badge de rol ───────────────────────────────────────────────
function RoleBadge({ role }) {
  return role === "admin"
    ? <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">Admin</span>
    : <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Usuario</span>;
}

// ─── COMPONENTE: Badge de estado ────────────────────────────────────────────
function StatusBadge({ active }) {
  return active
    ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Activo</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Inactivo</span>;
}

// ─── COMPONENTE: Alerta de contraseña temporal ──────────────────────────────
function TempPasswordAlert({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(data.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">
            {data.action === "reset" ? "Contraseña reseteada" : "Usuario creado"} — guarda esta contraseña
          </p>
          <p className="mt-0.5 text-xs text-green-700">
            El usuario <strong>{data.email}</strong> deberá cambiarla en su primer inicio de sesión.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white border border-green-200 px-3 py-2 text-sm font-mono text-slate-800 select-all">
              {data.password}
            </code>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition"
            >
              {copied ? <><IconCheck /><span>Copiado</span></> : <><IconCopy /><span>Copiar</span></>}
            </button>
          </div>
        </div>
        <button onClick={onClose} className="text-green-500 hover:text-green-700 mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export default function AdminView({ onBack }) {
  const { user: currentUser } = useAuth();

  const [users, setUsers]             = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pageError, setPageError]     = useState("");

  // Alerta de contraseña temporal
  const [tempAlert, setTempAlert]     = useState(null);

  // Formulario: crear usuario
  const [showCreate, setShowCreate]   = useState(false);
  const [newEmail, setNewEmail]       = useState("");
  const [newRole, setNewRole]         = useState("user");
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");

  // Modal: editar usuario
  const [editUser, setEditUser]       = useState(null); // { id, email, role }
  const [editEmail, setEditEmail]     = useState("");
  const [editRole, setEditRole]       = useState("user");
  const [saving, setSaving]           = useState(false);
  const [editError, setEditError]     = useState("");

  // Modal: confirmar eliminar
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // Estados de carga por acción individual
  const [loadingId, setLoadingId]     = useState(null);

  // ─── Cargar usuarios ──────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setPageError("");
    try {
      const res = await fetch(`${API_BASE}/admin/users`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      setPageError(err.message || "Error al cargar usuarios.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ─── Crear usuario ────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error); return; }

      setTempAlert({ email: data.email, password: data.temp_password, action: "created" });
      setShowCreate(false);
      setNewEmail("");
      setNewRole("user");
      fetchUsers();
    } catch {
      setCreateError("Error de conexión.");
    } finally {
      setCreating(false);
    }
  }

  // ─── Editar usuario ───────────────────────────────────────────────────────
  function openEdit(u) {
    setEditUser(u);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditError("");
  }

  async function handleEdit(e) {
    e.preventDefault();
    setEditError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail, role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error); return; }
      setEditUser(null);
      fetchUsers();
    } catch {
      setEditError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Toggle estado ────────────────────────────────────────────────────────
  async function handleToggleStatus(u) {
    setLoadingId(u.id + "-status");
    try {
      const res = await fetch(`${API_BASE}/admin/users/${u.id}/status`, { method: "PATCH" });
      if (res.ok) fetchUsers();
    } finally {
      setLoadingId(null);
    }
  }

  // ─── Reset contraseña ─────────────────────────────────────────────────────
  async function handleReset(u) {
    setLoadingId(u.id + "-reset");
    try {
      const res = await fetch(`${API_BASE}/admin/users/${u.id}/reset`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTempAlert({ email: data.email, password: data.temp_password, action: "reset" });
        fetchUsers();
      }
    } finally {
      setLoadingId(null);
    }
  }

  // ─── Eliminar usuario ─────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        fetchUsers();
      }
    } finally {
      setDeleting(false);
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition"
          >
            <IconBack /> Volver
          </button>
          <span className="text-slate-300">|</span>
          <h1 className="text-base font-semibold text-slate-900">Panel de administración</h1>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(""); }}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          <IconPlus /> Nuevo usuario
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Alerta contraseña temporal */}
        {tempAlert && (
          <TempPasswordAlert data={tempAlert} onClose={() => setTempAlert(null)} />
        )}

        {/* Error de página */}
        {pageError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{pageError}</p>
          </div>
        )}

        {/* Formulario: crear usuario */}
        {showCreate && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <h2 className="text-sm font-semibold text-indigo-900 mb-4">Nuevo usuario</h2>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="correo@estrellaguia.mx"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {creating ? "Creando…" : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
            {createError && (
              <p className="mt-2 text-xs text-red-600">{createError}</p>
            )}
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Usuarios</h2>
            <span className="text-xs text-slate-400">{users.length} {users.length === 1 ? "usuario" : "usuarios"}</span>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-16">No hay usuarios registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Correo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Rol</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">{u.email}</div>
                          {u.must_change_password === 1 && (
                            <div className="text-xs text-amber-600 mt-0.5">Pendiente cambio de contraseña</div>
                          )}
                          {isSelf && (
                            <div className="text-xs text-indigo-500 mt-0.5">Tú</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3.5"><StatusBadge active={u.is_active} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">

                            {/* Editar */}
                            {!isSelf && (
                              <button
                                onClick={() => openEdit(u)}
                                title="Editar"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <IconEdit />
                              </button>
                            )}

                            {/* Reset contraseña */}
                            {!isSelf && (
                              <button
                                onClick={() => handleReset(u)}
                                disabled={loadingId === u.id + "-reset"}
                                title="Resetear contraseña"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-40 transition"
                              >
                                <IconReset />
                              </button>
                            )}

                            {/* Habilitar / Deshabilitar */}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={loadingId === u.id + "-status"}
                                title={u.is_active ? "Deshabilitar" : "Habilitar"}
                                className={`p-1.5 rounded-lg disabled:opacity-40 transition ${
                                  u.is_active
                                    ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    : "text-slate-400 hover:text-green-600 hover:bg-green-50"
                                }`}
                              >
                                {u.is_active ? (
                                  // Icono deshabilitar (ojo cerrado)
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                  </svg>
                                ) : (
                                  // Icono habilitar (check)
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                )}
                              </button>
                            )}

                            {/* Eliminar */}
                            {!isSelf && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                title="Eliminar"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              >
                                <IconTrash />
                              </button>
                            )}

                            {isSelf && (
                              <span className="text-xs text-slate-300 px-2">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: editar usuario */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5">Editar usuario</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
              <IconTrash />
            </div>
            <h2 className="text-base font-semibold text-slate-900 text-center mb-1">Eliminar usuario</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              ¿Eliminar a <strong>{deleteTarget.email}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}