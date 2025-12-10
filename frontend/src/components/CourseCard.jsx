export default function CourseCard({ code, name, hours, credits, type, isApproved, grade }) {
  return (
    <div
      className={`
      p-4 rounded-lg border-2 transition-all
      ${isApproved ? "bg-green-50 border-green-400 shadow-md" : "bg-gray-50 border-gray-300 hover:border-gray-400"}
    `}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className={`font-bold ${isApproved ? "text-green-700" : "text-gray-900"}`}>{code}</h3>
          <p className={`text-sm ${isApproved ? "text-green-600" : "text-gray-600"}`}>{name}</p>
        </div>
        {isApproved && grade && (
          <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-semibold">{grade}</span>
        )}
      </div>
      <div className={`text-xs ${isApproved ? "text-green-600" : "text-gray-500"}`}>
        <p>
          {type} • {hours}h • {credits} créditos
        </p>
        {isApproved && <p className="mt-1 text-green-700 font-semibold">✓ Aprobado</p>}
      </div>
    </div>
  )
}
