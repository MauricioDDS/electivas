import { useState } from "react";

export default function useAddGroup(COURSES_URL, course) {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupData, setGroupData] = useState({
    group_name: "",
    schedule: "",
    available_slots: "",
    professor: "",
  });
  const [loading, setLoading] = useState(false);

  const base = COURSES_URL || import.meta.env.VITE_COURSES_URL;

  const handleAddGroup = async () => {
    setLoading(true);
    try {
      if (!base) throw new Error("COURSES_URL not configured");
      if (!course?.codigo) throw new Error("course code missing");

      const payload = {
        group_name: groupData.group_name || "",
        schedule: groupData.schedule || "",
        available_slots: Math.max(parseInt(groupData.available_slots || "0", 10) || 0, 0),
        professor: groupData.professor || "",
      };

      const resp = await fetch(`${base}/courses/${course.codigo}/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ADMIN-KEY": import.meta.env.VITE_ADMIN_KEY,
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text().catch(() => "");
      let body;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { raw: text };
      }

      if (!resp.ok) {
        console.error("Server error creating group:", body);
        throw new Error(body.detail || body.message || body.raw || `HTTP ${resp.status}`);
      }

      const groupId = body.group?.group_id || body.group_id || body.group?.id || body.group?.group_id || (body.group && body.group.id) || body.group?.id || body.group?.group_id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.id || body.group?.group_id || body.group?.group_id || body.group_id || null;

      const id = groupId || `local-${Math.random().toString(36).slice(2, 9)}`;

      const created = {
        id,
        group_name: payload.group_name,
        nombre: payload.group_name,
        schedule: payload.schedule,
        horario: payload.schedule,
        available_slots: payload.available_slots,
        disponible: Math.max(payload.available_slots, 0),
        professor: payload.professor,
        profesor: payload.professor,
      };

      setGroupData({
        group_name: "",
        schedule: "",
        available_slots: "",
        professor: "",
      });
      setShowAddGroup(false);

      return created;
    } catch (err) {
      console.error("handleAddGroup error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    showAddGroup,
    setShowAddGroup,
    groupData,
    setGroupData,
    handleAddGroup,
    loading,
  };
}