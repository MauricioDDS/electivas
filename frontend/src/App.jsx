import { useState, useEffect } from "react";
import CourseList from "./components/CourseList";
import CourseDetail from "./components/CourseDetail";

function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filter, setFilter] = useState("todas");

  useEffect(() => {
    let url = "http://localhost:8000/courses";
    if (filter !== "todas") {
      url += `?tipo=${filter}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch((err) => console.error(err));
  }, [filter]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pensum Universitario</h1>

      <div className="mb-4">
        <label className="mr-2 font-medium">Filtrar por tipo:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="todas">Todas</option>
          <option value="obligatoria">Obligatorias</option>
          <option value="electiva">Electivas</option>
        </select>
      </div>

      <CourseList courses={courses} onSelect={setSelectedCourse} />

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  );
}

export default App;