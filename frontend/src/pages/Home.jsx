import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Pensum from "../components/Pensum";
// Eliminamos CourseSelectModal de los imports
import CourseCard from "../components/CourseCard";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  // Eliminamos el estado modalOpen
  const [cursadas, setCursadas] = useState([]); 
  const [courses, setCourses] = useState([]);

  const { token, user } = useAuth(); // Asumo que logout no se usa aquí, lo quité para limpiar
  const navigate = useNavigate();
  const COURSES_URL = import.meta.env.VITE_COURSES_URL;

  useEffect(() => {
    if (!token) return;

    fetch(`${COURSES_URL}/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setCourses(Array.isArray(data) ? data : (data.materias ? Object.values(data.materias) : [])))
      .catch((err) => console.error("Error fetching courses:", err));
  }, [token, COURSES_URL]);

  if (!token) {
    window.location.href = "/signup";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground items-center">
      <Header />

      {cursadas.length <= 0 && (
        <div className="mb-4 flex items-center">
          <p className="m-2 text-lg sm:text-xl text-gray-300 leading-relaxed">
            Explora todas tus materias obligatorias y electivas, organiza tus
            semestres y construye el mejor camino académico de manera sencilla y
            rápida.
          </p>
        </div>
      )}

      {cursadas.length > 0 && (
        <section className="w-full px-6 mt-12 mb-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center text-3xl font-extrabold text-balance mb-5">
              Materias Cursadas
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {cursadas.map((course) => (
                <CourseCard
                  key={course.codigo}
                  code={course.codigo}
                  name={course.nombre}
                  hours={course.horas || course.hours}
                  credits={course.creditos || course.credits}
                  type={course.tipo}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {cursadas.length > 0 && (
        <section className="w-full px-6 mb-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center text-3xl font-extrabold text-balance mb-5">
              Materias Recomendadas
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {courses
                .filter((course) => {
                  const requisitos = course.requisitos ?? course.prerequisitos ?? course.requisitos ?? [];
                  return (
                    !cursadas.some((c) => c.codigo === course.codigo) &&
                    requisitos.length > 0 &&
                    requisitos.some((pre) => cursadas.some((c) => c.codigo === pre))
                  );
                })
                .map((course) => (
                  <CourseCard
                    key={course.codigo}
                    code={course.codigo}
                    name={course.nombre}
                    hours={course.horas || course.hours}
                    credits={course.creditos || course.credits}
                    type={course.tipo}
                  />
                ))}
            </div>
          </div>
        </section>
      )}

      <h2 className="text-center text-3xl font-extrabold text-balance mb-5">
        Todas las Materias
      </h2>

      <Pensum 
        onVerMas={() => navigate("/horarios")} 
        COURSES_URL={COURSES_URL} 
      />
    </div>
  );
}