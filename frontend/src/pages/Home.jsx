import { useState } from "react"
import Pensum from "../components/Pensum"
import CourseSelectModal from "../components/CourseSelectModal"

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false)
  const [cursadas, setCursadas] = useState([])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground items-center">
      <header className="w-full bg-black/40 border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-white">Horario Óptimo</h1>
        <span className="text-sm text-gray-400">"username"</span>
      </header>
      <div className="mb-4 flex align-middle items-center">
        <p className="m-2 text-lg sm:text-xl text-gray-300 leading-relaxed">
          Explora todas tus materias obligatorias y electivas, organiza tus
          semestres y construye el mejor camino académico de manera sencilla y
          rápida.
        </p>
      </div>
 
      <Pensum onVerMas={() => setModalOpen(true)} />

      {modalOpen && (
        <CourseSelectModal
          onClose={() => setModalOpen(false)}
          onConfirm={(seleccionadas) => {
            setCursadas(seleccionadas)
            setModalOpen(false)
          }}
        />
      )}
    </div>
  )
}