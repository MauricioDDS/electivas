import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
const COURSES_URL = import.meta.env.VITE_COURSES_URL;

export default function CourseDetail() {
  const { code } = useParams(); // code is codigo
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${COURSES_URL}/courses`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.materias ? Object.values(data.materias) : []);
        const found = list.find((m) => (m.codigo || m.code || "").toString() === decodeURIComponent(code));
        setCourse(found || null);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!course) return <div className="p-6">Materia no encontrada</div>;

  const grupos = course.grupos ? (Array.isArray(course.grupos) ? course.grupos : Object.entries(course.grupos).map(([k,v]) => ({ id:k, ...v }))) : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">{course.nombre || course.title}</h2>
      <p className="text-sm text-muted-foreground mb-4">Código: {course.codigo || course.code}</p>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Detalles</h3>
        <p>Horas: {course.horas ?? course.hours}</p>
        <p>Créditos: {course.creditos ?? course.credits}</p>
        <p>Requisitos: {(course.requisitos || []).join(", ") || "N/A"}</p>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Grupos disponibles</h3>
        {grupos.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hay grupos</div>
        ) : (
          <div className="space-y-3">
            {grupos.map((g) => (
              <div key={g.id || g.nombre} className="p-3 border rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{g.nombre || g.group_code}</div>
                    <div className="text-sm text-muted-foreground">{g.profesor || g.professor || "Sin profesor"}</div>
                  </div>
                  <div className="text-sm">
                    Cupos: {g.disponible ?? g.disponible ?? g.available ?? g.capacity ?? "?"}
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  {g.clases && g.clases.length ? (
                    <div>
                      {g.clases.map((c, idx) => (
                        <div key={idx}>{`Día ${c.dia} • ${c.horaInicio ?? c.hora_inicio} - ${c.horaFin ?? c.hora_fin} • ${c.salon ?? c.location}`}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Horario no disponible</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
