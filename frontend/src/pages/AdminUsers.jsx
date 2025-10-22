import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const AUTH_URL = window._env_?.VITE_AUTH_URL || import.meta.env.VITE_AUTH_URL || "http://localhost:8018/api/auth";

export default function AdminUsers() {
  const { token, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    // 1) validar me -> confirmar rol admin
    fetch(`${AUTH_URL}/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Error ${res.status}`);
        }
        return res.json();
      })
      .then((me) => {
        if (!mounted) return;
        if (me.role !== "ADMIN") {
          // no es admin -> redirigir a home
          window.location.href = "/";
          return;
        }
        // 2) si admin -> traer usuarios
        return fetch(`${AUTH_URL}/users/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then(async (res) => {
        if (!res) return; // redirigió
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.detail || `Error ${res.status}`);
        }
        const list = await res.json();
        if (mounted) setUsers(list);
      })
      .catch((err) => {
        console.error("AdminUsers error:", err);
        setError(err.message);
        if (err.message.includes("invalid") || err.message.includes("401")) {
          logout();
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => (mounted = false);
  }, [token]);

  async function toggleAdmin(userId, isAdminCurrently) {
    if (!token) return logout();

    const newRole = isAdminCurrently ? "ESTUDIANTE" : "ADMIN";
    try {
      const res = await fetch(`${AUTH_URL}/users/${userId}/role/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.detail || `Error ${res.status}`);
      }
      // actualizar lista localmente
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error(err);
      alert("Error cambiando rol: " + err.message);
    }
  }

  if (loading) return <div className="p-6">Cargando usuarios...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Administración de Usuarios</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">ID</th>
            <th>Email</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.id}</td>
              <td>{u.email}</td>
              <td>{u.username || `${u.first_name || ""} ${u.last_name || ""}`}</td>
              <td>{u.role}</td>
              <td>
                <button
                  onClick={() => toggleAdmin(u.id, u.role === "ADMIN")}
                  className="px-2 py-1 bg-blue-600 text-white rounded"
                >
                  {u.role === "ADMIN" ? "Quitar admin" : "Dar admin"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
