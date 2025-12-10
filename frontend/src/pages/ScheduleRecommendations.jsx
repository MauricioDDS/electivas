import React, { useEffect, useState } from "react";

const ScheduleRecommendations = () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [otherCourses, setOtherCourses] = useState([]);
  const [showOtherCourses, setShowOtherCourses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8023";

      const token = localStorage.getItem("token");

      const res = await fetch(`${baseUrl}/recommend-schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}), // en Postman también enviabas un body vacío
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      console.log("📌 Respuesta schedule API:", data);

      setScheduleData(data);

      // Materias recomendadas por el microservicio
      const recommended = Array.isArray(data.courses) ? data.courses : [];

      // Todas las materias posibles
      const raw = Array.isArray(data.raw_courses) ? data.raw_courses : [];

      // Filtramos las que NO están en el horario sugerido
      const recommendedCodes = new Set(recommended.map((c) => c.codigo));
      const others = raw.filter((c) => !recommendedCodes.has(c.codigo));

      setRecommendedCourses(recommended);
      setOtherCourses(others);
    } catch (err) {
      console.error(err);
      setError("No pudimos cargar las recomendaciones. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="recommendations-page">
        <header className="recommendations-header">
          <h1 className="page-title">Recomendaciones de Horario</h1>
          <p className="page-subtitle">Cargando recomendaciones…</p>
        </header>
      </div>
    );
  }

  return (
    <div className="recommendations-page">
      <header className="recommendations-header">
        <h1 className="page-title">Recomendaciones de Horario</h1>
        <p className="page-subtitle">
          Te mostramos una propuesta de horario basada en tu rendimiento y las
          materias disponibles.
        </p>

        {scheduleData && (
          <p className="credits-summary">
            Créditos sugeridos:&nbsp;
            <strong>{scheduleData.total_credits}</strong> /{" "}
            <strong>{scheduleData.max_credits}</strong>
          </p>
        )}

        {error && <p className="error-message">{error}</p>}
      </header>

      {/* HORARIO SUGERIDO */}
      <section className="section">
        <h2 className="section-title">Horario sugerido</h2>

        {recommendedCourses.length === 0 ? (
          <p>No hay recomendaciones disponibles por ahora.</p>
        ) : (
          <div className="course-grid">
            {recommendedCourses.map((course) => (
              <article key={course.codigo} className="course-card">
  <div className="course-code">{course.codigo}</div>
  <div className="course-name" title={course.nombre}>
    {course.nombre}
  </div>
  <div className="course-footer">
    <span>Horas: {course.horas ?? course.horas_semanales ?? "-"}</span>
    <span> | Créditos: {course.creditos}</span>
  </div>
</article>
            ))}
          </div>
        )}
      </section>

      {/* OTRAS MATERIAS */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Otras materias disponibles</h2>

          {otherCourses.length > 0 && (
            <button
              type="button"
              className="toggle-button"
              onClick={() => setShowOtherCourses((prev) => !prev)}
            >
              {showOtherCourses ? "Ocultar materias" : "Ver otras materias"}
            </button>
          )}
        </div>

        {otherCourses.length === 0 ? (
          <p>No hay otras materias registradas.</p>
        ) : (
          showOtherCourses && (
            <div className="course-grid">
              {otherCourses.map((course) => (
                <article
  key={course.codigo}
  className="course-card course-card-secondary"
>
  <div className="course-code">{course.codigo}</div>
  <div className="course-name" title={course.nombre}>
    {course.nombre}
  </div>
  <div className="course-footer">
    <span>Horas: {course.horas ?? course.horas_semanales ?? "-"}</span>
    <span> | Créditos: {course.creditos}</span>
  </div>
</article>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
};

export default ScheduleRecommendations;
