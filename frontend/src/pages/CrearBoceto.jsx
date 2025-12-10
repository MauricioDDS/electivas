import { useState, useEffect } from "react";
const API = import.meta.env.VITE_CALENDAR_URL || "http://localhost:8022";

export default function CrearBoceto() {
  const [materias, setMaterias] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/materias`)
      .then(r => r.json())
      .then(data => setMaterias(data))
      .catch(() => setError("No pude cargar las materias"));
  }, []);

  function toggleMateria(id) {
    setSeleccion(sel =>
      sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
    );
  }

  async function crear() {
    if (seleccion.length === 0) {
      setError("Selecciona al menos una materia");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/bocetos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materias: seleccion,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      window.location.href = `/bocetos/${data.id}`;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Crear boceto</h1>

      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-2">
        {materias.map(m => (
          <label key={m.id} className="flex items-center gap-2 border p-2 rounded">
            <input
              type="checkbox"
              checked={seleccion.includes(m.id)}
              onChange={() => toggleMateria(m.id)}
            />
            {m.codigo} — {m.nombre}
          </label>
        ))}
      </div>

      <button
        onClick={crear}
        disabled={loading}
        className="px-4 py-2 bg-orange-600 text-white rounded"
      >
        {loading ? "Guardando..." : "Crear boceto"}
      </button>
    </div>
  );
}
