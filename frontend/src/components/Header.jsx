import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user, token, logout } = useAuth();

  return (
    <header className="w-full bg-black/40 border-b px-6 py-4 flex justify-between items-center">
      <h1 className="text-lg font-bold text-white">Horario Óptimo</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">
          {user?.email || user?.username || "Crea tú cuenta para iniciar"}
        </span>
        {token && (
          <button
            onClick={logout}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
