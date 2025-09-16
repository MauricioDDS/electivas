import CourseCard from "./CourseCard";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

const dummyCourses = Array.from({ length: 41 }, (_, i) => ({
  code: `MAT${i + 1}`,
  name: `Materia ${i + 1}`,
  hours: Math.floor(Math.random() * 4) + 2,
  credits: Math.floor(Math.random() * 3) + 2,
  type: i % 7 === 0 ? "electiva" : "obligatoria",
}));

export default function Pensum() {
  const [columns, setColumns] = useState(6);

  // detectar columnas según pantalla
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

  const visible = columns * 6; // siempre 6 filas
  const topHalf = dummyCourses.slice(0, columns * 3); // filas normales
  const bottomHalf = dummyCourses.slice(columns * 3, visible); // filas a opacar

  return (
    <div className="min-h-screen flex flex-col items-center">
      {/* Grid con botón flotante */}
      <div className="relative w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {topHalf.map((c) => (
            <CourseCard key={c.code} {...c} />
          ))}

          {bottomHalf.map((c, idx) => {
            // idx 0 = fila 4, idx 1 = fila 5, idx 2 = fila 6 (en columnas*3 bloques)
            const rowIndex = Math.floor(idx / columns);
            let opacity = 1;

            if (rowIndex === 0) opacity = 0.7; // fila 4
            else if (rowIndex === 1) opacity = 0.4; // fila 5
            else if (rowIndex === 2) opacity = 0.15; // fila 6

            return (
              <div key={c.code} style={{ opacity }}>
                <CourseCard {...c} />
              </div>
            );
          })}
        </div>

        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <Button
            size="sm">
            VER MÁS
            <IconPlus/>
          </Button>
        </div>
      </div>
    </div>
  );
}
