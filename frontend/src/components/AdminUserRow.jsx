import { useState } from "react";

export default function AdminUserRow({ user, token, authUrl, onView, onUpdated }) {
  const [busy, setBusy] = useState(false);

  const toggleRole = async () => {
    setBusy(true);
    const newRole = user.role === "ADMIN" ? "ESTUDIANTE" : "ADMIN";
    try {
      const res = await fetch(`${authUrl}/users/${user.id}/role/`, {
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
      onUpdated();
    } catch (e) {
      console.error("toggleRole error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${authUrl}/users/${user.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Error updating active flag");
      }
      onUpdated();
    } catch (e) {
      console.error("toggleActive error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar usuario? Esta acción no es reversible.")) return;
    setBusy(true);
    try {
      const res = await fetch(`${authUrl}/users/${user.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (![200, 204].includes(res.status)) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Error deleting user");
      }
      onUpdated();
    } catch (e) {
      console.error("delete error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-sm">{user.id}</td>
      <td className="px-3 py-2 text-sm">{user.username}</td>
      <td className="px-3 py-2 text-sm">{user.email}</td>
      <td className="px-3 py-2 text-sm">{user.role}</td>
      <td className="px-3 py-2 text-sm">{user.is_active ? "Sí" : "No"}</td>
      <td className="px-3 py-2 text-sm flex gap-2">
        <button
          className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
          onClick={() => onView(user)}
          disabled={busy}
        >
          Ver / Editar
        </button>

        <button
          className="px-2 py-1 rounded bg-green-600 text-white text-xs"
          onClick={toggleRole}
          disabled={busy}
          title="Alternar rol"
        >
          {user.role === "ADMIN" ? "Quitar Admin" : "Hacer Admin"}
        </button>

        <button
          className="px-2 py-1 rounded bg-yellow-600 text-white text-xs"
          onClick={toggleActive}
          disabled={busy}
          title="Activar / Desactivar"
        >
          {user.is_active ? "Desactivar" : "Activar"}
        </button>

        <button
          className="px-2 py-1 rounded bg-red-600 text-white text-xs"
          onClick={handleDelete}
          disabled={busy}
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}
