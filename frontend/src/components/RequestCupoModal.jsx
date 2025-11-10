import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCupoRequest } from "@/hooks/UseCupoRequest"

export default function RequestCupoModal({ course, onClose, COURSES_URL }) {
  const { user } = useAuth();
  const { requestCupo, loading, status } = useCupoRequest(COURSES_URL);
  const [message, setMessage] = useState(
    `Hola, me gustaría solicitar cupo para la materia ${course.nombre} (${course.codigo}).`
  );

  const handleSend = async () => {
    if (!user?.email) {
      alert("Debes iniciar sesión para enviar la solicitud.");
      return;
    }

    await requestCupo({
      courseCode: course.codigo,
      groupName: "Grupo A",
      userEmail: user.email,
      message,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md text-foreground">
        <h2 className="text-xl font-bold mb-4">Solicitar cupo</h2>

        {status === "success" ? (
          <div className="flex flex-col items-center">
            <div className="text-green-500 font-semibold mb-4 text-center">
              ✅ Se ha enviado tu solicitud con éxito.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 transition"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-2">
              Enviando como:{" "}
              <span className="font-medium">{user?.email || "No autenticado"}</span>
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded-md bg-background text-foreground mb-4"
              rows={5}
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className={`px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 transition ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>

            {status === "error" && (
              <div className="text-red-500 mt-3 text-center">
                ❌ Hubo un error al enviar la solicitud.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
