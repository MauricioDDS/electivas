import { useLocation } from "react-router-dom";
import { useState } from "react";
import CalendarView from "@/components/CalendarView";

export default function Schedules() {
  const { state } = useLocation();
  const cursosIniciales = state?.cursos || [];

  const [cursos, setCursos] = useState(cursosIniciales);

  const [events, setEvents] = useState([]);

  function renderHorario(materia) {
    const grupos = materia.grupos || {};

    const eventosMateria = Object.values(grupos).flatMap(g =>
      g.clases.map(c => ({
        title: materia.nombre,
        start: getDateFrom(c.dia, c.horaInicio),
        end: getDateFrom(c.dia, c.horaFin),
        extendedProps: {
          horario_raw: {
            codigo: materia.codigo,
            nombre: materia.nombre,
            hora: c.horaInicio,
            salon: c.salon,
          }
        }
      }))
    );

    setEvents(eventosMateria);
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Horario Óptimo</h1>

      <CalendarView events={events} />

      <h2 className="text-2xl font-bold">Bocetos</h2>

      <div className="flex flex-wrap gap-4">
        {cursos.map(m => (
          <div
            key={m.codigo}
            className="p-4 bg-card rounded cursor-pointer hover:bg-accent transition"
            onClick={() => renderHorario(m)}
          >
            <p className="font-bold">{m.codigo}</p>
            <p>{m.nombre}</p>
            <p className="text-sm text-gray-400">
              Horas: {m.horas} | Créditos: {m.creditos}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// helper
function getDateFrom(dia, hora) {
  const now = new Date();
  const base = new Date(now.setDate(now.getDate() - now.getDay() + (dia + 1)));
  base.setHours(hora, 0, 0, 0);
  return base.toISOString();
}
