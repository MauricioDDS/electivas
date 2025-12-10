// src/components/CalendarView.jsx
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import "react-big-calendar/lib/css/react-big-calendar.css";
import CalendarCard from "./CalendarCard";

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Función Hash para alternar colores (debe estar fuera del componente o dentro de una función)
const hash = (s) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);


// Componente personalizado para el evento
const EventComponent = ({ event }) => {
  const d = event.resource; 
  
  // Aseguramos que el código sea el Grupo/Salón
  const codeValue = d.grupo || d.salon || "Gpo";

  // Índice pseudo-aleatorio para alternancia de color
  const colorIndex = Math.abs(hash(event.id || event.title)) % 10; 

  return ( 
    <CalendarCard
      code={codeValue} 
      name={d.materia}
      credits={d.creditos}
      type={d.tipo || (d.materia?.toLowerCase?.().includes("electiv") ? "electiva" : "")}
      index={colorIndex}
      faded={false}
      className="w-full h-full" 
    />
  );
}; // <--- El EventComponent termina aquí. No debe haber otro 'return' después.

export default function CalendarView({ events }) {
  const formats = {
    dayFormat: (date, culture, localizer) => 
      localizer.format(date, 'EEEE', culture),
    timeGutterFormat: (date, culture, localizer) => 
      localizer.format(date, 'h:mm a', culture),
  };

  return (
    <div className="h-full w-full custom-rbc-theme">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="work_week"
        views={['work_week', 'day']}
        min={new Date(0, 0, 0, 6, 0, 0)}
        max={new Date(0, 0, 0, 22, 0, 0)}
        culture='es'
        components={{
            event: EventComponent
        }}
        formats={formats}
        toolbar={false}
      />
    </div>
  );
}