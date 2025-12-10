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

const hash = (s) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);

const EventComponent = ({ event }) => {
  const d = event.resource; 
  const codeValue = d.group_name || d.grupo || d.salon || "Gpo";
  const nameValue = d.course_name || d.materia || event.title;
  const creditsValue = d.credits || d.meta?.creditos || 0;
  const colorIndex = Math.abs(hash(String(d.id || nameValue))) % 10; 

  return ( 
    <CalendarCard
      code={codeValue} 
      name={nameValue}
      credits={creditsValue}
      type={d.tipo || (nameValue?.toLowerCase?.().includes("electiv") ? "electiva" : "")}
      index={colorIndex}
      faded={false}
      className="w-full h-full" 
    />
  );
};

export default function CalendarView({ events }) {
  const formats = {
    dayFormat: (date, culture, localizer) => 
      localizer.format(date, 'EEEE', culture),
    timeGutterFormat: (date, culture, localizer) => 
      localizer.format(date, 'h:mm a', culture),
  };

  // Definimos las fechas base para min/max (el año/mes/día no importa, solo la hora)
  // RANGO: 6:00 AM a 10:00 PM
  const minTime = new Date();
  minTime.setHours(6, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(22, 0, 0);

  return (
    <div className="h-full w-full custom-rbc-theme">
      <style>{`
        /* Estilos forzados para el tema oscuro del calendario */
        .custom-rbc-theme .rbc-toolbar button {
          color: white !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .custom-rbc-theme .rbc-toolbar button:hover {
          background-color: rgba(255,255,255,0.1) !important;
        }
        .custom-rbc-theme .rbc-toolbar button.rbc-active {
          background-color: #ea580c !important; /* Orange-600 */
          border-color: #ea580c !important;
        }
        .custom-rbc-theme .rbc-toolbar-label {
          color: white !important;
          font-weight: bold;
          text-transform: capitalize;
        }
        .custom-rbc-theme .rbc-header {
          color: white !important;
          text-transform: capitalize;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .custom-rbc-theme .rbc-time-content {
          border-top: 1px solid rgba(255,255,255,0.1) !important;
        }
        .custom-rbc-theme .rbc-time-view {
          border: none !important;
        }
        .custom-rbc-theme .rbc-timeslot-group {
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .custom-rbc-theme .rbc-day-bg {
          border-left: 1px solid rgba(255,255,255,0.05) !important;
        }
        .custom-rbc-theme .rbc-time-header-content {
          border-left: 1px solid rgba(255,255,255,0.1) !important;
        }
        .custom-rbc-theme .rbc-time-gutter .rbc-timeslot-group {
          color: #9ca3af !important; /* Gray-400 */
          font-size: 0.75rem;
          border-bottom: none !important;
        }
        .custom-rbc-theme .rbc-off-range-bg {
          background-color: rgba(255,255,255,0.02) !important;
        }
        .custom-rbc-theme .rbc-today {
          background-color: rgba(234, 88, 12, 0.05) !important; /* Orange tint suave */
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        
        defaultView="week"
        views={['week', 'day']} 

        // RANGO AJUSTADO: 6 AM - 10 PM
        min={minTime}
        max={maxTime}
        
        culture='es'
        components={{
            event: EventComponent
        }}
        formats={formats}
        toolbar={true}
      />
    </div>
  );
}