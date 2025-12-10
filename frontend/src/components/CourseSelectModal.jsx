// src/components/CourseSelectModal.jsx
import { useState, useEffect, useMemo } from "react";
import CourseSelectCard from "./CourseSelectCard";
import CourseDetailModal from "./CourseDetailModal";

export default function CourseSelectModal({
  onClose,
  onConfirm,
  COURSES_URL,
  takenCourses = [], // opcional: lista de cursos ya cursados (codigo strings)
  maxCredits = 20, // default
}) {
  const [selected, setSelected] = useState([]);
  const [courses, setCourses] = useState([]);
  const [detailCourse, setDetailCourse] = useState(null);
  const [sortBy, setSortBy] = useState("semestre"); // or 'horario'
  const [availableCredits, setAvailableCredits] = useState(maxCredits);

  useEffect(() => {
    setAvailableCredits(maxCredits);
  }, [maxCredits]);

  useEffect(() => {
    fetch(`${COURSES_URL}/courses`)
      .then((res) => res.json())
      .then((data) => {
        let list = data;
        if (Array.isArray(data) && data.length === 1 && data[0] && data[0].materias) {
          list = Object.values(data[0].materias);
        } else if (data && typeof data === "object" && data.materias) {
          list = Object.values(data.materias);
        } else if (!Array.isArray(data)) {
          // fallback: object of courses
          list = Object.values(data || {});
        }
        setCourses(list || []);
      })
      .catch((err) => console.error("Error fetching courses:", err));
  }, [COURSES_URL]);

  // filtro: si tenemos takenCourses mostramos solo las no-cursadas
  const visibleCourses = useMemo(() => {
    const notTaken = courses.filter((c) => {
      const code = c.codigo ?? c.code ?? c.id;
      if (!code) return true;
      if (!Array.isArray(takenCourses) || takenCourses.length === 0) return true;
      return !takenCourses.includes(String(code));
    });

    if (sortBy === "horario") {
      // intento de ordenar por horas (si tienen `horas` o `grupos` con clases)
      return [...notTaken].sort((a, b) => {
        const aHours = a.horas ?? a.hours ?? 0;
        const bHours = b.horas ?? b.hours ?? 0;
        return (aHours - bHours) || (String(a.codigo).localeCompare(String(b.codigo)));
      });
    }

    // default: semestre asc
    return [...notTaken].sort((a, b) => {
      const sa = a.semestre ?? a.semester ?? 999;
      const sb = b.semestre ?? b.semester ?? 999;
      return Number(sa) - Number(sb);
    });
  }, [courses, takenCourses, sortBy]);

  const toggleCourse = (courseObj) => {
    const codigo = courseObj.codigo;
    const credit = Number(courseObj.creditos ?? courseObj.credits ?? 0) || 0;

    setSelected((prev) => {
      if (prev.includes(codigo)) {
        // deseleccionar: sumar créditos de nuevo
        setAvailableCredits((c) => c + credit);
        return prev.filter((c) => c !== codigo);
      } else {
        if (credit > availableCredits) {
          alert(`No hay créditos disponibles. Quedan ${availableCredits}. Esta materia usa ${credit}.`);
          return prev;
        }
        setAvailableCredits((c) => c - credit);
        return [...prev, codigo];
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Selecciona tus materias</h2>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">Créditos disponibles: <strong>{availableCredits}</strong></div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent border rounded px-2 py-1">
                <option value="semestre">Ordenar por semestre</option>
                <option value="horario">Ordenar por horas / horario</option>
              </select>
              <button onClick={onClose} className="text-white/60 hover:text-white/80 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(() => {
              // agrupo por semestre (manteniendo orden si sortBy==horario)
              if (sortBy === "horario") {
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {visibleCourses.map((course) => (
                      <CourseSelectCard
                        key={course.codigo}
                        course={course}
                        selected={selected.includes(course.codigo)}
                        onToggle={() => toggleCourse(course)}
                        onShow={(c) => setDetailCourse(c)}
                      />
                    ))}
                  </div>
                );
              }

              const coursesBySemester = visibleCourses.reduce((acc, course) => {
                const semester = course.semestre ?? course.semester ?? "Sin semestre";
                if (!acc[semester]) acc[semester] = [];
                acc[semester].push(course);
                return acc;
              }, {});

              const sortedSemesters = Object.keys(coursesBySemester).sort((a, b) => {
                if (a === 'Sin semestre') return 1;
                if (b === 'Sin semestre') return -1;
                return parseInt(a) - parseInt(b);
              });

              return sortedSemesters.map((semester) => (
                <div key={semester} className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-3">Semestre {semester}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {coursesBySemester[semester].map((course) => (
                      <CourseSelectCard
                        key={course.codigo}
                        course={course}
                        selected={selected.includes(course.codigo)}
                        onToggle={() => toggleCourse(course)}
                        onShow={(c) => setDetailCourse(c)}
                      />
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                const seleccionadas = courses.filter((c) => selected.includes(c.codigo));
                onConfirm(seleccionadas);
              }}
              className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
            >
              Confirmar selección
            </button>
          </div>
        </div>
      </div>

      {detailCourse && (
        <CourseDetailModal
          course={detailCourse}
          onClose={() => setDetailCourse(null)}
        />
      )}
    </>
  );
}
