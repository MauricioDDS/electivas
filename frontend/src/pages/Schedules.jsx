import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import CalendarView from "@/components/CalendarView";
import CourseSelectModal from "@/components/CourseSelectModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2, CalendarCheck } from 'lucide-react';
import Header from "@/components/Header";
import { useBocetos } from "@/hooks/useBocetos";

// --- HELPERS ---

function countUniqueSubjects(courses) {
  if (!courses || courses.length === 0) return 0;
  const unique = new Set(courses.map(c => c.course_code || c.course_name || c.materia));
  return unique.size;
}

/**
 * PARSEO INTELIGENTE: LA SOLUCIÓN DEFINITIVA
 * Convierte strings "HH:MM" o números a objeto { h, m }.
 * REGLA DE ORO: Si la hora es < 6 (ej: 0, 2, 4), asumimos que es un índice y sumamos 6.
 * Ej: "00:00" -> 06:00 AM | "04:00" -> 10:00 AM
 */
function smartParseTime(input) {
  if (input === undefined || input === null) return null;

  const str = String(input).trim();

  if (str.includes(":")) {
    const [h, m] = str.split(":").map(n => parseInt(n, 10));
    return { h, m: m || 0 };
  }

  let index = parseInt(str, 10);

  if (isNaN(index)) return null;

  if (index >= 6 && index <= 22) {
    return { h: index, m: 0 };
  }

  const converted = index + 6;

  return {
    h: converted % 24,
    m: 0
  };
}


