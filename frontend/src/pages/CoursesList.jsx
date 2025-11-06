import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CourseItem from "@/components/CourseItem";
const COURSES_URL = import.meta.env.VITE_COURSES_URL;

export default function CoursesList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${COURSES_URL}/courses`)
      .then((r) => r.json())
      .then((data) => setCourses(Array.isArray(data) ? data : (data.materias ? Object.values(data.materias) : [])))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Listado de Materias</h2>
      {loading ? <p>Cargando...</p> : (
        <div className="grid gap-3">
          {courses.map((c) => (
            <Link key={c.codigo} to={`/course/${encodeURIComponent(c.codigo)}`}>
              <CourseItem course={c} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
