// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // true mientras valida el token guardado

  // Al montar: revisar si hay un token guardado en localStorage y validarlo
  useEffect(() => {
    const saved = localStorage.getItem("pdf_hub_token");
    if (!saved) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Token inválido");
        return r.json();
      })
      .then(({ user }) => {
        setToken(saved);
        setUser(user);
      })
      .catch(() => {
        localStorage.removeItem("pdf_hub_token");
      })
      .finally(() => setLoading(false));
  }, []);

  // Guardar sesión tras login exitoso
  const login = useCallback((tokenVal, userData) => {
    localStorage.setItem("pdf_hub_token", tokenVal);
    setToken(tokenVal);
    setUser(userData);
  }, []);

  // Cerrar sesión: invalida el token en el servidor y limpia el estado
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    localStorage.removeItem("pdf_hub_token");
    setToken(null);
    setUser(null);
  }, [token]);

  // Actualizar sesión tras cambio de contraseña (nuevo token emitido por el backend)
  const updateAuth = useCallback((newToken, userData) => {
    localStorage.setItem("pdf_hub_token", newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}