import { useState, useEffect } from "react";
import Pensum from "../components/Pensum";
import CourseSelectModal from "../components/CourseSelectModal";
import CourseCard from "../components/CourseCard";

import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cursadas, setCursadas] = useState([]);
  const [courses, setCourses] = useState([]);

  const { token, user, logout } = useAuth();
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
      .then((data) => setCourses(data))
      .catch((err) => console.error("Error fetching courses:", err));
  }, [token, COURSES_URL]);

  if (!token) {
    window.location.href = "/signup";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground items-center">
      <header className="w-full bg-black/40 border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-white">Horario Óptimo</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {user?.email || user?.username || "Invitado"}
          </span>
          {token && (
            <button
              onClick={logout}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
              Logout
            </button>
          )}
        </div>
      </header>

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
                  hours={course.hours}
                  credits={course.creditos}
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
                .filter(
                  (course) =>
                    !cursadas.some((c) => c.codigo === course.codigo) &&
                    course.prerequisitos.some((pre) =>
                      cursadas.some((c) => c.codigo === pre)
                    )
                )
                .map((course) => (
                  <CourseCard
                    key={course.codigo}
                    code={course.codigo}
                    name={course.nombre}
                    hours={course.hours}
                    credits={course.creditos}
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
      <Pensum onVerMas={() => setModalOpen(true)} COURSES_URL={COURSES_URL} />

      {modalOpen && (
        <CourseSelectModal
          onClose={() => setModalOpen(false)}
          onConfirm={(seleccionadas) => {
            setCursadas(seleccionadas);
            setModalOpen(false);
          }}
          COURSES_URL={COURSES_URL}
        />
      )}
    </div>
  );
}
