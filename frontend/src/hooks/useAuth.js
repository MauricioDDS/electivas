import { useState, useEffect } from "react";

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  const AUTH_URL =
    window._env_?.VITE_AUTH_URL ||
    import.meta.env.VITE_AUTH_URL ||
    "http://localhost:8018/api/auth";

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const controller = new AbortController();

    fetch(`${AUTH_URL}/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Token inválido o expirado");
          }
          const errBody = await res.text();
          throw new Error(`Error ${res.status}: ${errBody}`);
        }
        return res.json();
      })
      .then((data) => setUser(data))
      .catch((err) => {
        console.warn("Auth check failed:", err.message);
        localStorage.removeItem("token");
        localStorage.removeItem("refresh");
        localStorage.removeItem("email");
        setToken(null);
        setUser(null);
      });

    return () => controller.abort();
  }, [token]);

  const login = (newToken, refresh, email) => {
    if (newToken) localStorage.setItem("token", newToken);
    if (refresh) localStorage.setItem("refresh", refresh);
    if (email) localStorage.setItem("email", email);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("email");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return { token, user, login, logout };
}