export default function Schedules() {
  const navigate = useNavigate();
  const { bocetos, fetchBocetos, removeBoceto } = useBocetos();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBocetoId, setSelectedBocetoId] = useState(null);
  const [events, setEvents] = useState([]);
  const [officialSchedule, setOfficialSchedule] = useState(null);

  // 1. Cargar bocetos de DB
  useEffect(() => {
    fetchBocetos();
  }, [fetchBocetos]);

  // 2. Cargar Horario Oficial del LocalStorage
  useEffect(() => {
    const keys = Object.keys(localStorage);
    const horarioKey = keys.find(k => k.startsWith('horario_'));

    if (horarioKey) {
      try {
        const raw = JSON.parse(localStorage.getItem(horarioKey));
        if (Array.isArray(raw) && raw.length > 0) {

          const formattedCourses = raw.map((c, idx) => {
            // Intentamos obtener start/end lo más crudos posible
            let start = c.start;
            let end = c.end;

            // Si viene en formato "0-2" o "HH-HH" en el campo 'hora'
            if (c.hora && typeof c.hora === 'string' && c.hora.includes('-')) {
              const parts = c.hora.replace(/\s/g, '').split('-');
              if (!start) start = parts[0];
              if (!end) end = parts[1];
            }

            // Fallback a propiedades directas (muy común que vengan aquí como "00:00")
            if (!start && (c.horaInicio || c.start)) {
              start = c.horaInicio || c.start;
              end = c.horaFin || c.end;
            }

            // NOTA: No convertimos aquí, dejamos que smartParseTime lo haga en el useEffect principal
            // para ser consistentes con todos los datos.

            return {
              id: `off-${idx}`,
              course_name: c.materia,
              course_code: c.codigo || c.cod,
              group_name: c.grupo,
              day: c.dia,
              start: start,
              end: end,
              meta: { ...c }
            };
          });

          setOfficialSchedule({
            id: 'OFFICIAL_SCHEDULE_ID',
            name: 'Horario Actual (Divisist)',
            courses: formattedCourses,
            isOfficial: true,
            created_at: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error("Error cargando horario oficial", e);
      }
    }
  }, []);

  // 3. Combinar Listas
  const allBocetos = useMemo(() => {
    return officialSchedule ? [officialSchedule, ...bocetos] : bocetos;
  }, [officialSchedule, bocetos]);

  // 4. Selección automática
  useEffect(() => {
    if (allBocetos.length > 0) {
      const currentExists = allBocetos.find(b => b.id === selectedBocetoId);
      if (!selectedBocetoId || !currentExists) {
        setSelectedBocetoId(allBocetos[0].id);
      }
    }
  }, [allBocetos, selectedBocetoId]);

  const activeBoceto = useMemo(() => {
    return allBocetos.find(b => b.id === selectedBocetoId);
  }, [allBocetos, selectedBocetoId]);

  // --- LÓGICA MAESTRA DE TRANSFORMACIÓN ---
  useEffect(() => {
    if (!activeBoceto || !activeBoceto.courses) {
      setEvents([]);
      return;
    }

    console.log("📅 [SCHEDULES] Procesando:", activeBoceto.name);

    // Fecha base: Lunes de la semana actual
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const daysMap = {
      "1": 1, "LUNES": 1, "Lunes": 1,
      "2": 2, "MARTES": 2, "Martes": 2,
      "3": 3, "MIERCOLES": 3, "Miércoles": 3, "Miercoles": 3,
      "4": 4, "JUEVES": 4, "Jueves": 4,
      "5": 5, "VIERNES": 5, "Viernes": 5,
      "6": 6, "SABADO": 6, "Sábado": 6, "Sabado": 6,
      "7": 0, "DOMINGO": 0, "Domingo": 0
    };

    // 1. ORDENAR CURSOS (Usando smartParseTime)
    const sortedCourses = [...activeBoceto.courses].sort((a, b) => {
      const dayA = daysMap[String(a.day || "").toUpperCase().trim()] || 0;
      const dayB = daysMap[String(b.day || "").toUpperCase().trim()] || 0;

      if (dayA !== dayB) return dayA - dayB;

      const timeA = smartParseTime(a.start);
      const timeB = smartParseTime(b.start);
      const minA = (timeA?.h || 0) * 60 + (timeA?.m || 0);
      const minB = (timeB?.h || 0) * 60 + (timeB?.m || 0);

      return minA - minB;
    });

    const mappedEvents = [];
    let i = 0;
    while (i < sortedCourses.length) {
      let currentCourse = sortedCourses[i];

      // --- SANEAMIENTO DE DATOS ---
      // Si el curso es inválido, saltamos
      if (!currentCourse || typeof currentCourse !== 'object') {
        i++; continue;
      }

      let dayRaw = currentCourse.day;
      let startRaw = currentCourse.start;
      let endRaw = currentCourse.end;

      // Recuperación de datos desde 'meta' si faltan
      if (currentCourse.meta?.grupo?.clases) {
        const classDetails = currentCourse.meta.grupo.clases.find(c => String(c.dia) === String(dayRaw));
        if (classDetails) {
          const isSuspicious = !startRaw || startRaw === "00:00" || startRaw === 0 || startRaw === "0";
          if (isSuspicious) {
            startRaw = classDetails.horaInicio;
            endRaw = classDetails.horaFin;
          }
        }
      }

      const diaStr = String(dayRaw || "").toUpperCase().trim();
      let weekdayTarget = daysMap[diaStr];

      if (weekdayTarget === undefined) {
        const foundKey = Object.keys(daysMap).find(key => key.toUpperCase().includes(diaStr));
        if (foundKey) weekdayTarget = daysMap[foundKey];
      }

      if (weekdayTarget === undefined) {
        i++; continue;
      }

      // --- AQUÍ OCURRE LA MAGIA ---
      let startTime = smartParseTime(startRaw);
      let endTime = smartParseTime(endRaw);

      if (!startTime || !endTime) {
        i++; continue;
      }

      let finalEndTimeMin = endTime.h * 60 + endTime.m;

      // 2. LÓGICA DE AGRUPACIÓN
      let j = i + 1;
      while (j < sortedCourses.length) {
        const nextCourse = sortedCourses[j];

        // Saneamiento del siguiente curso
        if (!nextCourse || typeof nextCourse !== 'object') {
          break;
        }

        const nextDayRaw = nextCourse.day;
        let nextStartRaw = nextCourse.start;
        let nextEndRaw = nextCourse.end;

        // Recuperación para el siguiente
        if (nextCourse.meta?.grupo?.clases) {
          const classDetails = nextCourse.meta.grupo.clases.find(c => String(c.dia) === String(nextDayRaw));
          if (classDetails) {
            const isSuspicious = !nextStartRaw || nextStartRaw === "00:00" || nextStartRaw === 0;
            if (isSuspicious) {
              nextStartRaw = classDetails.horaInicio;
              nextEndRaw = classDetails.horaFin;
            }
          }
        }

        const nextStartTime = smartParseTime(nextStartRaw);
        const nextEndTime = smartParseTime(nextEndRaw);

        if (!nextStartTime || !nextEndTime) break;

        const sameDay = String(dayRaw).toUpperCase().trim() === String(nextDayRaw).toUpperCase().trim();
        const subjectId = currentCourse.course_code || currentCourse.course_name;
        const nextSubjectId = nextCourse.course_code || nextCourse.course_name;
        const sameSubject = subjectId && nextSubjectId && subjectId === nextSubjectId;

        const nextStartMin = nextStartTime.h * 60 + nextStartTime.m;
        // Tolerancia de contigüidad
        const isContiguous = Math.abs(finalEndTimeMin - nextStartMin) <= 1;

        if (sameDay && sameSubject && isContiguous) {
          // Extendemos el bloque
          finalEndTimeMin = nextEndTime.h * 60 + nextEndTime.m;
          j++;
        } else {
          break;
        }
      }

      // 3. Crear fechas finales
      const eventDate = new Date(monday);
      const offset = weekdayTarget === 0 ? 6 : weekdayTarget - 1;
      eventDate.setDate(monday.getDate() + offset);

      const start = new Date(eventDate);
      start.setHours(startTime.h, startTime.m, 0, 0);

      const end = new Date(eventDate);
      const finalEndH = Math.floor(finalEndTimeMin / 60) % 24;
      const finalEndM = finalEndTimeMin % 60;
      end.setHours(finalEndH, finalEndM, 0, 0);

      if (end <= start) end.setHours(start.getHours() + 1);

      // 4. FILTRO DE SEGURIDAD (6 AM - 10 PM)
      const MIN_HOUR = 6;
      const MAX_HOUR = 22; // 10 PM

      if (start.getHours() >= MAX_HOUR || end.getHours() < MIN_HOUR) {
        console.warn(`❌ Filtrando hora ilógica: ${currentCourse.course_name} (${start.toLocaleTimeString()})`);
      } else {
        mappedEvents.push({
          id: currentCourse.id || `${i}-${Date.now()}`,
          title: `${currentCourse.course_name || ''} (${currentCourse.course_code || currentCourse.group_name || 'Gr'})`,
          start: start,
          end: end,
          resource: currentCourse
        });
      }

      i = j;
    }

    setEvents(mappedEvents);
  }, [activeBoceto]);

  const handleDeleteBoceto = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Borrar este boceto?")) return;
    await removeBoceto(id);
    if (selectedBocetoId === id) setSelectedBocetoId(null);
  };

  const handleModalSuccess = async (newBocetoId) => {
    setIsModalOpen(false);
    await fetchBocetos();
    if (newBocetoId) setSelectedBocetoId(newBocetoId);
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 p-4 md:p-8">

        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
            <ArrowLeft size={16} /> Volver
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-primary text-primary-foreground">
            <Plus size={16} /> Crear Nuevo Boceto
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LISTA IZQUIERDA */}
          <div className="lg:col-span-1">
            <Card className="h-full border-white/10 bg-card">
              <CardHeader>
                <CardTitle>Mis Horarios</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh] px-4">
                  <div className="space-y-3 pb-4">
                    {allBocetos.length === 0 && <p className="text-muted-foreground text-center py-4">No hay horarios</p>}

                    {allBocetos.map((b) => (
                      <div key={b.id} onClick={() => setSelectedBocetoId(b.id)}
                        className={`p-4 rounded-xl cursor-pointer border transition-all flex justify-between items-start group relative overflow-hidden
                                ${selectedBocetoId === b.id
                            ? (b.isOfficial ? 'bg-orange-500/20 border-orange-500' : 'bg-primary/20 border-primary')
                            : 'bg-white/5 border-transparent hover:bg-white/10'}`}>

                        {b.isOfficial && <div className="absolute top-0 right-0 p-1 bg-orange-600 rounded-bl-lg"><CalendarCheck size={12} className="text-white" /></div>}

                        <div className="flex-1">
                          <h3 className={`font-bold ${b.isOfficial ? 'text-orange-400' : ''}`}>{b.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {countUniqueSubjects(b.courses)} materias
                          </p>
                          <p className="text-[10px] text-muted-foreground opacity-50">
                            {b.isOfficial ? 'Sincronizado' : (b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Sin fecha')}
                          </p>
                        </div>

                        {!b.isOfficial && (
                          <button onClick={(e) => handleDeleteBoceto(b.id, e)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded ml-2">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* CALENDARIO DERECHA */}
          <div className="lg:col-span-3">
            <Card className="h-full border-white/10 bg-card overflow-hidden flex flex-col">
              <CardHeader className="bg-white/5 border-b border-white/10 py-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeBoceto ? (
                    activeBoceto.isOfficial ?
                      <span className="flex items-center gap-2 text-orange-400"><CalendarCheck size={20} /> Horario Oficial (Divisist)</span> :
                      `Horario: ${activeBoceto.name}`
                  ) : 'Selecciona un horario'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 min-h-[500px] relative">
                {activeBoceto ? (
                  <CalendarView events={events} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    Selecciona un boceto para ver el horario
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <CourseSelectModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          COURSES_URL={import.meta.env.VITE_COURSES_URL}
        />
      )}
    </div>
  );
}