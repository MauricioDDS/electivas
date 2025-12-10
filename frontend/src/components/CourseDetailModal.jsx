// TU ARCHIVO PEGADO AQUÍ SIN CAMBIAR NI UNA PUTA COSA
// (solo encierro dentro de bloque de código)

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import RequestCupoModal from "./RequestCupoModal";
import useAddGroup from "@/hooks/useAddGroup";

export default function CourseDetailModal({ course, onClose, COURSES_URL, isAdmin: isAdminProp }) {
  if (!course) return null;

  const { user } = useAuth();
  const isAdmin = Boolean(isAdminProp) || (user && user.role === "ADMIN");

  const [showCupoModal, setShowCupoModal] = useState(false);
  const {
    showAddGroup,
    setShowAddGroup,
    groupData,
    setGroupData,
    handleAddGroup,
    loading: adding,
  } = useAddGroup(COURSES_URL, course);

  const initialGroups = useMemo(() => {
    const gruposMap = course.grupos ?? {};
    if (Array.isArray(gruposMap)) return gruposMap;
    return Object.entries(gruposMap || {}).map(([k, v]) => ({ id: k, ...v }));
  }, [course.grupos]);

  const [localGroups, setLocalGroups] = useState(initialGroups);

  const hours = course.horas ?? course.hours ?? "-";
  const credits = course.creditos ?? course.credits ?? "-";
  const requisitos = course.requisitos ?? course.prerequisitos ?? [];

  const totalCupos = localGroups.reduce((acc, g) => {
    const val = (g.disponible ?? g.available ?? g.available_slots ?? g.maximo ?? 0);
    const n = parseInt(val, 10) || 0;
    return acc + Math.max(n, 0);
  }, 0);

  const onConfirmAddGroup = async () => {
    try {
      const created = await handleAddGroup();
      const normalized = {
        id: created.id,
        nombre: created.nombre ?? created.group_name ?? created.id,
        group_name: created.group_name ?? created.nombre,
        horario: created.horario ?? created.schedule ?? "",
        schedule: created.schedule ?? created.horario ?? "",
        disponible: Math.max(Number(created.disponible ?? created.available_slots ?? 0), 0),
        available_slots: Math.max(Number(created.available_slots ?? created.disponible ?? 0), 0),
        professor: created.professor ?? created.profesor ?? "",
        profesor: created.professor ?? created.profesor ?? "",
      };

      setLocalGroups((prev) => [{ id: normalized.id, ...normalized }, ...prev]);
    } catch (err) {
      alert(`Error creando grupo: ${err?.message ?? err}`);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{course.nombre}</h2>
              <p className="text-sm text-muted-foreground">Código: {course.codigo}</p>
              <p className="text-sm mt-2">Semestre: {course.semestre ?? "N/A"}</p>
              <p className="text-sm">Horas: {hours} • Créditos: {credits}</p>
            </div>

            <div className="flex gap-2 ml-4">
              {isAdmin && (
                <button
                  onClick={() => setShowAddGroup(!showAddGroup)}
                  className={`px-3 py-1 rounded-md text-sm text-white font-medium shadow ${
                    showAddGroup ? "bg-gray-500 hover:bg-gray-600" : "bg-gray-500 hover:bg-gray-600"
                  } transition`}
                >
                  {showAddGroup ? "Cancelar" : "+ Grupo"}
                </button>
              )}

              <button
                onClick={onClose}
                className="px-3 py-1 rounded-md bg-gray-200 text-black text-sm hover:bg-gray-300 transition"
              >
                Cerrar
              </button>
            </div>
          </div>

          {showAddGroup && (
            <div className="mt-4 border-t border-gray-300 pt-4">
              <h3 className="font-semibold mb-2">Nuevo grupo</h3>
              <div className="space-y-2">
                <input
                  placeholder="Nombre del grupo (ej: 1155305-B)"
                  value={groupData.group_name || ""}
                  onChange={(e) => setGroupData({ ...groupData, group_name: e.target.value })}
                  className="w-full border rounded p-2 text-sm"
                />
                <input
                  placeholder="Horario (ej: Lunes 8-10)"
                  value={groupData.schedule || ""}
                  onChange={(e) => setGroupData({ ...groupData, schedule: e.target.value })}
                  className="w-full border rounded p-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Cupos disponibles"
                  value={groupData.available_slots ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const n = val === "" ? "" : Math.max(parseInt(val || "0", 10) || 0, 0);
                    setGroupData({ ...groupData, available_slots: n });
                  }}
                  className="w-full border rounded p-2 text-sm"
                />
                <input
                  placeholder="Profesor"
                  value={groupData.professor || ""}
                  onChange={(e) => setGroupData({ ...groupData, professor: e.target.value })}
                  className="w-full border rounded p-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={onConfirmAddGroup}
                    disabled={adding}
                    className={`mt-2 px-4 py-2 rounded-md text-white text-sm font-medium transition ${
                      adding ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {adding ? "Creando..." : "Confirmar grupo"}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddGroup(false);
                      setGroupData({ group_name: "", schedule: "", available_slots: "", professor: "" });
                    }}
                    className="mt-2 px-4 py-2 rounded-md bg-gray-200 text-black text-sm hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold">Requisitos</h3>
            {requisitos && requisitos.length ? (
              <ul className="list-disc list-inside text-sm">
                {requisitos.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hay requisitos.</p>
            )}
          </div>

          <div className="mt-4">
            <h3 className="font-semibold">Grupos</h3>
            {localGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay grupos disponibles.</p>
            ) : (
              <div className="space-y-3">
                {localGroups.map((g) => (
                  <div key={g.id ?? g.nombre} className="p-3 border rounded-md">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{g.nombre ?? g.group_name ?? g.id}</div>
                        <div className="text-sm text-muted-foreground">{g.profesor ?? g.professor ?? "-"}</div>
                      </div>
                      <div className="text-sm">
                        Cupos: {Math.max(Number(g.disponible ?? g.available ?? g.available_slots ?? g.maximo ?? 0), 0)}
                      </div>
                    </div>

                    {g.clases && g.clases.length ? (
                      <div className="mt-2 text-sm">
                        {g.clases.map((c, idx) => (
                          <div key={idx}>
                            Día: {c.dia ?? c.day} • {c.horaInicio ?? c.hora_inicio} - {c.horaFin ?? c.hora_fin} • {c.salon ?? c.location ?? "-"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Horario no disponible.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(localGroups.length === 0 || totalCupos <= 0) && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCupoModal(true)}
                className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
              >
                Solicitar cupo
              </button>
            </div>
          )}

        </div>
      </div>

      {showCupoModal && (
        <RequestCupoModal
          course={course}
          onClose={() => setShowCupoModal(false)}
          COURSES_URL={import.meta.env.VITE_COURSES_URL}
        />
      )}
    </>
  );
}
