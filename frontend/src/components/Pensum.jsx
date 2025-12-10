"use client"

import { useState } from "react"

export default function Pensum({ onVerMas, COURSES_URL, pensum }) {
  const [expanded, setExpanded] = useState(null)

  if (!pensum || !pensum.materias) {
    return <p className="text-center text-gray-500">Cargando pensum...</p>
  }

  // Group materias by semestre
  const grouped = {}
  Object.values(pensum.materias).forEach((materia) => {
    const sem = materia.semestre || 0
    if (!grouped[sem]) grouped[sem] = []
    grouped[sem].push(materia)
  })

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      {Object.keys(grouped)
        .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
        .map((semestre) => (
          <div key={semestre} className="mb-8">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Semestre {semestre}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[semestre].map((materia) => (
                <div
                  key={materia.codigo}
                  className={`
                    p-4 rounded-lg border-2 transition-all cursor-pointer
                    ${
                      materia.isApproved
                        ? "bg-green-50 border-green-400 shadow-md hover:shadow-lg"
                        : "bg-gray-50 border-gray-300 hover:border-gray-400 hover:shadow"
                    }
                  `}
                  onClick={() => setExpanded(expanded === materia.codigo ? null : materia.codigo)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-bold ${materia.isApproved ? "text-green-700" : "text-gray-900"}`}>
                        {materia.codigo}
                      </h4>
                      <p className={`text-sm ${materia.isApproved ? "text-green-600" : "text-gray-600"}`}>
                        {materia.nombre}
                      </p>
                    </div>
                    {materia.isApproved && (
                      <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                        {materia.grade}
                      </span>
                    )}
                  </div>

                  <div className={`text-xs mt-2 ${materia.isApproved ? "text-green-600" : "text-gray-500"}`}>
                    <p>
                      {materia.isElectiva ? "Electiva" : "Obligatoria"} • {materia.horas}h • {materia.creditos} créditos
                    </p>
                    {materia.isApproved && (
                      <p className="mt-1 text-green-700 font-semibold">✓ Aprobado en {materia.completedIn}</p>
                    )}
                  </div>

                  {materia.requisitos && materia.requisitos.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">Requisitos: {materia.requisitos.join(", ")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
