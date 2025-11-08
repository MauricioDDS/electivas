"use client"

import { useState } from "react"
import { CheckCircle, AlertCircle, Loader2, X } from "lucide-react"

export function EnrollmentRequestModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")

  const [formData, setFormData] = useState({
    courseName: "",
    groupNumber: "",
    email: "",
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setStatus("idle")

    try {
      const requestBody = {
        to: formData.email || undefined,
        subject: `Solicitud de Cupo: ${formData.courseName} - Grupo ${formData.groupNumber}`,
        message: `Solicitud de cupo para matricular\n\nMateria: ${formData.courseName}\nGrupo: ${formData.groupNumber}\n\nSolicitado por: ${formData.email || "No especificado"}`,
      }

      const response = await fetch("http://localhost:8021/api/requests/api/test-email/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        setStatus("success")
        setMessage("Solicitud enviada correctamente. La dirección de programa revisará tu solicitud.")
        setFormData({
          courseName: "",
          groupNumber: "",
          email: "",
        })
        setTimeout(() => {
          setOpen(false)
          setStatus("idle")
          setMessage("")
        }, 3000)
      } else {
        setStatus("error")
        setMessage("Error al enviar la solicitud. Por favor, intenta nuevamente.")
      }
    } catch (error) {
      setStatus("error")
      setMessage("No se pudo conectar con el servidor. Verifica tu conexión.")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Solicitar Cupo de Materia
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Solicitud de Cupo</h2>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Completa el formulario para enviar tu solicitud a la dirección de programa
        </p>

        {/* Success Alert */}
        {status === "success" && (
          <div className="mb-4 p-4 border border-green-200 bg-green-50 rounded-md flex gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-900 text-sm">{message}</p>
          </div>
        )}

        {/* Error Alert */}
        {status === "error" && (
          <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-md flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-900 text-sm">{message}</p>
          </div>
        )}

        {/* Form */}
        {status === "idle" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Course Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Materia *</label>
              <input
                type="text"
                name="courseName"
                placeholder="Ej: Algoritmos y Estructuras de Datos"
                value={formData.courseName}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Group Number */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Grupo *</label>
              <input
                type="text"
                name="groupNumber"
                placeholder="Ej: 01"
                value={formData.groupNumber}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Email (opcional)</label>
              <input
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Solicitud"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
