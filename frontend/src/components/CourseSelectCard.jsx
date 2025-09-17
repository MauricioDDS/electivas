export default function CourseSelectCard({ course, selected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(course.codigo)}
      className={`cursor-pointer w-full p-2 rounded-lg shadow-md backdrop-blur-sm border text-sm transition
        ${selected ? "bg-green-600/70 border-green-400 text-white" : "bg-black/40 border-white/10 text-white"}
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
