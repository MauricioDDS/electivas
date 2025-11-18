import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

const COURSES_API = import.meta.env.VITE_COURSES_URL || "http://localhost:8017";

function parseClaseToEvent(clase) {
  const daysMap = {
    "Lunes": 1, "Martes": 2, "Miércoles": 3, "Miercoles": 3, "Jueves": 4, "Viernes": 5, "Sábado": 6, "Sabado": 6, "Domingo": 0
  };
  const weekday = daysMap[clase.dia] ?? null;
  let startTime = null, endTime = null;
  if (clase.hora) {
    const hr = clase.hora.replace(/\s+/g, "");
    const parts = hr.split("-");
    startTime = parts[0] ?? null;
    endTime = parts[1] ?? null;
  }
  const today = new Date();
  const todayDow = today.getDay();
  let daysAhead = 0;
  if (weekday === null) daysAhead = 1;
  else {
    daysAhead = (7 + weekday - todayDow) % 7;
    if (daysAhead === 0) daysAhead = 7;
  }
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + daysAhead);

  function timeToISO(dateBase, timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":");
    const d = new Date(dateBase);
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m || "0", 10));
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d.toISOString();
  }

  const startISO = timeToISO(baseDate, startTime);
  const endISO = endTime ? timeToISO(baseDate, endTime) : null;
  const titleParts = [clase.materia, clase.grupo].filter(Boolean).join(" - ");

  return {
    id: `${clase.materia}-${clase.grupo}-${clase.dia}-${clase.hora}`.replace(/\s+/g, "_"),
    title: titleParts || clase.salon || "Clase",
    start: startISO,
    end: endISO,
    extendedProps: {
      salon: clase.salon,
      edificio: clase.edificio,
      ubicacion: clase.ubicacion,
      tipoAula: clase.tipoAula,
      horario_raw: clase,
    }
  };
}

export default function UserHorarioFetcher({ userEmail }) {
  const [cookie, setCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [horario, setHorario] = useState([]);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState(null);

  async function traerHorario() {
    if (!cookie) {
      setMessage("Pega la cookie (ci_session) primero.");
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${COURSES_API}/fetch-horario/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ci_session: cookie, user: userEmail || "anon" }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.detail || JSON.stringify(body));
      }
      const clases = body.horario ?? [];
      setHorario(clases);
      const evs = (clases || []).map(parseClaseToEvent);
      setEvents(evs);

      if (userEmail) {
        localStorage.setItem(`horario_${userEmail}`, JSON.stringify(clases));
      } else {
        localStorage.setItem(`horario_anon`, JSON.stringify(clases));
      }

      setMessage(`Horario cargado (${clases.length} entradas).`);
    } catch (err) {
      console.error("traerHorario error", err);
      setMessage(`Error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const key = userEmail ? `horario_${userEmail}` : "horario_anon";
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const clases = JSON.parse(raw);
        setHorario(clases);
        setEvents((clases || []).map(parseClaseToEvent));
      }
    } catch { }
  }, [userEmail]);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-lg border">
      <h3 className="text-lg font-bold mb-2">Traer horario (Divisist)</h3>

      <p className="text-sm text-muted-foreground mb-2">Pega tu cookie (ci_session) del Divisist y pulsa "Traer horario".</p>

      <div className="mb-3">
        <textarea
          rows={2}
          className="w-full rounded border px-3 py-2 bg-transparent text-foreground"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          placeholder="pega aquí ci_session"
        />
      </div>

      <div className="flex gap-2 items-center mb-3">
        <button
          onClick={traerHorario}
          className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700"
          disabled={loading}
        >
          {loading ? "Trayendo..." : "Traer horario"}
        </button>

        <button
          onClick={() => {
            const key = userEmail ? `horario_${userEmail}` : "horario_anon";
            localStorage.removeItem(key);
            setHorario([]);
            setEvents([]);
            setMessage("Horario borrado del cliente (server mantiene copia si se guardó).");
          }}
          className="px-3 py-1 rounded border"
        >
          Borrar cliente
        </button>
      </div>

      {message && <div className="text-sm text-muted-foreground mb-3">{message}</div>}

      <div className="mb-4 border rounded-md overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay"
          }}
          slotMinTime="06:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          events={events}
          height="600px"
          contentHeight="auto"
        />
      </div>

    </div>
  );
}
