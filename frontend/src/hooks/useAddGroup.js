import { useState } from "react";

export default function useAddGroup(COURSES_URL, course) {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupData, setGroupData] = useState({
    group_name: "",
    schedule: "",
    available_slots: "",
    professor: "",
  });

  const base = COURSES_URL || import.meta.env.VITE_COURSES_URL;

  const handleAddGroup = async () => {
    try {
      if (!base) throw new Error("COURSES_URL is not defined");
      if (!course?.codigo) throw new Error("course.codigo is missing");

      const payload = {
        group_name: groupData.group_name,
        schedule: groupData.schedule,
        available_slots: parseInt(groupData.available_slots ?? "0", 10) || 0,
        professor: groupData.professor || null,
      };

      console.log("➡️ POST", `${base}/courses/${course.codigo}/groups`);
      console.log("payload:", payload);

      const resp = await fetch(`${base}/courses/${course.codigo}/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ADMIN-KEY": import.meta.env.VITE_ADMIN_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("server error:", resp.status, text);
        throw new Error(text || `HTTP ${resp.status}`);
      }

      alert("✅ Grupo creado y notificaciones enviadas!");
      setShowAddGroup(false);
      setGroupData({
        group_name: "",
        schedule: "",
        available_slots: "",
        professor: "",
      });
    } catch (err) {
      console.error("handleAddGroup error:", err);
      alert(`❌ Error creando grupo: ${err.message || err}`);
    }
  };

  return {
    showAddGroup,
    setShowAddGroup,
    groupData,
    setGroupData,
    handleAddGroup,
  };
}
