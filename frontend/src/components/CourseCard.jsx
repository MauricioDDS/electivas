export default function CourseCard({ code, name, hours, credits, type, faded }) {
  return (
    <div
      className={`p-2 rounded-lg shadow-md bg-black/40 backdrop-blur-sm border border-white/10 text-white text-sm ${
        faded ? "opacity-50" : "opacity-100"
      }`}
    >
      <h3 className="font-bold">{code}</h3>
      <p>{name}</p>
      <p className="text-xs text-gray-300">
        Horas: {hours} | Créditos: {credits}
      </p>
    </div>
  )
}
