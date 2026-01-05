import React from "react";

export default function CalendarCard({ code, name, hours, credits, type, index = 0, faded, className = "" }) {
  const isElective = (type || "").toString().toLowerCase().includes("electiv");
  const isEven = index % 2 === 0; 
  
  let baseStyle = "";
  let badgeStyle = "";
  let textStyle = "";
  
  if (isElective) {
    baseStyle = "bg-black/60 border-l-[3px] border-orange-500 text-orange-100";
    badgeStyle = "text-orange-400 font-bold";
    textStyle = "text-orange-50";
  } else {
    if (isEven) {
        baseStyle = "bg-[#7c2d12]/90 border-l-[3px] border-orange-500 text-white";
        badgeStyle = "text-orange-200 font-bold opacity-80";
        textStyle = "text-white";
    } else {
        baseStyle = "bg-[#9a3412]/90 border-l-[3px] border-orange-400 text-white";
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
      <p 
        className={`text-[11px] font-semibold leading-tight line-clamp-2 ${textStyle}`} 
        title={name}
      >
        {name}
      </p>
        <span className={`font-mono ${badgeStyle}`}>
          {code}
        </span>


    </div>
  );
}