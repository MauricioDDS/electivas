import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import AdminUsersModal from "@/components/AdminUsersModal";
import AdminPensumSync from "@/components/AdminPensumSync";
import UserHorarioFetcher from "@/components/UserHorarioFetcher";

const AUTH_URL =
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

  const [recentUsers, setRecentUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const fetchRecentUsers = async (userRole) => {
    if (!token || userRole !== "ADMIN") return;

    setLoadingUsers(true);
    try {
      const res = await fetch(`${AUTH_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const users = await res.json();
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
        if (!firstName) setFirstName(data.first_name || "");
        if (!lastName) setLastName(data.last_name || "");

        if (data.role === "ADMIN") {
          fetchRecentUsers(data.role);
        }
      })
      .catch((err) => {
        console.error("Error fetching profile:", err);
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

      const updated = body;
      setMe(updated);
      setMessage("Nombre actualizado correctamente.");

      if (login && typeof login === "function") {
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
          <div className="col-span-1 space-y-6">
            <section className="bg-card rounded-2xl p-6 shadow-lg border">
              <div className="flex items-center gap-4">
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
                    className={`px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition ${!hasChanges || saving
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

            {me.role === "ADMIN" && (
              <section className="bg-card rounded-2xl p-6 shadow-lg border h-64 flex flex-col">
                <h3 className="text-lg font-bold mb-4">Últimos Usuarios Registrados</h3>

                <div className="mt-2 flex-1 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Cargando usuarios...
                    </div>
                  ) : recentUsers && recentUsers.length > 0 ? (
                    <div className="space-y-2 px-1">
                      {recentUsers.slice(0, 3).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 rounded-md border h-14"
                        >
                          <div className="flex-1 overflow-hidden">
                            <p className="font-medium text-sm truncate">{user.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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

                <div className="mt-4 pt-2 border-t flex-shrink-0">
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="w-full px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
                  >
                    Ver más
                  </button>
                </div>
              </section>
            )}

            {me.role === "ADMIN" && (
              <AdminPensumSync />
            )}

          </div>

          <section className="col-span-3 lg:col-span-3">
            <div className="bg-card rounded-2xl p-6 shadow-lg border h-full min-h-[480px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Horario</h3>
              </div>

              <div className="rounded-md border p-2 bg-card">
                <UserHorarioFetcher userEmail={me.email} />
              </div>


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
