import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import CalendarCard from "./CalendarCard";
import CalendarView from "./CalendarView";

const CALENDAR_API = import.meta.env.VITE_CALENDAR_URL || "http://localhost:4004";

function timeStrToMinutes(t) {
  if (!t) return null;
  const [h, m = "0"] = t.split(":");
  return parseInt(h || "0", 10) * 60 + parseInt(m || "0", 10);
}

function parseRange(horaRaw) {
  if (!horaRaw) return { startMin: null, endMin: null, startStr: null, endStr: null };
  const hr = horaRaw.replace(/\s+/g, "");
  const parts = hr.split("-");
  const start = parts[0] ?? null;
  const end = parts[1] ?? null;
  return { startMin: timeStrToMinutes(start), endMin: timeStrToMinutes(end), startStr: start, endStr: end };
}

function mergeConsecutiveClases(clases) {
  const groups = {};
  clases.forEach((c) => {
    const key = `${c.dia}||${c.materia || ""}||${c.grupo || ""}||${c.salon || ""}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  const merged = [];
  Object.values(groups).forEach((list) => {
    const sorted = list
      .map((c) => {
        const { startMin, endMin, startStr, endStr } = parseRange(c.hora || "");
        return { raw: c, startMin, endMin, startStr, endStr };
      })
      .filter((x) => x.startMin !== null && x.endMin !== null)
      .sort((a, b) => a.startMin - b.startMin);

    if (sorted.length === 0) return;

    let cur = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
      const s = sorted[i];
      if (s.startMin === cur.endMin) {
        cur.endMin = s.endMin;
        cur.endStr = s.endStr;
      } else if (s.startMin <= cur.endMin) {
        cur.endMin = Math.max(cur.endMin, s.endMin);
        cur.endStr = cur.endStr && s.endStr ? (cur.endMin >= s.endMin ? cur.endStr : s.endStr) : (s.endStr || cur.endStr);
      } else {
        merged.push(cur);
        cur = { ...s };
      }
    }
    merged.push(cur);
  });

  return merged.map((m) => {
    const out = { ...m.raw };
    out.hora = `${m.startStr || ""}-${m.endStr || ""}`;
    out._startMin = m.startMin;
    out._endMin = m.endMin;
    return out;
  });
}

function clasesToEvents(clases) {
  const daysMap = {
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Miercoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
    Sabado: 6,
    Domingo: 0,
  };

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const evs = [];

  clases.forEach((clase) => {
    const weekday = daysMap[clase.dia] ?? null;
    if (weekday === null) return;

    if (weekday === 0) return;

    const baseDate = new Date(startOfWeek);
    baseDate.setDate(startOfWeek.getDate() + weekday);

    const hr = (clase.hora || "").replace(/\s+/g, "");
    const parts = hr.split("-");
    const startStr = parts[0] ?? null;
    const endStr = parts[1] ?? null;
    if (!startStr || !endStr) return;

    function timeToISO(dateBase, timeStr) {
      if (!timeStr) return null;
      const [h, m = "0"] = timeStr.split(":");
      const d = new Date(dateBase);
      d.setHours(parseInt(h || "0", 10), parseInt(m || "0", 10), 0, 0);
      return d.toISOString();
    }

    const start = timeToISO(baseDate, startStr);
    const end = timeToISO(baseDate, endStr);

    const id = `${clase.materia || "mat"}-${clase.grupo || "g"}-${clase.dia || "d"}-${startStr}-${endStr}`.replace(/\s+/g, "_");

    evs.push({
      id,
      title: clase.materia || clase.codigo || "Clase",
      start,
      end,
      extendedProps: { horario_raw: clase },
    });
  });

  return evs;
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
      const res = await fetch(`${CALENDAR_API}/fetch-horario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ci_session: cookie, user: userEmail || "anon" }),
      });

      const bodyText = await res.text();
      let body;
      try {
        body = bodyText ? JSON.parse(bodyText) : {};
      } catch (err) {
        if (!res.ok) throw new Error(`scraper returned ${res.status}: ${bodyText.slice(0, 500)}`);
        throw new Error(`scraper returned non-JSON: ${bodyText.slice(0, 500)}`);
      }

      if (!res.ok) throw new Error(body.detail || JSON.stringify(body) || `HTTP ${res.status}`);

      const clasesRaw = body.horario ?? body ?? [];
      setHorario(clasesRaw);

      const merged = mergeConsecutiveClases(clasesRaw);
      const evs = clasesToEvents(merged);
      setEvents(evs);

      const key = userEmail ? `horario_${userEmail}` : "horario_anon";
      localStorage.setItem(key, JSON.stringify(clasesRaw));

      setMessage(`Horario cargado (${merged.length} eventos, ${clasesRaw.length} filas).`);
    } catch (err) {
      console.error("traerHorario error", err);
      setMessage(`Error: ${err.message || err}. Revisa tu API en ${CALENDAR_API}/fetch-horario.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const key = userEmail ? `horario_${userEmail}` : "horario_anon";
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const clasesRaw = JSON.parse(raw);
        setHorario(clasesRaw);
        const merged = mergeConsecutiveClases(clasesRaw);
        const evs = clasesToEvents(merged);
        setEvents(evs);
      }
    } catch (err) {
      console.warn("could not load saved horario", err);
    }
  }, [userEmail]);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-lg border border-white/10">
      <h3 className="text-lg font-bold mb-2 text-white">Traer horario (Divisist)</h3>

      <p className="text-sm text-gray-400 mb-2">Pega tu cookie (ci_session) del Divisist y pulsa "Traer horario".</p>

      <div className="mb-3">
        <textarea
          rows={2}
          className="w-full rounded border px-3 py-2 bg-transparent text-white border-white/20"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          placeholder="pega aquí ci_session"
        />
      </div>

      <div className="flex gap-2 items-center mb-3">
        <button
          onClick={traerHorario}
          className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
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
          className="px-3 py-1 rounded border border-white/20 text-white hover:bg-white/10"
        >
          Borrar cliente
        </button>
      </div>

      {message && <div className="text-sm text-gray-400 mb-3">{message}</div>}

      <div className="mb-4 rounded-md overflow-hidden border border-white/10 bg-[#0b0b0d]">
        <CalendarView events={events} />
      </div>
    </div>
  );
}