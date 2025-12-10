import React from "react";

export default function CalendarCard({ code, name, hours, credits, type, faded, className = "" }) {
  
  const isElective = (type || "").toString().toLowerCase().includes("electiv");

  let baseStyle = "";
  let textCode = "";
  
  if (isElective) {
    baseStyle = "bg-orange-800/60 border-orange-500 text-white";
    textCode = "text-orange-300";
  } else {
    baseStyle = "bg-orange-600/60 border-orange-400 text-white";
    textCode = "text-orange-200";
  }
  
  const opacityClass = faded ? "opacity-40" : "opacity-100";

  return (
    <div
      className={`
        p-2 rounded-lg shadow-md backdrop-blur-sm 
        flex flex-col border justify-between 
        transition-all duration-200
        ${baseStyle} ${opacityClass} ${className}
      `}
    >
      <h3 className={`font-bold truncate text-xs ${textCode}`}>{code}</h3>
      <p className="truncate mt-0.5 text-sm leading-tight text-white">{name}</p>
      <p className="text-[10px] text-gray-200 mt-1">
        {hours} {credits ? `| ${credits} Créditos` : ""}
      </p>
    </div>
  );
}