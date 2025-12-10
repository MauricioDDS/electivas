// src/pages/Schedules.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useCallback } from "react";
import CalendarView from "@/components/CalendarView";
import CourseSelectModal from "@/components/CourseSelectModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, Plus, Trash2, ArrowLeft } from 'lucide-react'; // Eliminado CalendarCheck

// Se asume que el COURSES_URL viene de las variables de entorno, como en Home.jsx
const COURSES_URL = import.meta.env.VITE_COURSES_URL;

// --- Funciones de utilidad (SIN CAMBIOS) ---

function getDateFrom(dia, hora) {
    // APLICAR CORRECCIÓN: Asegurar que 'hora' sea un string válido.
    const horaStr = String(hora).trim(); 
    if (!horaStr || horaStr === 'null' || !horaStr.includes(':')) {
        // Si la hora no es válida, se podría retornar una hora por defecto o lanzar un error claro.
        // Para evitar el fallo, usaremos una hora de inicio 00:00.
        // **Nota:** Si tu backend devuelve horas inválidas constantemente, el problema es en la fuente de datos.
        console.warn(`Hora inválida recibida: ${hora}. Usando 00:00.`);
        hora = "00:00";
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    const currentDay = today.getDay();
    const diff = today.getDate() - (currentDay === 0 ? 6 : currentDay - 1); 
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const base = new Date(startOfWeek);
    base.setDate(startOfWeek.getDate() + Number(dia)); 

    const [h, m] = hora.split(":"); // Ahora 'hora' es una cadena segura
    base.setHours(Number(h), Number(m), 0, 0);
    return base.toISOString();
}

// --- Componente Principal ---

export default function Schedules() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const cursosIniciales = state?.cursos || [];

  const [isModalOpen, setIsModalOpen] = useState(false);

  const initialBocetos = useMemo(() => {
    if (cursosIniciales.length > 0) {
      return [{
        id: 1,
        name: "Boceto Inicial",
        cursos: cursosIniciales,
      }];
    }
    return [];
  }, [cursosIniciales]);

  const [bocetos, setBocetos] = useState(initialBocetos);
  const [selectedBocetoId, setSelectedBocetoId] = useState(initialBocetos[0]?.id || null);
  const [events, setEvents] = useState([]);

  const activeBoceto = useMemo(() => {
    return bocetos.find(b => b.id === selectedBocetoId);
  }, [bocetos, selectedBocetoId]);


  const renderBoceto = useCallback((boceto) => {
    setSelectedBocetoId(boceto.id);

    const eventos = boceto.cursos.flatMap((materia) => {
      const grupos = materia.grupos ?? {};
      const groupList = Array.isArray(grupos) ? grupos : Object.values(grupos);

      return groupList.flatMap((g) =>
        (g.clases || []).map((c) => ({
          id: `${materia.codigo}-${g.nombre || g.group_name || 'G'}-${c.dia}-${c.horaInicio}`,
          title: materia.codigo,
          start: getDateFrom(c.dia, c.horaInicio),
          end: getDateFrom(c.dia, c.horaFin),
          extendedProps: { materia, grupo: g, clase: c },
        }))
      );
    });

    setEvents(eventos);
  }, []);


  useEffect(() => {
    if (!activeBoceto && bocetos.length > 0) {
      renderBoceto(bocetos[0]);
    } else if (activeBoceto) {
      renderBoceto(activeBoceto);
    }
  }, [bocetos, activeBoceto, renderBoceto]);

  const handleConfirmSelection = useCallback((selectedCourses) => {
    setIsModalOpen(false);
    if (selectedCourses.length === 0) return;

    const newId = Math.max(...bocetos.map(b => b.id), 0) + 1;
    const newBoceto = {
      id: newId,
      name: `Boceto #${newId}`,
      cursos: selectedCourses,
    };

    setBocetos(prev => [...prev, newBoceto]);
    renderBoceto(newBoceto);
  }, [bocetos, renderBoceto]);


  function deleteBoceto(id) {
    setBocetos((prev) => {
      const newBocetos = prev.filter((b) => b.id !== id);

      if (selectedBocetoId === id) {
        const nextBoceto = newBocetos[0];
        if (nextBoceto) {
          setSelectedBocetoId(nextBoceto.id);
          renderBoceto(nextBoceto);
        } else {
          setSelectedBocetoId(null);
          setEvents([]);
        }
      }
      return newBocetos;
    });
  }

  return (
    < div className="p-4 md:p-8 bg-background min-h-screen" >
      {/* Header / Botones de Acción: Título central eliminado */}
      < div className="flex justify-between items-center mb-6" >
        <Button
          onClick={() => navigate("/", { state: { from: "schedules" } })}
          variant="outline"
          className="flex items-center text-foreground border-border hover:bg-muted rounded-lg shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        {/* Espacio del título central */}
        <div className="w-full text-center">
          {/* H1 Eliminado */}
        </div>
        {/* Botón Crear Nuevo Boceto: Usando primary (naranja) */}
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-md transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Crear Nuevo Boceto
        </Button>
      </div >


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Columna Izquierda: Lista de Bocetos */}
        <div className="lg:col-span-1">
          {/* Tarjeta: Fondo de tarjeta oscuro, Borde de color eliminado (solo shadow) */}
          <Card className="rounded-2xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Mis Bocetos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-3 pr-4">
                  {bocetos.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No hay bocetos. Crea uno para empezar.</p>
                  ) : (
                    bocetos.map((b) => (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl cursor-pointer transition-all flex justify-between items-start group relative border
                                                    ${selectedBocetoId === b.id
                            ? 'bg-primary/10 border-primary shadow-md'
                            : 'bg-card hover:bg-secondary/50 border-border'
                          }`}
                        onClick={() => renderBoceto(b)}
                      >
                        <div>
                          <h3 className={`font-bold ${selectedBocetoId === b.id ? 'text-primary' : 'text-foreground'}`}>{b.name}</h3>
                          <p className="text-xs text-muted-foreground mb-1">Materias: {b.cursos.length}</p>

                          <div className="text-xs space-y-0.5 opacity-80 mt-1 text-muted-foreground">
                            {b.cursos.slice(0, 3).map((c) => (
                              <p key={c.codigo} className="truncate">• {c.codigo} — {c.nombre}</p>
                            ))}
                            {b.cursos.length > 3 && <p className="italic text-xs">... {b.cursos.length - 3} materias más</p>}
                          </div>
                        </div>

                        {/* Botón Eliminar: Usando destructive (rojo) */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`absolute top-2 right-2 p-1 h-auto w-auto text-destructive hover:bg-destructive/10 transition-opacity 
                                                                ${bocetos.length > 1 ? 'opacity-0 group-hover:opacity-100' : 'opacity-50 cursor-not-allowed'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBoceto(b.id);
                          }}
                          disabled={bocetos.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Calendario */}
        <div className="lg:col-span-3">
          {/* Tarjeta: Borde de color eliminado (solo shadow) */}
          <Card className="rounded-2xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">
                Horario: {activeBoceto ? activeBoceto.name : 'Seleccione o Cree un Boceto'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[70vh] max-h-[70vh] overflow-hidden">
                {activeBoceto ? (
                  <CalendarView events={events} small={true} />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-muted/50 rounded-xl border border-dashed border-border text-muted-foreground">
                    Selecciona un boceto a la izquierda o crea uno nuevo para visualizar tu horario.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botón Volver arriba: Usando primary (naranja) */}
      <Button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-xl transition-transform transform hover:scale-105"
        size="icon"
      >
        <ArrowUp className="w-5 h-5" />
      </Button>

      {/* Modal de Selección de Cursos */}
      {
        isModalOpen && (
          <CourseSelectModal
            onClose={() => setIsModalOpen(false)}
            onConfirm={handleConfirmSelection}
            COURSES_URL={COURSES_URL}
          />
        )
      }
    </div >
  );
}