import { useState } from "react";

export default function AdminUserModal({ user, token, authUrl, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${authUrl}/users/${user.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Error saving user");
      }
      const updated = await res.json();
      onSaved(updated);
    } catch (e) {
      console.error("save user error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card p-6 rounded w-full max-w-lg">
        <h3 className="text-lg font-bold mb-4">Usuario #{user.id} — {user.email}</h3>

        <label className="block text-sm text-gray-300">Nombre</label>
        <input
          className="w-full p-2 mb-3 rounded bg-input border"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <label className="block text-sm text-gray-300">Apellido</label>
        <input
          className="w-full p-2 mb-3 rounded bg-input border"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded bg-gray-700 text-white" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="px-3 py-2 rounded bg-orange-600 text-white" onClick={save} disabled={busy}>
            {busy ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
