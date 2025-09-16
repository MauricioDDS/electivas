function CourseDetail({ course, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 shadow-lg w-96">
        <h2 className="text-xl font-bold mb-2">{course.nombre}</h2>
        <p><strong>Código:</strong> {course.codigo}</p>
        <p><strong>Créditos:</strong> {course.creditos}</p>
        <p><strong>Tipo:</strong> {course.tipo}</p>
        <p><strong>Semestre:</strong> {course.semestre}</p>
        <p>
          <strong>Prerequisitos:</strong>{" "}
          {course.prerequisitos.length > 0
            ? course.prerequisitos.join(", ")
            : "Ninguno"}
        </p>
        <button
          onClick={onClose}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default CourseDetail;