import { useState } from "react";

export function useCupoRequest(baseUrl) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const requestCupo = async ({ courseCode, groupName, userEmail, message }) => {
    setLoading(true);
    setStatus(null);
    try {
      const resp = await fetch(`${import.meta.env.VITE_COURSES_URL}/request-cupo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ADMIN-KEY": import.meta.env.VITE_ADMIN_KEY,
        },
        body: JSON.stringify({
          course_code: courseCode,
          group_name: groupName,
          user_email: userEmail,
          message: message,
        }),
      });

      console.log("➡️ Sending request to:", `${import.meta.env.VITE_COURSES_URL}/request-cupo`);
      console.log("Payload:", { courseCode, groupName, userEmail, message });

      if (!resp.ok) {
        const err = await resp.text();
        console.error("Error del servidor:", err);
        throw new Error("Error al enviar solicitud");
      }

      setStatus("success");
    } catch (err) {
      console.error("Fallo al enviar cupo:", err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return { requestCupo, loading, status };
}
