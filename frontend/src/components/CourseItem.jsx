export default function CourseItem({ course }) {
  return (
    <div className="p-3 rounded-md border hover:shadow-md transition bg-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{course.codigo || course.code || "—"}</div>
          <div className="text-sm text-muted-foreground truncate max-w-xl">{course.nombre || course.nombre || course.title}</div>
        </div>
        <div className="text-xs text-gray-300">
          {course.creditos ?? course.credits ?? ""}
        </div>
      </div>
    </div>
  );
}
