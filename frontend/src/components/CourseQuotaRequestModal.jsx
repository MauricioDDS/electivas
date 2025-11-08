"use client"

import { useState } from "react"

export default function CourseQuotaRequestModal({ isOpen, onClose, courses }) {
  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState("") // "success" or "error"

  const REQUESTS_URL = import.meta.env.VITE_REQUESTS_URL || "http://localhost:8021"

  const selectedCourseData = courses.find((c) => c.codigo === selectedCourse)
  const groups = selectedCourseData?.grupos || []

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedCourse || !selectedGroup || !email) {
      setMessage("Por favor completa todos los campos")
      setMessageType("error")
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const courseName = selectedCourseData?.nombre || selectedCourse
      const requestBody = {
        to: email,
        subject: "Solicitud de Cupo - Materia",
        message: `Solicito cupo para matricularme en la materia "${courseName}" en el grupo "${selectedGroup}".`,
      }

      const response = await fetch(`${REQUESTS_URL}/api/requests/api/test-email/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        setMessage("¡Solicitud enviada correctamente!")
        setMessageType("success")
        setSelectedCourse("")
        setSelectedGroup("")
        setEmail("")

        // Auto-close después de 2 segundos
        setTimeout(() => {
          onClose()
          setMessage(null)
        }, 2000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.message || `Error: ${response.status}`)
      }
    } catch (err) {
      console.error("Error sending request:", err)
      setMessage(err.message || "Ocurrió un error al enviar la solicitud")
      setMessageType("error")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Solicitar Cupo</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seleccionar Materia */}
          <div>
            <label className="block text-sm font-medium mb-2">Materia *</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value)
                setSelectedGroup("") // Reset grupo
              }}
              className="w-full px-3 py-2 border rounded-md bg-transparent text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Selecciona una materia</option>
              {courses.map((course) => (
                <option key={course.codigo} value={course.codigo}>
                  {course.nombre} ({course.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Seleccionar Grupo */}
          <div>
            <label className="block text-sm font-medium mb-2">Grupo *</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-transparent text-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={!selectedCourse || groups.length === 0}
            >
              <option value="">
                {!selectedCourse
                  ? "Selecciona una materia primero"
                  : groups.length === 0
                    ? "Sin grupos disponibles"
                    : "Selecciona un grupo"}
              </option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email destino *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="direccion@programa.com"
              className="w-full px-3 py-2 border rounded-md bg-transparent text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Mensaje */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                messageType === "success"
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-red-100 text-red-800 border border-red-300"
              }`}
            >
              {message}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-md border bg-transparent text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md bg-orange-600 text-white font-medium shadow-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
