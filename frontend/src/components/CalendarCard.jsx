// src/components/CalendarCard.jsx
import React from "react";

export default function CalendarCard({ code, name, hours, credits, type, index = 0, faded, className = "" }) {
  const isElective = (type || "").toString().toLowerCase().includes("electiv");
  // Usamos el index para alternar colores (Par/Impar)
  const isEven = index % 2 === 0; 
  
  let baseStyle = "";
  let badgeStyle = "";
  let textStyle = "";
  
  if (isElective) {
    // Electiva: Negro con borde Naranja
    baseStyle = "bg-black/60 border-l-[3px] border-orange-500 text-orange-100";
    badgeStyle = "text-orange-400 font-bold";
    textStyle = "text-orange-50";
  } else {
    // Obligatoria: Alternancia de Naranjas
    if (isEven) {
        // Tono 1: Naranja Oscuro (Marrón rojizo)
        baseStyle = "bg-[#7c2d12]/90 border-l-[3px] border-orange-500 text-white"; // orange-900 custom
        badgeStyle = "text-orange-200 font-bold opacity-80";
        textStyle = "text-white";
    } else {
        // Tono 2: Naranja un poco más claro/quemado
        baseStyle = "bg-[#9a3412]/90 border-l-[3px] border-orange-400 text-white"; // orange-800 custom
        badgeStyle = "text-orange-200 font-bold opacity-80";
        textStyle = "text-white";
    }
  }

  const opacityClass = faded ? "opacity-50" : "opacity-100";

  return (
    <div
      className={`
        h-full w-full p-1.5 rounded-r-sm shadow-sm backdrop-blur-md
        flex flex-col justify-between overflow-hidden relative
        transition-all duration-200 hover:brightness-110 hover:z-10
        ${baseStyle} ${opacityClass} ${className}
      `}
    >
      {/* Course Name - Takes remaining space */}
      <p 
        className={`text-[11px] font-semibold leading-tight line-clamp-2 ${textStyle}`} 
        title={name}
      >
        {name}
      </p>
       {/* Top Row: Code (Group) + Credits */}
        <span className={`font-mono ${badgeStyle}`}>
          {code}
        </span>


    </div>
  );
}