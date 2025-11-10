import { useState, useEffect } from "react";
import CourseSelectCard from "./CourseSelectCard";
import CourseDetailModal from "./CourseDetailModal";

export default function CourseSelectModal({ onClose, onConfirm, COURSES_URL }) {
  const [selected, setSelected] = useState([]);
  const [courses, setCourses] = useState([]);
  const [detailCourse, setDetailCourse] = useState(null);

  useEffect(() => {
    fetch(`${COURSES_URL}/courses`)
      .then((res) => res.json())
      .then((data) => {

        let list = data;
        if (Array.isArray(data) && data.length === 1 && data[0] && data[0].materias) {
          list = Object.values(data[0].materias);
        } else if (data && typeof data === "object" && data.materias) {
          list = Object.values(data.materias);
        }
        setCourses(list || []);
      })
      .catch((err) => console.error("Error fetching courses:", err));
  }, [COURSES_URL]);

  const toggleCourse = (codigo) => {
    setSelected((prev) => {
      if (prev.includes(codigo)) {
        return prev.filter((c) => c !== codigo);
      } else {
        if (prev.length >= 5) {
          alert("Solo puedes seleccionar hasta 5 materias.");
          return prev;
        }
        return [...prev, codigo];
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Selecciona tus materias</h2>
            <button onClick={onClose} className="text-white/60 hover:text-white/80 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(() => {
              const coursesBySemester = courses.reduce((acc, course) => {
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
                        onToggle={toggleCourse}
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
