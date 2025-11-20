export default function CalendarCard({ code, name, hours, credits, type, faded, className = "" }) {
  const electiveStyle =
    type === "electiva"
      ? "bg-black-600/30 border-orange-400"
      : "bg-orange-800/40 border-white/10"

  return (
    <div
      className={`min-w-[140px] min-h-[80px] w-full h-full p-2 rounded-lg flex flex-col 
      border justify-between ${faded ? "opacity-50" : "opacity-100"} ${electiveStyle} ${className}`}
    >
      <h3 className="font-bold truncate">{code}</h3>
      <p className="truncate">{name}</p>
      <p className="text-[10px] text-gray-300">
        Horas: {hours} | Créditos: {credits}
      </p>
    </div>
  )
}

/*
import React from "react";

export default function CourseCard({ code, name, hours, credits, type, faded, className = "" }) {
  const electiveStyle =
    (type || "").toLowerCase() === "electiva"
      ? "bg-black/30 border-orange-400"
      : "bg-orange-800/40 border-white/10";

  return (
    <div
      className={`p-2 rounded-lg shadow-md backdrop-blur-sm text-white text-xs 
        flex flex-col border justify-between ${faded ? "opacity-50" : "opacity-100"} ${electiveStyle} ${className}`}
    >
      <h3 className="font-bold truncate">{code}</h3>
      <p className="truncate">{name}</p>
      <p className="text-[10px] text-gray-300">
        Horas: {hours} {credits ? `| Créditos: ${credits}` : ""}
      </p>
    </div>
  );
}


*/