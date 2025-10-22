import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import AdminUsersModal from "@/components/AdminUsersModal";

const AUTH_URL =
  window._env_?.VITE_AUTH_URL ||
  import.meta.env.VITE_AUTH_URL

export default function Profile() {
  const { token, user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(user || null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Admin-specific state
  const [recentUsers, setRecentUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Function to fetch recent users for admin
  const fetchRecentUsers = async (userRole) => {
    if (!token || userRole !== "ADMIN") return;
    
    setLoadingUsers(true);
    try {
      const res = await fetch(`${AUTH_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const users = await res.json();
        // Sort by ID descending (assuming higher ID = more recent) and take first 3
        const sortedUsers = users.sort((a, b) => b.id - a.id).slice(0, 3);
        setRecentUsers(sortedUsers);
      }
    } catch (err) {
      console.error("Error fetching recent users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user) {
      setMe(user);
      // Only set initial values if they're empty to avoid overriding user input
      if (!firstName) setFirstName(user.first_name || "");
      if (!lastName) setLastName(user.last_name || "");
      return;
    }

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    fetch(`${AUTH_URL}/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setMe(data);
        // Only set initial values if they're empty to avoid overriding user input
        if (!firstName) setFirstName(data.first_name || "");
        if (!lastName) setLastName(data.last_name || "");
        
        // Fetch recent users if admin
        if (data.role === "ADMIN") {
          fetchRecentUsers(data.role);
        }
      })
      .catch((err) => {
        console.error("Error fetching profile:", err);
        // si token inválido forzamos logout
        logout();
      })
      .finally(() => setLoading(false));
  }, [token, user, logout]);

  const hasChanges =
    (me?.first_name || "") !== (firstName || "") ||
    (me?.last_name || "") !== (lastName || "");

  async function handleSave(e) {
    e.preventDefault();
    if (!token) return logout();

    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch(`${AUTH_URL}/me/`, {
        method: "PATCH", // important trailing slash on URL
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const text = await res.text();
      let body;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { raw: text };
      }

      if (!res.ok) {
        console.error("PATCH error body:", body);
        const errMsg = body.detail || body.message || text || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      // success
      const updated = body;
      setMe(updated);
      setMessage("Nombre actualizado correctamente.");

      if (login && typeof login === "function") {
        // simple trigger: keep token same to re-run useAuth effect
        login(token);
      }
    } catch (err) {
      console.error("Save profile error:", err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-4xl mx-auto p-6">Cargando perfil...</div>
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
          >
            ← Inicio
          </a>
          <h1 className="text-lg font-bold">Mi Perfil</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left column: profile and admin cards */}
          <div className="col-span-1 space-y-6">
            {/* Profile card */}
            <section className="bg-card rounded-2xl p-6 shadow-lg border">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-white font-bold text-xl">
                  {me.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{me.username}</h2>
                  <p className="text-sm text-muted-foreground">{me.email}</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Nombre</label>
                  <input
                    className="w-full rounded-md border px-3 py-2 bg-transparent text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Apellido</label>
                  <input
                    className="w-full rounded-md border px-3 py-2 bg-transparent text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!hasChanges || saving}
                    className={`px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition ${
                      !hasChanges || saving
                        ? "bg-gray-500 cursor-not-allowed"
                        : "bg-orange-600 hover:bg-orange-700"
                    }`}
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>

                {message && <p className="text-sm mt-2">{message}</p>}
              </form>
            </section>

            {/* Admin card - only show for admin users */}
            {me.role === "ADMIN" && (
              <section className="bg-card rounded-2xl p-6 shadow-lg border">
                <h3 className="text-lg font-bold mb-4">Últimos Usuarios Registrados</h3>

                <div className="mt-6">
                  {loadingUsers ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Cargando usuarios...
                    </div>
                  ) : recentUsers.length > 0 ? (
                    <div className="space-y-3">
                      {recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-3 rounded-md border">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                            {user.username?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{user.username}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {user.role}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No hay usuarios registrados
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
                  >
                    Ver más
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Right column: calendar */}
          <section className="col-span-3 lg:col-span-3">
            <div className="bg-card rounded-2xl p-6 shadow-lg border h-full min-h-[480px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Horario</h3>
                <div className="text-sm text-muted-foreground">
                  Aquí irá el calendario (FullCalendar)
                </div>
              </div>

              <div className="h-[420px] rounded-md border border-dashed flex items-center justify-center text-gray-400">
                <div className="text-center px-6">
                  <p className="font-medium mb-2">Calendario (placeholder)</p>
                  <p className="text-sm">
                    Integrarás FullCalendar aquí para mostrar tu horario y eventos.
                  </p>
                </div>
              </div>

              {/* opcional: lista rápida de datos de usuario */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md border">
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="font-medium">{me.username}</p>
                </div>
                <div className="p-3 rounded-md border">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{me.email}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Admin Users Modal */}
      {showAdminModal && (
        <AdminUsersModal
          token={token}
          authUrl={AUTH_URL}
          onClose={() => setShowAdminModal(false)}
        />
      )}
    </div>
  );
}
