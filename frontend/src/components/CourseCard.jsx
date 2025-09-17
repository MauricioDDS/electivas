export default function CourseCard({ code, name, hours, credits, type, faded }) {
  const electiveStyle =
    type === "electiva"
      ? "bg-black-600/30 border-orange-400"
      : "bg-orange-800/40 border-white/10"

  return (
    <div
      className={`w-40 h-20 p-2 rounded-lg shadow-md backdrop-blur-sm text-white text-xs 
      flex flex-col border justify-between ${faded ? "opacity-50" : "opacity-100"} ${electiveStyle}`}
    >
      <h3 className="font-bold truncate">{code}</h3>
      <p className="truncate">{name}</p>
      <p className="text-[10px] text-gray-300">
        Horas: {hours} | Créditos: {credits}
      </p>
    </div>
  )
}