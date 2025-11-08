import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  function handleProfileClick() {
    if (!token) {
      navigate("/login");
      return;
    }

    // Always navigate to profile page regardless of role
    navigate("/profile");
  }

  return (
    <header className="w-full bg-black/40 border-b px-6 py-4 flex justify-between items-center">
      <h1 className="text-lg font-bold text-white">Horario Óptimo</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={handleProfileClick}
          className="text-sm text-gray-300 hover:underline"
        >
          {user?.email || localStorage.getItem("email") || "Inicia sesión"}
        </button>
        {token && (
          <button
            onClick={logout}
            className="px-3 py-1 text-sm text-primary hover:text-primary/80 font-medium"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
