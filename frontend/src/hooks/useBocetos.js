import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useBocetos() {
  const { token, user } = useAuth();
  const CALENDAR_URL = import.meta.env.VITE_CALENDAR_URL;

  const [bocetos, setBocetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  });

  const fetchBocetos = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${CALENDAR_URL}/bocetos/?student_id=${user.id}`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error("Error al cargar bocetos");
      const data = await res.json();
      setBocetos(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, token, CALENDAR_URL]);

  const createBoceto = async (name, description = "") => {
    try {
      const res = await fetch(`${CALENDAR_URL}/bocetos/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          student_id: user.id,
          semester: 1,
          name,
          description
        })
      });
      if (!res.ok) throw new Error("Error al crear boceto");
      const newBoceto = await res.json();

      setBocetos(prev => [newBoceto, ...prev]);
      return newBoceto;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeBoceto = async (bocetoId) => {
    try {
      const res = await fetch(`${CALENDAR_URL}/bocetos/${bocetoId}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setBocetos(prev => prev.filter(b => b.id !== bocetoId));
    } catch (err) {
      setError(err.message);
    }
  };

  // --- SAFETY HELPER ---
  const formatTimeForBackend = (rawTime) => {
    if (rawTime === null || rawTime === undefined) return "00:00";
    const timeStr = String(rawTime).trim();

    // Si es un número puro tipo 800, 1400 -> convertir a 08:00, 14:00
    if (!timeStr.includes(":")) {
      if (timeStr.length <= 2) return `${timeStr.padStart(2, '0')}:00`; // "8" -> "08:00"
      if (timeStr.length === 3) return `0${timeStr[0]}:${timeStr.slice(1)}`; // "830" -> "08:30"
      if (timeStr.length === 4) return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`; // "1430" -> "14:30"
      return "00:00";
    }

    // Normalizar "8:00:00" -> "08:00"
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      return `${h}:${m}`;
    }
    return "00:00";
  };

  // ... (resto del hook)

  // 4. AGREGAR GRUPO (Corregido para detectar nombres de propiedades)
  const addGroupToBoceto = async (bocetoId, curso, grupoSeleccionado) => {
    const clases = grupoSeleccionado.clases || grupoSeleccionado.schedule || [];

    console.log("Procesando grupo:", grupoSeleccionado); // <-- MIRA ESTO EN CONSOLA

    const payload = {
      course_code: String(curso.codigo),
      course_name: curso.nombre,
      group_name: grupoSeleccionado.nombre || grupoSeleccionado.group_name || "A",
      credits: curso.creditos || 0,

      schedule: clases.map(c => {
        // DETECCIÓN INTELIGENTE DE PROPIEDADES
        // Tu API puede traer la hora en cualquiera de estas variables:
        const rawStart = c.horaInicio || c.start || c.inicio || c.hora_inicio || c.start_time;
        const rawEnd = c.horaFin || c.end || c.fin || c.hora_fin || c.end_time;
        const rawDay = c.dia || c.day;

        return {
          dia: String(rawDay),
          start: formatTimeForBackend(rawStart),
          end: formatTimeForBackend(rawEnd),
          salon: c.salon || c.room || "Sin Asignar"
        };
      }),

      meta: { ...curso, grupo: grupoSeleccionado }
    };

    console.log("Enviando Payload a Backend:", payload); // <-- VERIFICA QUE AQUÍ NO DIGA 00:00

    const res = await fetch(`${CALENDAR_URL}/bocetos/${bocetoId}/groups`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Error agregando materia");
    }

    const updatedBoceto = await res.json();
    setBocetos(prev => prev.map(b => b.id === bocetoId ? updatedBoceto : b));
    return updatedBoceto;
  };

  return {
    bocetos,
    loading,
    error,
    fetchBocetos,
    createBoceto,
    removeBoceto,
    addGroupToBoceto
  };
}