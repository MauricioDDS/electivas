import { useState, useEffect } from "react";
import CourseCard from "./CourseCard";

export default function Pensum({ onVerMas, COURSES_URL }) {
  const rows = 4;
  const colsDefault = 6;
  const [columns, setColumns] = useState(colsDefault);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch(`${COURSES_URL}/courses`)
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch((err) => console.error("Error fetching courses:", err));
  }, [COURSES_URL]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 640) setColumns(2);
      else if (window.innerWidth < 768) setColumns(3);
      else if (window.innerWidth < 1024) setColumns(4);
      else setColumns(6);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visible = colsDefault * rows;
  const topCount = colsDefault * 2;
  const topHalf = courses.slice(0, Math.min(topCount, courses.length));
  const bottomHalf = courses.slice(
    Math.min(topCount, courses.length),
    Math.min(visible, courses.length)
  );

  return (
    <div className="min-h-screen flex flex-col items-center">
      <div className="relative w-full max-w-7xl px-6">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {topHalf.map((c) => (
            <CourseCard
              key={c.codigo}
              code={c.codigo}
              name={c.nombre}
              hours={c.hours}
              credits={c.creditos}
              type={c.tipo}
            />
          ))}

          {bottomHalf.map((c, idx) => {
            const filaIndex = Math.floor(idx / colsDefault);
            const opacity =
              filaIndex === 0 ? 0.65 : filaIndex === 1 ? 0.35 : 0.18;
            return (
              <div key={c.codigo} style={{ opacity }}>
                <CourseCard
                  code={c.codigo}
                  name={c.nombre}
                  hours={c.hours}
                  credits={c.creditos}
                  type={c.tipo}
                />
              </div>
            );
          })}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-30">
          <button
            onClick={onVerMas}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-medium shadow-lg hover:bg-orange-700 transition"
          >
            <span className="text-base leading-none">+</span> Ver más
          </button>
        </div>
      </div>
    </div>
  );
}
