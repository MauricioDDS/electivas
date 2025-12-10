import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import CalendarView from "../components/CalendarView";

const API = import.meta.env.VITE_CALENDAR_URL || "http://localhost:8022";

export default function VerBoceto() {
  const { id } = useParams();
  const [horario, setHorario] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/bocetos/${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.horario) throw new Error("Boceto vacío");
        setHorario(data.horario);

        // convertimos de clases → events
        const merged = mergeConsecutiveClases(data.horario);
        const evs = clasesToEvents(merged);
        setEvents(evs);
      })
      .catch(err => setError(err.message));
  }, [id]);

  if (error) return <p className="text-red-500">{error}</p>;

  if (events.length === 0) return <p>Cargando boceto...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">Boceto #{id}</h1>
      <CalendarView events={events} />
    </div>
  );
}
