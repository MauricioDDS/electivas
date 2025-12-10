// src/components/CalendarView.jsx
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ReactDOM from "react-dom/client";
import CalendarCard from "./CalendarCard";

export default function CalendarView({ events }) {
  function eventContent(arg) {
    const rootEl = document.createElement("div");
    rootEl.setAttribute("data-rroot", "1");
    rootEl.style.width = "100%";
    rootEl.style.height = "100%";
    rootEl.style.display = "flex";
    rootEl.style.alignItems = "stretch";
    rootEl.style.justifyContent = "center";
    rootEl.style.boxSizing = "border-box";
    rootEl.style.padding = "4px";

    const root = ReactDOM.createRoot(rootEl);
    rootEl.__rroot = root;

    const d = arg.event.extendedProps.horario_raw || {};

    root.render(
      <div className="w-full h-full flex items-stretch">
        <CalendarCard
          code={d.materia || d.codigo}
          name={d.nombre || d.grupo || d.salon}
          hours={d.hora}
          credits={d.creditos}
          type={d.tipo || (d.materia?.toLowerCase?.().includes("electiv") ? "electiva" : "")}
          faded={false}
          className="w-full h-full"
        />
      </div>
    );

    return { domNodes: [rootEl] };
  }

  function handleEventWillUnmount(arg) {
    const ourNode = arg.el.querySelector("[data-rroot]");
    if (ourNode && ourNode.__rroot) {
      try {
        ourNode.__rroot.unmount();
      } catch (err) {}
    }
  }

  return (
    <div className="mb-4 border rounded-md overflow-hidden bg-[#0b0b0d]">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay"
        }}
        firstDay={1}
        hiddenDays={[0]}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        events={events}
        eventContent={eventContent}
        eventWillUnmount={handleEventWillUnmount}
        height="auto"
        contentHeight="auto"
        expandRows={true}
      />
    </div>
  );
}
