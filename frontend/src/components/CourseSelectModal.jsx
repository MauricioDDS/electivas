import { useState, useEffect, useMemo, useCallback } from "react";
import CourseSelectCard from "./CourseSelectCard";
import CourseDetailModal from "./CourseDetailModal";

export default function CourseSelectModal({
  onClose,
  onConfirm,
  COURSES_URL,
  takenCourses = [],
  maxCredits = 20,
}) {
  const [selected, setSelected] = useState([]);
  const [courses, setCourses] = useState([]);
  const [detailCourse, setDetailCourse] = useState(null);
  const [sortBy, setSortBy] = useState("semestre");
  const [availableCredits, setAvailableCredits] = useState(maxCredits);
  useEffect(() => {
    setAvailableCredits(maxCredits);
  }, [maxCredits]);

  useEffect(() => {
    fetch(`${COURSES_URL}/courses`)
      .then((res) => res.json())
      .then((data) => {
        let list = data;
        if (Array.isArray(data) && data.length === 1 && data[0]?.materias) {
          list = Object.values(data[0].materias);
        } else if (data?.materias) {
          list = Object.values(data.materias);
        } else if (!Array.isArray(data)) {
          list = Object.values(data || {});
        }
        setCourses(list || []);
      })
      .catch((err) => console.error("Error fetching courses:", err));
  }, [COURSES_URL]);

  const courseMap = useMemo(() => {
    return courses.reduce((map, course) => {
      map[String(course.codigo)] = course;
      return map;
    }, {});
  }, [courses]);

  const takenCodes = useMemo(() => new Set(takenCourses.map(String)), [takenCourses]);
  const reverseDependencyMap = useMemo(() => {
    const map = {};
    courses.forEach(course => {
      const requirements = course.requisitos ?? course.requirements ?? [];
      requirements.forEach(req => {
        const reqCode = String(req).trim();
        if (reqCode.startsWith("Cre:")) return;

        if (!map[reqCode]) map[reqCode] = [];
        map[reqCode].push(String(course.codigo));
      });
    });
    return map;
  }, [courses]);

  const disabledCourses = useMemo(() => {
    const blocked = new Set();
    if (selected.length === 0) return blocked;

    const blockAncestors = (code) => {
      const course = courseMap[code];
      if (!course) return;
      const reqs = course.requisitos ?? course.requirements ?? [];

      reqs.forEach(req => {
        const reqCode = String(req).trim();
        if (reqCode.startsWith("Cre:")) return;

        if (!blocked.has(reqCode)) {
          blocked.add(reqCode);
          blockAncestors(reqCode); 
        }
      });
    };

    const blockDescendants = (code) => {
      const dependents = reverseDependencyMap[code] || [];

      dependents.forEach(depCode => {
        if (!blocked.has(depCode)) {
          blocked.add(depCode);
          blockDescendants(depCode);
        }
      });
    };

    selected.forEach(selCode => {
      blockAncestors(selCode);
      blockDescendants(selCode);
    });

    return blocked;
  }, [selected, courseMap, reverseDependencyMap]);


  const toggleCourse = (courseObj) => {
    const codigo = String(courseObj.codigo);
    const credit = Number(courseObj.creditos ?? courseObj.credits ?? 0) || 0;

    setSelected((prev) => {
      if (prev.includes(codigo)) {
        setAvailableCredits((c) => c + credit);
        return prev.filter((c) => c !== codigo);
      }

      else {
        if (credit > availableCredits) {
          alert(`No hay créditos disponibles. Quedan ${availableCredits} y esta materia usa ${credit}.`);
          return prev;
        }

        if (disabledCourses.has(codigo)) return prev;

        setAvailableCredits((c) => c - credit);
        return [...prev, codigo];
      }
    });
  };

  const visibleCourses = useMemo(() => {

    const notTaken = courses.filter((c) => !takenCodes.has(String(c.codigo)));

    if (sortBy === "horario") {
      return [...notTaken].sort((a, b) => {
        const aHours = a.horas ?? 0;
        const bHours = b.horas ?? 0;
        return (aHours - bHours) || String(a.codigo).localeCompare(String(b.codigo));
      });
    }
    return [...notTaken].sort((a, b) => {
      const sa = Number(a.semestre ?? 999);
      const sb = Number(b.semestre ?? 999);
      return sa - sb;
    });
  }, [courses, sortBy, takenCodes]);

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
        <div className="bg-card border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Selecciona tus materias</h2>
              <div className="flex gap-2 text-sm mt-1">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-card border border-white/20 rounded-sm"></span> Disponibles</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-900 border border-green-500 rounded-sm"></span> Seleccionadas</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white/10 rounded-sm"></span> Bloqueadas</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg border font-medium transition-colors ${availableCredits < 0 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-primary/10 text-primary border-primary/20'}`}>
                Créditos: <span className="text-lg font-bold">{availableCredits}</span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                <option value="semestre">Por Semestre</option>
                <option value="horario">Por Horas</option>
              </select>

              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Grid de Materias */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              const coursesBySemester = visibleCourses.reduce((acc, course) => {
                const sem = course.semestre ?? "Otros";
                if (!acc[sem]) acc[sem] = [];
                acc[sem].push(course);
                return acc;
              }, {});

              const sortedKeys = Object.keys(coursesBySemester).sort((a, b) => {
                if (a === "Otros") return 1;
                if (b === "Otros") return -1;
                return Number(a) - Number(b);
              });

              return sortedKeys.map((sem) => (
                <div key={sem} className="mb-8">
                  <h3 className="text-lg font-semibold text-foreground/80 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-primary font-bold text-sm border border-white/5">
                      {sem}
                    </span>
                    Semestre {sem}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {coursesBySemester[sem].map((course) => {
                      const isSel = selected.includes(String(course.codigo));
                      const isDisabled = !isSel && disabledCourses.has(String(course.codigo));

                      return (
                        <CourseSelectCard
                          key={course.codigo}
                          course={course}
                          selected={isSel}
                          disabled={isDisabled}
                          onToggle={() => toggleCourse(course)}
                          onShow={(c) => setDetailCourse(c)}
                        />
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {selected.length === 0 ? "Selecciona una materia para comenzar" : `${selected.length} materias seleccionadas`}
            </span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-6 py-2 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors text-foreground">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const objs = courses.filter((c) => selected.includes(String(c.codigo)));
                  onConfirm(objs);
                }}
                disabled={selected.length === 0}
                className="px-8 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                Confirmar Selección
              </button>
            </div>
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