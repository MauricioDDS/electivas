export default function CourseSelectCard({ course, selected, onToggle, onShow }) {
  // support both shapes: horas (scraper) or hours (old)
  const hours = course.horas ?? course.hours ?? "-";
  const credits = course.creditos ?? course.creditos ?? course.credits ?? "-";

  const electiveStyle =
    (course.tipo || "").toLowerCase() === "electiva"
      ? "bg-black-600/30 border-orange-400"
      : "bg-orange-800/40 border-white/10";

  return (
    <div
      className={`relative cursor-pointer w-full p-2 rounded-lg shadow-md backdrop-blur-sm border text-sm transition
        ${selected ? "bg-green-600/70 border-green-400 text-white" : `${electiveStyle} text-white`}
      `}
      onClick={() => onToggle(course.codigo)}
    >
      {/* Info button top-right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (typeof onShow === "function") onShow(course);
        }}
        className="absolute right-2 top-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 text-xs"
        title="Ver detalles"
      >
        i
      </button>

      <h3 className="font-bold">{course.codigo}</h3>
      <p className="truncate">{course.nombre}</p>
      <p className="text-xs text-gray-300">
        Horas: {hours} | Créditos: {credits}
      </p>
    </div>
  );
}
