import { useState, useEffect } from "react";
import CourseSelectCard from "./CourseSelectCard";

export default function CourseSelectModal({ onClose, onConfirm, COURSES_URL }) {
  const [selected, setSelected] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch(`${COURSES_URL}/courses`)
      .then((res) => res.json())
      .then((data) => setCourses(data))
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Selecciona tus materias
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✖
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {courses.map((course) => (
              <CourseSelectCard
                key={course.codigo}
                course={course}
                selected={selected.includes(course.codigo)}
                onToggle={toggleCourse}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const seleccionadas = courses.filter((c) =>
                selected.includes(c.codigo)
              );
              onConfirm(seleccionadas);
            }}
            className="px-4 py-2 rounded-md bg-orange-600 text-white font-medium hover:bg-orange-700"
          >
            Confirmar selección
          </button>
        </div>
      </div>
    </div>
  );
}
