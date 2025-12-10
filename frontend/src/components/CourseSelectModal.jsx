import { useState, useEffect, useMemo } from "react";
import CourseSelectCard from "./CourseSelectCard";
import CourseDetailModal from "./CourseDetailModal";
import { useBocetos } from "@/hooks/useBocetos"; 
import { toast } from "sonner";
import { Loader2 } from "lucide-react"; 

// --- HELPER: Verificar si tiene grupos válidos ---
const hasGroups = (course) => {
    if (!course.grupos) return false;
    if (Array.isArray(course.grupos)) return course.grupos.length > 0;
    if (typeof course.grupos === 'object') return Object.keys(course.grupos).length > 0;
    return false;
};

export default function CourseSelectModal({
  onClose,
  onSuccess, 
  COURSES_URL,
  takenCourses = [],
  maxCredits = 20,
}) {
  const [selected, setSelected] = useState([]);
  const [courses, setCourses] = useState([]);
  const [detailCourse, setDetailCourse] = useState(null);
  const [sortBy, setSortBy] = useState("semestre");
  const [availableCredits, setAvailableCredits] = useState(maxCredits);
  const [isSaving, setIsSaving] = useState(false);

  const { createBoceto, addGroupToBoceto, bocetos } = useBocetos();

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

  // --- Lógica de Dependencias ---
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

  // --- Toggle de Selección ---
  const toggleCourse = (courseObj) => {
    // 1. Validación: Si no tiene grupos, no hace nada.
    if (!hasGroups(courseObj)) {
        toast.error("Esta materia no tiene grupos disponibles para inscribir.");
        return;
    }

    const codigo = String(courseObj.codigo);
    const credit = Number(courseObj.creditos ?? courseObj.credits ?? 0) || 0;

    setSelected((prev) => {
      if (prev.includes(codigo)) {
        setAvailableCredits((c) => c + credit);
        return prev.filter((c) => c !== codigo);
      }
      else {
        if (credit > availableCredits) {
          toast.warning(`No hay créditos suficientes. Quedan ${availableCredits}.`);
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
      // Ordenamiento simple por horas totales si existe
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


  // --- HANDLE SAVE SIMPLIFICADO ---
  const handleSave = async () => {
    if (selected.length === 0) return;
    setIsSaving(true);
    const toastId = toast.loading("Creando boceto...");

    try {
        // 1. Crear el Boceto contenedor
        const nextNum = (bocetos?.length || 0) + 1;
        const newBoceto = await createBoceto(`Boceto #${nextNum}`);

        const selectedCourses = courses.filter(c => selected.includes(String(c.codigo)));
        
        let successCount = 0;
        let failCount = 0;
        let errorMessages = [];

        // 2. Iterar materias seleccionadas e inscribir "a lo bruto" (primer grupo)
        for (const curso of selectedCourses) {
            
            let gruposList = [];
            if (Array.isArray(curso.grupos)) gruposList = curso.grupos;
            else if (curso.grupos && typeof curso.grupos === 'object') gruposList = Object.values(curso.grupos);

            // Si no tiene grupos, next
            if (gruposList.length === 0) continue; 

            // ESTRATEGIA: Tomar el PRIMER grupo disponible.
            // Dejamos que el backend decida si hay conflicto o falta de créditos.
            const grupoParaInscribir = gruposList[0];

            try {
                await addGroupToBoceto(newBoceto.id, curso, grupoParaInscribir);
                successCount++;
            } catch (err) {
                console.error(`Fallo inscribiendo ${curso.nombre}:`, err);
                failCount++;
                
                // Intentar sacar un mensaje corto del error
                let msg = err.message || "Error desconocido";
                if (msg.includes("credits")) msg = "Créditos insuficientes";
                if (msg.includes("conflict")) msg = "Choque de horario";
                
                errorMessages.push(`${curso.nombre}: ${msg}`);
            }
        }

        // 3. Feedback al usuario
        if (failCount > 0) {
            toast.warning(
                <div className="flex flex-col gap-1">
                    <span className="font-bold">Guardado parcial: {successCount} OK, {failCount} Error.</span>
                    <ul className="text-xs list-disc pl-4 opacity-90">
                        {errorMessages.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                        {errorMessages.length > 3 && <li>... y {errorMessages.length - 3} más.</li>}
                    </ul>
                </div>, 
                { duration: 6000 }
            );
        } else {
            toast.success("¡Boceto creado perfectamente!");
        }
        
        // 4. Cerrar y actualizar
        if(onSuccess) onSuccess(newBoceto.id);

    } catch (error) {
        toast.error("Error fatal al crear el boceto");
        console.error(error);
    } finally {
        toast.dismiss(toastId);
        setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
        <div className="bg-card border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Selecciona tus materias</h2>
              <div className="flex gap-4 text-xs mt-1 text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-card border border-white/20 rounded-full"></span> Disponible</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Seleccionada</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-white/10 rounded-full"></span> Bloqueada</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/20 border border-red-500/50 rounded-full"></span> Sin Grupos</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg border font-medium transition-colors ${availableCredits < 0 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-primary/10 text-primary border-primary/20'}`}>
                Créditos disp: <span className="text-lg font-bold">{availableCredits}</span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                <option value="semestre">Por Semestre</option>
                <option value="horario">Por Horas</option>
              </select>

              <button onClick={onClose} disabled={isSaving} className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white">
                <XIcon className="w-6 h-6" />
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
                      const isReqBlocked = !isSel && disabledCourses.has(String(course.codigo));
                      
                      const existsGroups = hasGroups(course);
                      const isDisabled = !existsGroups || isReqBlocked;

                      return (
                        <div key={course.codigo} className="relative group">
                            {/* Etiqueta Sin Grupos */}
                            {!existsGroups && !isSel && (
                                <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm font-bold pointer-events-none">
                                    Sin Grupos
                                </div>
                            )}

                            <CourseSelectCard
                                course={course}
                                selected={isSel}
                                // Pasamos disabled, pero recuerda que modificamos el Card para que el botón Info siga funcionando
                                disabled={isDisabled || isSaving}
                                onToggle={() => toggleCourse(course)}
                                onShow={(c) => setDetailCourse(c)}
                            />
                        </div>
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
              <button onClick={onClose} disabled={isSaving} className="px-6 py-2 rounded-lg hover:bg-white/5 text-sm font-medium transition-colors text-foreground">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={selected.length === 0 || isSaving}
                className="px-8 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin"/>}
                {isSaving ? "Guardando..." : "Confirmar Selección"}
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

// Icono simple X por si no lo tienes importado de lucide-react (o usa X de lucide)
function XIcon(props) {
  return (
    <svg 
      {...props} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}