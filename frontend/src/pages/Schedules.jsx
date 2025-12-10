// src/pages/Schedules.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import CalendarView from "@/components/CalendarView";

export default function Schedules() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const cursosIniciales = state?.cursos || [];
  const [cursos, setCursos] = useState(cursosIniciales);
  const [events, setEvents] = useState([]);

  // convierte dia index numero (0:Lunes?) según tus datos. Aquí asumo dia en grupos.clases.dia es 1..6 (Lun..Sab)
  function getDateFrom(dia, hora) {
    // dia: number 1..6 (lunes..sab). hora: integer hour or "08:00"
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0,0,0,0);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday base
    const dayIndex = Number(dia);
    if (isNaN(dayIndex)) return null;
    // want Mon=1 -> offset 1
    const baseDate = new Date(startOfWeek);
    baseDate.setDate(startOfWeek.getDate() + dayIndex);
    let h = 0, m = 0;
    if (typeof hora === "string" && hora.includes(":")) {
      const parts = hora.split(":");
      h = Number(parts[0] || 0);
      m = Number(parts[1] || 0);
    } else {
      h = Number(hora || 0);
    }
    baseDate.setHours(h, m, 0, 0);
    return baseDate.toISOString();
  }

  function renderHorario(materia) {
    // materia.grupos puede ser objeto o array
    const grupos = materia.grupos ?? materia.grupos ?? {};
    const groupList = Array.isArray(grupos) ? grupos : Object.values(grupos || {});

    const eventosMateria = groupList.flatMap(g =>
      (g.clases || g.clases || g.horario || []).map(c => {
        const start = getDateFrom(c.dia, c.horaInicio ?? c.hora_inicio ?? c.start);
        const end = getDateFrom(c.dia, c.horaFin ?? c.hora_fin ?? c.end);
        if (!start || !end) return null;
        return {
          id: `${materia.codigo}-${g.nombre ?? g.group_name ?? ""}-${c.dia}-${c.horaInicio || c.hora_inicio || ""}`,
          title: materia.codigo,
          start,
          end,
          extendedProps: {
            horario_raw: {
              codigo: materia.codigo,
              nombre: materia.nombre,
              hora: `${c.horaInicio ?? c.hora_inicio ?? ""}-${c.horaFin ?? c.hora_fin ?? ""}`,
              salon: c.salon ?? c.location ?? ""
            }
          }
        };
      }).filter(Boolean)
    );

    setEvents(eventosMateria);
  }

  useEffect(() => {
    // si la ruta no trae cursos, será mejor redirigir a home
    if (!cursos || cursos.length === 0) {
      // opcional: navigate("/");
    }
  }, [cursos, navigate]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Horario Óptimo</h1>
        <button onClick={() => navigate("/")} className="px-3 py-1 bg-gray-700 rounded">← Volver</button>
      </div>

      <CalendarView events={events} />

      <h2 className="text-2xl font-bold">Bocetos</h2>

      <div className="flex gap-4 overflow-x-auto py-3">
        {cursos.map(m => (
          <div
            key={m.codigo}
            className="min-w-[260px] p-4 bg-card rounded cursor-pointer hover:bg-accent transition"
            onClick={() => renderHorario(m)}
          >
            <p className="font-bold">{m.codigo}</p>
            <p>{m.nombre}</p>
            <p className="text-sm text-gray-400">
              Horas: {m.horas ?? m.hours} | Créditos: {m.creditos ?? m.credits}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
