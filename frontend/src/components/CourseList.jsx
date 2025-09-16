function CourseList({ courses, onSelect }) {
  return (
    <table className="w-full border-collapse border">
      <thead>
        <tr className="bg-gray-100">
          <th className="border p-2">Código</th>
          <th className="border p-2">Nombre</th>
          <th className="border p-2">Créditos</th>
          <th className="border p-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {courses.map((c) => (
          <tr key={c.id}>
            <td className="border p-2">{c.codigo}</td>
            <td className="border p-2">{c.nombre}</td>
            <td className="border p-2">{c.creditos}</td>
            <td className="border p-2">
              <button
                onClick={() => onSelect(c)}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                Ver detalle
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CourseList;