export default function CourseDetailModal({ course, onClose }) {
  if (!course) return null;

  const hours = course.horas ?? course.hours ?? "-";
  const credits = course.creditos ?? course.credits ?? "-";
  const requisitos = course.requisitos ?? course.prerequisitos ?? [];
  const gruposMap = course.grupos ?? {};

  // Normalize grupos into array of { id, ... }
  const grupos = Array.isArray(gruposMap)
    ? gruposMap
    : Object.entries(gruposMap || {}).map(([k, v]) => ({ id: k, ...v }));

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{course.nombre}</h2>
            <p className="text-sm text-muted-foreground">Código: {course.codigo}</p>
            <p className="text-sm mt-2">Semestre: {course.semestre ?? "N/A"}</p>
            <p className="text-sm">Horas: {hours} • Créditos: {credits}</p>
          </div>

          <div className="ml-4">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-md bg-gray-200 text-black text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>

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
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay grupos disponibles.</p>
          ) : (
            <div className="space-y-3">
              {grupos.map((g) => (
                <div key={g.id || g.nombre} className="p-3 border rounded-md">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{g.nombre ?? g.id}</div>
                      <div className="text-sm text-muted-foreground">{g.profesor ?? g.professor ?? "-"}</div>
                    </div>
                    <div className="text-sm">
                      Cupos: {g.disponible ?? g.available ?? g.maximo ?? "-"}
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
      </div>
    </div>
  );
}
