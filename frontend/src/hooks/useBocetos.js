import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useBocetos() {
  const { token, user } = useAuth();
  const CALENDAR_URL = import.meta.env.VITE_CALENDAR_URL;

  const [bocetos, setBocetos] = useState([]);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // GET bocetos del usuario
  const fetchBocetos = async () => {
    const res = await fetch(`${CALENDAR_URL}/bocetos/student/${user.id}`, {
      headers
    });
    const data = await res.json();
    setBocetos(data);
  };

  // crear un nuevo boceto vacío
  const createBoceto = async (name = "Mi boceto") => {
    const res = await fetch(`${CALENDAR_URL}/bocetos/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        student_id: user.id,
        name
      })
    });

    const data = await res.json();
    setBocetos((prev) => [...prev, data]);
    return data;
  };

  // agregar grupos al boceto
  const addGroup = async (bocetoId, group) => {
    const res = await fetch(`${CALENDAR_URL}/bocetos/${bocetoId}/add`, {
      method: "POST",
      headers,
      body: JSON.stringify(group)
    });

    const data = await res.json();
    fetchBocetos();
    return data;
  };

  return {
    bocetos,
    fetchBocetos,
    createBoceto,
    addGroup
  };
}
