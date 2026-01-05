import { useState } from "react";

const COURSES_URL = import.meta.env.VITE_COURSES_URL;
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "changeme-local";

export default function AdminPensumSync() {
  const [cookie, setCookie] = useState("");
  const [delay, setDelay] = useState(0);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const startSync = async () => {
    setMsg(null);
    if (!cookie.trim()) { setMsg("Pega la cookie primero"); return; }

    try {
      setLoading(true);
      const res = await fetch(`${COURSES_URL}/sync-pensum-async/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ADMIN-KEY": ADMIN_KEY,
        },
        body: JSON.stringify({ ci_session: cookie, delay: Number(delay) || 0 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || JSON.stringify(body));
      setTaskId(body.task_id);
      setStatus("started");
      pollStatus(body.task_id);
    } catch (err) {
      setMsg("Error al iniciar sync: " + err.message);
      setLoading(false);
    }
  };

  const pollStatus = async (id) => {
    setStatus("polling");
    try {
      for (let i = 0; i < 120; i++) {
        const res = await fetch(`${COURSES_URL}/sync-status/${id}`, {
          headers: { "X-ADMIN-KEY": ADMIN_KEY },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || JSON.stringify(body));
        setStatus(body.status);
        if (body.status === "success") {
          setMsg("Sync completo ✅");
          setLoading(false);
          return;
        }
        if (body.status === "error") {
          setMsg("Sync falló: " + (body.msg || "error desconocido"));
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      setMsg("Timed out polling status — check logs.");
    } catch (err) {
      setMsg("Error al consultar estado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 border shadow-sm">
      <h4 className="font-semibold mb-2">Admin — Sync pensum (divisist)</h4>

      <label className="text-xs text-muted-foreground">Cookie (ci_session)</label>
      <textarea
        className="w-full rounded-md border px-3 py-2 mt-1 bg-transparent text-foreground"
        rows={3}
        value={cookie}
        onChange={(e) => setCookie(e.target.value)}
        placeholder="Pega aquí la cookie ci_session de divisist"
      />

      <div className="flex items-center gap-2 mt-2">
        <label className="text-xs">Delay (ms)</label>
        <input
          className="w-24 rounded-md border px-2 py-1"
          type="number"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
        />
        <button
          onClick={startSync}
          disabled={loading}
          className={`px-3 py-1 rounded-md text-white text-sm font-medium ${loading ? "bg-gray-500" : "bg-orange-600 hover:bg-orange-700"}`}
        >
          {loading ? "Syncing..." : "Sync"}
        </button>

        {loading && (
          <div className="ml-2">
            <svg className="animate-spin h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          </div>
        )}
      </div>

      <div className="mt-3 text-sm">
        {taskId && <div><strong>TASK:</strong> {taskId}</div>}
        {status && <div><strong>Estado:</strong> {status}</div>}
        {msg && <div className="mt-1 text-xs">{msg}</div>}
      </div>
    </div>
  );
}