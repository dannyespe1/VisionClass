import { useState } from "react";
import { Upload, FileText, Video, ClipboardList, Plus, Trash2, Download, Link } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type MaterialType = "pdf" | "video" | "test";

interface Material {
  id: number;
  title: string;
  type: MaterialType;
  course: string;
  uploadDate: string;
  size?: string;
  duration?: string;
  url?: string;
}

export function MaterialesSection() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedType, setSelectedType] = useState<MaterialType | "all">("all");
  const [youtubePreview, setYoutubePreview] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<any[]>([]);
  const [aiDifficulty, setAiDifficulty] = useState("media");
  const [aiNumQuestions, setAiNumQuestions] = useState(20);
  const [aiContext, setAiContext] = useState("");
  const { token } = useAuth();

  const [materials, setMaterials] = useState<Material[]>([
    {
      id: 1,
      title: "Introduccion a Variables y Tipos de Datos",
      type: "pdf",
      course: "Introduccion a Python",
      uploadDate: "15 Nov 2024",
      size: "2.4 MB",
    },
    {
      id: 2,
      title: "Tutorial: Estructuras de Control",
      type: "video",
      course: "Introduccion a Python",
      uploadDate: "14 Nov 2024",
      duration: "45 min",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      id: 3,
      title: "Evaluacion: Modulo 1",
      type: "test",
      course: "Introduccion a Python",
      uploadDate: "13 Nov 2024",
    },
    {
      id: 4,
      title: "Fundamentos de Redes Neuronales",
      type: "pdf",
      course: "Machine Learning Basico",
      uploadDate: "12 Nov 2024",
      size: "3.1 MB",
    },
    {
      id: 5,
      title: "Demo: Regresion Lineal en Python",
      type: "video",
      course: "Machine Learning Basico",
      uploadDate: "11 Nov 2024",
      duration: "32 min",
      url: "https://www.youtube.com/watch?v=oHg5SJYRHA0",
    },
  ]);

  const courses = ["Introduccion a Python", "Machine Learning Basico", "Estructuras de Datos"];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "pdf" as MaterialType,
    url: "",
    course: courses[0],
  });
  const [filePdf, setFilePdf] = useState<File | null>(null);

  const filteredMaterials = materials.filter((material) => {
    const matchesCourse = selectedCourse === "all" || material.course === selectedCourse;
    const matchesType = selectedType === "all" || material.type === selectedType;
    return matchesCourse && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = formData.url;
    if (formData.type === "pdf" && filePdf) {
      finalUrl = URL.createObjectURL(filePdf);
    }
    const newMaterial: Material = {
      id: Date.now(),
      title: formData.title,
      type: formData.type,
      course: formData.course,
      uploadDate: new Date().toLocaleDateString(),
      size: formData.type === "pdf" ? "2 MB" : undefined,
      duration: formData.type === "video" ? "10 min" : undefined,
      url: finalUrl,
    };
    setMaterials([newMaterial, ...materials]);
    setFormData({ title: "", description: "", type: "pdf", url: "", course: courses[0] });
    setYoutubePreview("");
    setFilePdf(null);
      setShowUploadModal(false);
  };

  const handleDelete = (id: number) => {
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const handleYoutubePreview = (url: string) => {
    setFormData((prev) => ({ ...prev, url }));
    const match = url.match(/(?:youtu\.be\/|v=)([^&#]+)/);
    if (match && match[1]) {
      setYoutubePreview(`https://www.youtube.com/embed/${match[1]}`);
    } else {
      setYoutubePreview("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Materiales</h3>
          <p className="text-sm text-slate-500">Sube PDFs, videos o tests y gestiona tus cursos.</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo material
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Curso</Label>
          <Select value={selectedCourse} onValueChange={(value) => setSelectedCourse(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI test generation */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Generar prueba con IA</h3>
            <p className="text-sm text-slate-500">
              Genera hasta 20 preguntas (mock) basadas en el curso y dificultad. Proxima iteracion: OpenAI real.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Borrador
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Curso</Label>
            <Select value={selectedCourse === "all" ? courses[0] : selectedCourse} onValueChange={(v) => setSelectedCourse(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dificultad</Label>
            <Select value={aiDifficulty} onValueChange={(v) => setAiDifficulty(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Dificultad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Numero de preguntas (max 20)</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={aiNumQuestions}
              onChange={(e) => setAiNumQuestions(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Contexto / notas</Label>
            <Textarea
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              placeholder="Resumen del contenido, objetivos, temas clave..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={async () => {
              if (!token) {
                alert("Inicia sesión para usar IA.");
                return;
              }
              try {
                setAiLoading(true);
                const res = await apiFetch<{ questions: any[] }>(
                  "/api/ai/generate-test/",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      course_id: selectedCourse === "all" ? courses[0] : selectedCourse,
                      difficulty: aiDifficulty,
                      num_questions: aiNumQuestions,
                      context: aiContext,
                    }),
                  },
                  token
                );
                setAiQuestions(res.questions || []);
              } catch (err: any) {
                alert(err?.message || "Error generando prueba");
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
          >
            {aiLoading ? "Generando..." : "Generar prueba IA"}
          </Button>
        </div>

        {aiQuestions.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Preguntas generadas ({aiQuestions.length})</h4>
            <div className="space-y-2 max-h-80 overflow-auto pr-2">
              {aiQuestions.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {idx + 1}. {q.question}
                  </p>
                  <div className="text-xs text-slate-500 mb-2">Dificultad: {q.difficulty}</div>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {q.options?.map((opt: string, i: number) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-emerald-600 mt-1">Respuesta sugerida: {q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map((material) => (
          <div
            key={material.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 transition transform hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {material.type === "pdf" && <FileText className="w-4 h-4 text-sky-600" />}
                {material.type === "video" && <Video className="w-4 h-4 text-violet-600" />}
                {material.type === "test" && <ClipboardList className="w-4 h-4 text-emerald-600" />}
                <p className="text-sm font-semibold text-slate-900">{material.title}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="p-1 rounded-full hover:bg-slate-100"
                  title="Descargar / abrir"
                  onClick={() => window.open(material.url || "#", "_blank")}
                >
                  <Download className="w-4 h-4 text-slate-500" />
                </button>
                <button className="p-1 rounded-full hover:bg-slate-100" title="Eliminar" onClick={() => handleDelete(material.id)}>
                  <Trash2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">{material.course}</p>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{material.uploadDate}</span>
              <span>{material.size || material.duration || "—"}</span>
            </div>
            {material.type === "video" && material.url && (
              <div className="rounded-lg overflow-hidden border border-slate-100">
                <iframe
                  src={material.url.replace("watch?v=", "embed/")}
                  className="w-full h-40"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={material.title}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Nuevo material</h3>
                <p className="text-sm text-slate-500">Sube un PDF, video de YouTube o un test.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowUploadModal(false)}>
                Cerrar
              </Button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles del material"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Curso</Label>
                  <Select value={formData.course} onValueChange={(value) => setFormData({ ...formData, course: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course} value={course}>
                          {course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as MaterialType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL / recurso</Label>
                <Input
                  value={formData.url}
                  onChange={(e) =>
                    formData.type === "video" ? handleYoutubePreview(e.target.value) : setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder={formData.type === "video" ? "https://... (YouTube)" : "https://... (opcional si subes PDF)"}
                  required={formData.type !== "pdf"}
                />
              </div>

              {formData.type === "pdf" && (
                <div className="space-y-2">
                  <Label>Archivo PDF (local)</Label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFilePdf(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-slate-500">Si adjuntas un PDF local, la URL es opcional.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <FileText className="w-3 h-3" />
                  PDF
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Video className="w-3 h-3" />
                  Video YouTube
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <ClipboardList className="w-3 h-3" />
                  Test
                </span>
              </div>

              {youtubePreview && formData.type === "video" && (
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                  <iframe
                    src={youtubePreview}
                    title="YouTube preview"
                    className="w-full h-52"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Upload className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
