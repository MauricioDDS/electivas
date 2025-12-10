import React from "react";

export default function CourseCard({ code, name, hours, credits, type, faded, className = "" }) {
  
  const isElective = (type || "").toString().toLowerCase().includes("electiv");

  let baseStyle = "";
  
  if (isElective) {
    baseStyle = "bg-black/40 border-orange-500/70 text-orange-200 hover:border-orange-400";
  } else {
    baseStyle = "bg-orange-950/40 border-orange-800/60 text-white hover:border-orange-700";
  }
  const opacityClass = faded ? "opacity-50" : "opacity-100";

  return (
    <div
      className={`
        p-3 rounded-lg shadow-md backdrop-blur-sm text-xs 
        flex flex-col border justify-between 
        transition-all duration-200 cursor-pointer hover:shadow-lg
        ${baseStyle} ${opacityClass} ${className}
      `}
    >
      <h3 className="font-bold truncate text-sm">{code}</h3>
      <p className="truncate mt-1 text-sm">{name}</p>
      <p className="text-[10px] text-gray-400 mt-2">
        Horas: {hours} {credits ? `| Créditos: ${credits}` : ""}
      </p>
    </div>
  );
}