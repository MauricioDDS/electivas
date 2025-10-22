import { useState, useEffect } from "react";

export default function AdminUsersModal({ token, authUrl, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    fetch(`${authUrl}/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Error ${res.status}`);
        }
        return res.json();
      })
      .then((list) => {
        setUsers(list);
      })
      .catch((err) => {
        console.error("AdminUsersModal error:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token, authUrl]);

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "ADMIN" ? "ESTUDIANTE" : "ADMIN";
    const action = newRole === "ADMIN" ? "hacer administrador" : "quitar privilegios de administrador";
    
    if (!confirm(`¿Estás seguro de que quieres ${action} a este usuario? Esta acción cambiará sus permisos en el sistema.`)) {
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${authUrl}/users/${userId}/role/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Error updating role");
      }
      // Update local state
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (e) {
      console.error("toggleRole error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (userId, isActive) => {
    setBusy(true);
    try {
      const res = await fetch(`${authUrl}/users/${userId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Error updating active flag");
      }
      // Update local state
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u)));
    } catch (e) {
      console.error("toggleActive error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="text-center py-8 text-foreground">
            Cargando usuarios...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="text-center py-8 text-red-500">
            Error: {error}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-foreground">
            Gestión de Usuarios
          </h2>
          <button onClick={onClose} className="text-white/60 hover:text-white/80 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">ID</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Usuario</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Email</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Rol</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Activo</th>
                  <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-3 py-2 text-sm text-foreground">{user.id}</td>
                    <td className="px-3 py-2 text-sm text-foreground">{user.username}</td>
                    <td className="px-3 py-2 text-sm text-foreground">{user.email}</td>
                    <td className="px-3 py-2 text-sm text-foreground">{user.role}</td>
                    <td className="px-3 py-2 text-sm text-foreground">{user.is_active ? "Sí" : "No"}</td>
                    <td className="px-3 py-2 text-sm flex gap-2">
                      <button
                        className="px-3 py-1 rounded-md bg-orange-600 text-white text-xs font-medium shadow-lg hover:bg-orange-700 transition"
                        onClick={() => toggleRole(user.id, user.role)}
                        disabled={busy}
                        title="Cambiar rol de administrador"
                      >
                        {user.role === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
                      </button>

                      <button
                        className="px-3 py-1 rounded-md bg-yellow-600 text-white text-xs font-medium shadow-lg hover:bg-yellow-700 transition"
                        onClick={() => toggleActive(user.id, user.is_active)}
                        disabled={busy}
                        title="Activar / Desactivar"
                      >
                        {user.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
