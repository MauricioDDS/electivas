import { useState, useEffect } from "react";
import CalendarView from "./CalendarView";

const CALENDAR_API = import.meta.env.VITE_CALENDAR_URL || "http://localhost:8022";

// --- Helpers de Parsing ---

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
  console.log(`🔄 [MERGE] Iniciando fusión de ${clases.length} bloques de clase raw.`);
  
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

  const finalResult = merged.map((m) => {
    const out = { ...m.raw };
    out.hora = `${m.startStr || ""}-${m.endStr || ""}`;
    out._startMin = m.startMin;
    out._endMin = m.endMin;
    return out;
  });

  console.log(`✅ [MERGE] Resultado: ${finalResult.length} clases consolidadas.`);
  return finalResult;
}

function clasesToEvents(clases) {
  console.log("📅 [TO_EVENTS] Iniciando conversión a formato Calendario...");
  
  const daysMap = {
    Lunes: 1, Martes: 2, Miércoles: 3, Miercoles: 3,
    Jueves: 4, Viernes: 5, Sábado: 6, Sabado: 6, Domingo: 0,
  };

  // Base temporal: Lunes de la semana actual
  const today = new Date();
  const currentDay = today.getDay(); 
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(today);
  monday.setDate(today.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  console.log("📆 [TO_EVENTS] Fecha Base (Lunes):", monday.toDateString());

  const evs = [];

  clases.forEach((clase, index) => {
    // Normalizar día
    const diaStr = (clase.dia || "").trim();
    const normalizedDay = Object.keys(daysMap).find(key =>
      key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
      diaStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );

    if (!normalizedDay) {
      console.warn(`⚠️ [TO_EVENTS] Día desconocido o vacío en índice ${index}:`, clase);
      return;
    }
    
    const weekdayTarget = daysMap[normalizedDay];

    // Calcular fecha
    const eventDate = new Date(monday);
    eventDate.setDate(monday.getDate() + (weekdayTarget - 1));

    // Parsear horas
    const hr = (clase.hora || "").replace(/\s+/g, "");
    const [startStr, endStr] = hr.split("-");

    if (!startStr || !endStr) {
      console.warn(`⚠️ [TO_EVENTS] Hora inválida en índice ${index}:`, clase.hora);
      return;
    }

    const setTime = (base, timeStr) => {
      const d = new Date(base);
      const [h, m] = timeStr.split(":").map(Number);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const start = setTime(eventDate, startStr);
    const end = setTime(eventDate, endStr);

    // LOG DE CADA EVENTO GENERADO
    console.log(`   👉 Evento: ${clase.materia} (${diaStr}) | Start: ${start.toLocaleTimeString()} | End: ${end.toLocaleTimeString()}`);

    const id = `${clase.materia}-${clase.grupo}-${diaStr}-${startStr}`.replace(/\s+/g, "_");

    evs.push({
      id,
      title: clase.materia || "Clase",
      start,
      end,
      resource: clase,
    });
  });

  console.log(`🏁 [TO_EVENTS] Total eventos generados: ${evs.length}`);
  return evs;
}

export default function UserHorarioFetcher({ userEmail }) {
  const [cookie, setCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState(null);

  async function traerHorario() {
    if (!cookie) {
      setMessage("Pega la cookie (ci_session) primero.");
      return;
    }
    setMessage(null);
    setLoading(true);
    
    console.log("🚀 [FETCHER] Iniciando petición a:", `${CALENDAR_API}/fetch-horario`);

    try {
      const res = await fetch(`${CALENDAR_API}/fetch-horario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ci_session: cookie, user: userEmail || "anon" }),
      });

      const bodyText = await res.text();
      console.log("📥 [FETCHER] Respuesta CRUDA del backend:", bodyText);

      let body;
      try {
        body = bodyText ? JSON.parse(bodyText) : {};
      } catch (err) {
        console.error("❌ [FETCHER] Falló el parseo JSON", err);
        throw new Error(`Error parsing JSON: ${bodyText.slice(0, 100)}`);
      }

      if (!res.ok) throw new Error(body.detail || `Error ${res.status}`);

      const clasesRaw = body.horario ?? body ?? [];
      console.log("📦 [FETCHER] Clases extraídas (Array inicial):", clasesRaw);

      // Procesar datos
      const merged = mergeConsecutiveClases(clasesRaw);
      const evs = clasesToEvents(merged);

      console.log("✨ [FETCHER] Eventos finales para el calendario:", evs);
      setEvents(evs);

      const key = userEmail ? `horario_${userEmail}` : "horario_anon";
      localStorage.setItem(key, JSON.stringify(clasesRaw));

      setMessage(`Horario cargado: ${evs.length} clases.`);
    } catch (err) {
      console.error("🔥 [FETCHER] Error fatal:", err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const key = userEmail ? `horario_${userEmail}` : "horario_anon";
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        console.log("💾 [CACHE] Cargando horario desde localStorage...");
        const parsed = JSON.parse(raw);
        const merged = mergeConsecutiveClases(parsed);
        setEvents(clasesToEvents(merged));
      } catch (e) { 
        console.error("Error leyendo cache", e);
      }
    }
  }, [userEmail]);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-xl border border-white/5 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Traer horario (Divisist)
          </h3>
          <p className="text-sm text-gray-400">Pega tu cookie (ci_session) para sincronizar.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            className="flex-1 md:w-64 rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            placeholder="ci_session..."
          />
          <button
            onClick={traerHorario}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Traer"}
          </button>
          {events.length > 0 && (
            <button
              onClick={() => {
                setEvents([]);
                localStorage.removeItem(userEmail ? `horario_${userEmail}` : "horario_anon");
                setMessage("Horario borrado.");
              }}
              className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 text-sm transition-colors"
              title="Borrar horario"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {message && <div className="text-sm text-orange-400/80 mb-4 px-1">{message}</div>}

      <div className="flex-1 min-h-[600px] bg-[#0b0b0d] rounded-xl overflow-hidden relative">
        <CalendarView events={events} />
      </div>
    </div>
  );
}