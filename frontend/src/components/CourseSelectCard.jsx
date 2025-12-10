// src/components/CourseSelectCard.jsx
import { Check } from "lucide-react";

export default function CourseSelectCard({ course, selected, onToggle, onShow, disabled }) {
  const hours = course.horas ?? course.hours ?? "-";
  const credits = course.creditos ?? course.credits ?? 0;
  
  // Determinar si es una electiva de forma más robusta
  const isElective = (course.tipo || course.isElectiva || "").toString().toLowerCase().includes("electiv") || (course.isElectiva === true);

  // --- Clases base para los estilos ---
  let containerClasses = "relative w-full p-3 rounded-xl shadow-md backdrop-blur-sm text-sm transition-all duration-200 cursor-pointer flex flex-col justify-between h-full group ";
  let headerClasses = "flex justify-between items-center mb-1";
  let codeClasses = "text-xs font-mono px-2 py-0.5 rounded-md border ";

  // --- Lógica de Estado (Disabled, Selected, Normal) ---

  if (disabled) {
    // ESTADO DESHABILITADO (GRIS)
    containerClasses += "bg-white/5 border-white/5 opacity-40 grayscale pointer-events-none select-none";
    codeClasses += "bg-white/10 text-gray-400 border-white/10";
  } else if (selected) {
    // ESTADO SELECCIONADO (VERDE)
    containerClasses += "bg-green-950/40 border-green-500 shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)] text-green-100";
    codeClasses += "bg-green-500/20 text-green-400 border-green-500/30";
  } else if (isElective) {
    // ESTADO NORMAL - ELECTIVA (NEGRO/NARANJA)
    containerClasses += "bg-black/40 border-orange-500/70 hover:border-orange-400 hover:shadow-lg text-white";
    codeClasses += "bg-orange-600/20 text-orange-400 border-orange-500/30";
  } else {
    // ✨ ESTADO NORMAL - OBLIGATORIA (NARANJA OSCURO/DISPONIBLE)
    // Aplicamos el estilo de la imagen para las obligatorias disponibles (marrón/naranja oscuro)
    containerClasses += "bg-orange-950/40 border-orange-800/60 hover:border-orange-700 hover:shadow-lg hover:-translate-y-0.5 text-white";
    codeClasses += "bg-orange-900/40 text-orange-200 border-orange-700/50";
  }

  return (
    <div 
      className={containerClasses}
      onClick={() => !disabled && onToggle(course)}
    >
      {/* Header */}
      <div className={headerClasses}>
        <span className={codeClasses}>
          {course.codigo}
        </span>
        {selected && <Check className="w-5 h-5 text-green-500 animate-in zoom-in" />}
      </div>

      {/* Título y Texto */}
      <h3 className={`font-bold leading-tight mt-1 mb-1 ${selected ? 'text-green-100' : (isElective && !disabled ? 'text-orange-200' : 'text-white')}`}>
        {course.nombre}
      </h3>
      <p className={`text-xs ${isElective ? 'text-orange-400' : 'text-gray-300'}`}>
          {isElective ? "Electiva" : `Semestre ${course.semestre}`}
      </p>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
        <p className="text-xs text-gray-400">Horas: {hours}</p>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-bold ${selected ? 'text-white' : (isElective ? 'text-orange-400' : 'text-orange-200')}`}>{credits}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Créditos</span>
        </div>
      </div>
      
      {/* Botón Info (Ver más) */}
      <button 
        onClick={(e) => { e.stopPropagation(); if (typeof onShow === "function") onShow(course); }}
        className={`absolute right-2 top-2 p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-opacity ${disabled ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
}