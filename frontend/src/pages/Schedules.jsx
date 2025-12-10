import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import CalendarView from "@/components/CalendarView";
import CourseSelectModal from "@/components/CourseSelectModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Header from "@/components/Header";
import { useBocetos } from "@/hooks/useBocetos";

// --- HELPERS (Traídos de la lógica ganadora) ---

function parseTime(input) {
  if (input === undefined || input === null) return null;
  const timeStr = String(input).trim();
  let h = 0, m = 0;

  if (timeStr.includes(":")) {
    const parts = timeStr.split(":");
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else {
    h = parseInt(timeStr, 10);
  }

  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;

  return { h, m };
}

export default function Schedules() {
  const navigate = useNavigate();
  const { bocetos, fetchBocetos, removeBoceto } = useBocetos();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBocetoId, setSelectedBocetoId] = useState(null);
  const [events, setEvents] = useState([]);

  // Cargar bocetos al iniciar
  useEffect(() => {
    fetchBocetos();
  }, [fetchBocetos]);

  // Selección automática
  useEffect(() => {
    if (bocetos.length > 0) {
      if (!selectedBocetoId || !bocetos.find(b => b.id === selectedBocetoId)) {
        setSelectedBocetoId(bocetos[0].id);
      }
    }
  }, [bocetos, selectedBocetoId]);

  const activeBoceto = useMemo(() => {
    return bocetos.find(b => b.id === selectedBocetoId);
  }, [bocetos, selectedBocetoId]);

  // --- LÓGICA DE TRANSFORMACIÓN (IGUAL QUE EL FETCHER) ---
  useEffect(() => {
    if (!activeBoceto || !activeBoceto.courses) {
      setEvents([]);
      return;
    }

    console.log("📅 [SCHEDULES] Procesando:", activeBoceto.name);

    // 1. Configurar fecha base (Lunes de la semana actual)
    const today = new Date();
    const currentDay = today.getDay(); 
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    console.log("📆 [SCHEDULES] Fecha Base (Lunes):", monday.toDateString());

    const daysMap = {
      "1": 1, "LUNES": 1, "Lunes": 1,
      "2": 2, "MARTES": 2, "Martes": 2,
      "3": 3, "MIERCOLES": 3, "Miércoles": 3, "Miercoles": 3,
      "4": 4, "JUEVES": 4, "Jueves": 4,
      "5": 5, "VIERNES": 5, "Viernes": 5,
      "6": 6, "SABADO": 6, "Sábado": 6, "Sabado": 6,
      "7": 0, "DOMINGO": 0, "Domingo": 0
    };

    const mappedEvents = [];

    activeBoceto.courses.forEach((course, index) => {
      // Intentar obtener datos base
      let dayRaw = course.day;
      let startRaw = course.start;
      let endRaw = course.end;

      // Fallback: Si falta info, buscar en meta (igual que antes, pero más seguro)
      if ((!startRaw || !endRaw) && course.meta?.grupo?.clases) {
         // Intentamos buscar la clase que coincida con el día
         const classDetails = course.meta.grupo.clases.find(c => {
             // Normalización rápida para comparar dia "1" con "1" o "Lunes"
             return String(c.dia) === String(dayRaw);
         });

         if (classDetails) {
            console.log(`⚠️ Recuperando horario desde meta para ${course.course_name}`);
            if (!startRaw) startRaw = classDetails.horaInicio;
            if (!endRaw) endRaw = classDetails.horaFin;
         }
      }

      // Normalizar día
      const diaStr = String(dayRaw || "").toUpperCase().trim();
      
      // Buscar en el mapa (si es "1" devuelve 1, si es "LUNES" devuelve 1)
      let weekdayTarget = daysMap[diaStr];

      // Si no encontró el día directamente, intentamos búsqueda fuzzy
      if (weekdayTarget === undefined) {
          const foundKey = Object.keys(daysMap).find(key => 
             key.toUpperCase().includes(diaStr)
          );
          if (foundKey) weekdayTarget = daysMap[foundKey];
      }

      if (weekdayTarget === undefined) {
        console.warn(`🚫 [SCHEDULES] Día inválido: ${dayRaw} en curso ${course.course_name}`);
        return;
      }

      // Calcular fecha del evento
      const eventDate = new Date(monday);
      // Ajuste: si weekdayTarget es 1 (Lunes), sumamos 0 días. (1 - 1 = 0)
      // Si es Domingo (0), el cálculo depende de cómo manejes el domingo, pero generalmente es al final.
      const offset = weekdayTarget === 0 ? 6 : weekdayTarget - 1; 
      eventDate.setDate(monday.getDate() + offset);

      // Parsear horas
      const startTime = parseTime(startRaw);
      const endTime = parseTime(endRaw);

      if (!startTime || !endTime) {
        console.warn("🚫 [SCHEDULES] Horas inválidas:", startRaw, endRaw);
        return;
      }

      const start = new Date(eventDate);
      start.setHours(startTime.h, startTime.m, 0, 0);

      const end = new Date(eventDate);
      end.setHours(endTime.h, endTime.m, 0, 0);

      // Fix visual: Si empieza y termina a la misma hora, darle 1 hora
      if (end <= start) {
        end.setHours(start.getHours() + 1);
      }

      console.log(`   👉 Evento: ${course.course_name} | ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);

      mappedEvents.push({
        id: course.id || `${index}-${Date.now()}`,
        title: `${course.course_name} (${course.group_name || 'Gr'})`,
        start: start,
        end: end,
        resource: course
      });
    });

    console.log(`✅ [SCHEDULES] Total eventos listos: ${mappedEvents.length}`);
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
                <CardTitle>Mis Bocetos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh] px-4">
                  <div className="space-y-3 pb-4">
                    {bocetos.length === 0 && <p className="text-muted-foreground text-center py-4">No hay bocetos</p>}
                    {bocetos.map((b) => (
                      <div key={b.id} onClick={() => setSelectedBocetoId(b.id)}
                        className={`p-4 rounded-xl cursor-pointer border transition-all flex justify-between items-start group
                                ${selectedBocetoId === b.id ? 'bg-primary/20 border-primary' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                        <div>
                          <h3 className="font-bold">{b.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{b.courses?.length || 0} materias</p>
                          <p className="text-[10px] text-muted-foreground opacity-50">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Sin fecha'}
                          </p>
                        </div>
                        <button onClick={(e) => handleDeleteBoceto(b.id, e)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded">
                          <Trash2 size={16} />
                        </button>
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
                  {activeBoceto ? `Horario: ${activeBoceto.name}` : 'Selecciona un boceto'}
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