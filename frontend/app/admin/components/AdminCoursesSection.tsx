export function AdminCoursesSection() {
  const courses = [
    {
      title: "Machine Learning Básico",
      instructor: "Dra. Ana Rodríguez",
      students: 120,
      attention: 81,
      status: "En curso",
    },
    {
      title: "Introducción a Python",
      instructor: "Dr. Carlos Martínez",
      students: 210,
      attention: 86,
      status: "En curso",
    },
    {
      title: "Deep Learning Avanzado",
      instructor: "Dra. Sofía Chen",
      students: 95,
      attention: 76,
      status: "Requiere revisión",
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Cursos</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div
            key={course.title}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition transform hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-900">{course.title}</p>
              <span
                className={`text-xs px-3 py-1 rounded-full border ${
                  course.status === "Requiere revisión"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}
              >
                {course.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">{course.instructor}</p>
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-600">Estudiantes: {course.students}</p>
              <p className="text-slate-600">Atención: {course.attention}%</p>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="text-xs font-semibold rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-100">
                Ver detalles
              </button>
              <button className="text-xs font-semibold rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-100">
                Ajustar curso
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
