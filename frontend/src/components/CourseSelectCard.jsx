export default function CourseSelectCard({ course, selected, onToggle }) {
  const electiveStyle =
    course.tipo === "electiva"
      ? "bg-black-600/30 border-orange-400"
      : "bg-orange-800/40 border-white/10"

  return (
    <div
      onClick={() => onToggle(course.codigo)}
      className={`cursor-pointer w-full p-2 rounded-lg shadow-md backdrop-blur-sm border text-sm transition
        ${selected ? "bg-green-600/70 border-green-400 text-white" : `${electiveStyle} text-white`}
      `}
    >
      <h3 className="font-bold">{course.codigo}</h3>
      <p className="truncate">{course.nombre}</p>
      <p className="text-xs text-gray-300">
        Horas: {course.hours} | Créditos: {course.creditos}
      </p>
    </div>
  )
}
