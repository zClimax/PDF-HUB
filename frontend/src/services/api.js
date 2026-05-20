// frontend/src/services/api.js
export const API_BASE = "https://pdf.estrellaguia.mx";
 
// ─── INTERCEPTOR DE FETCH ──────────────────────────────────────────────────
// Agrega automáticamente el header Authorization: Bearer <token> a todas las
// llamadas al backend. Así las vistas existentes no necesitan ningún cambio.
(function setupAuthInterceptor() {
  const _fetch = window.fetch.bind(window);
 
  window.fetch = async function (url, options = {}) {
    const urlStr = typeof url === "string" ? url : url?.url ?? String(url);
 
    if (urlStr.startsWith(API_BASE)) {
      const token = localStorage.getItem("pdf_hub_token");
      if (token) {
        options = {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        };
      }
    }
 
    return _fetch(url, options);
  };
})();
 