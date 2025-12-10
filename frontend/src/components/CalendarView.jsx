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

  return (
    <div className="h-full w-full custom-rbc-theme">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        
        defaultView="week"
        views={['week', 'day']} 

        min={new Date(2024, 0, 1, 0, 0, 0)} 
        max={new Date(2024, 0, 1, 23, 59, 0)}
        
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