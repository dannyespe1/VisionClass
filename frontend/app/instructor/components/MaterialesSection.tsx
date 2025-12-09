import { useState } from "react";
import { Upload, FileText, Video, ClipboardList, Plus, Trash2, Download } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

type MaterialType = "pdf" | "video" | "test";

interface Material {
  id: number;
  title: string;
  type: MaterialType;
  course: string;
  uploadDate: string;
  size?: string;
  duration?: string;
}

export function MaterialesSection() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedType, setSelectedType] = useState<MaterialType | "all">("all");

  const [materials, setMaterials] = useState<Material[]>([
    {
      id: 1,
      title: "Introducción a Variables y Tipos de Datos",
      type: "pdf",
      course: "Introducción a Python",
      uploadDate: "15 Nov 2024",
      size: "2.4 MB",
    },
    {
      id: 2,
      title: "Tutorial: Estructuras de Control",
      type: "video",
      course: "Introducción a Python",
      uploadDate: "14 Nov 2024",
      duration: "45 min",
    },
    {
      id: 3,
      title: "Evaluación: Módulo 1",
      type: "test",
      course: "Introducción a Python",
      uploadDate: "13 Nov 2024",
    },
    {
      id: 4,
      title: "Fundamentos de Redes Neuronales",
      type: "pdf",
      course: "Machine Learning Básico",
      uploadDate: "12 Nov 2024",
      size: "3.1 MB",
    },
    {
      id: 5,
      title: "Demo: Regresión Lineal en Python",
      type: "video",
      course: "Machine Learning Básico",
      uploadDate: "11 Nov 2024",
      duration: "32 min",
    },
  ]);

  const courses = [
    "Introducción a Python",
    "Machine Learning Básico",
    "Estructuras de Datos",
  ];

  const filteredMaterials = materials.filter((material) => {
    const matchesCourse = selectedCourse === "all" || material.course === selectedCourse;
    const matchesType = selectedType === "all" || material.type === selectedType;
    return matchesCourse && matchesType;
  });

  const getMaterialIcon = (type: MaterialType) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-5 h-5 text-red-600" />;
      case "video":
        return <Video className="w-5 h-5 text-purple-600" />;
      case "test":
        return <ClipboardList className="w-5 h-5 text-blue-600" />;
    }
  };

  const getMaterialBg = (type: MaterialType) => {
    switch (type) {
      case "pdf":
        return "bg-red-50";
      case "video":
        return "bg-purple-50";
      case "test":
        return "bg-blue-50";
    }
  };

  const deleteMaterial = (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este material?")) {
      setMaterials(materials.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Materiales de Curso</h1>
        <p className="text-gray-600">
          Gestiona y sube contenido para tus estudiantes
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-red-600" />
            <span className="text-2xl">
              {materials.filter((m) => m.type === "pdf").length}
            </span>
          </div>
          <div className="text-sm text-gray-600">Documentos PDF</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Video className="w-8 h-8 text-purple-600" />
            <span className="text-2xl">
              {materials.filter((m) => m.type === "video").length}
            </span>
          </div>
          <div className="text-sm text-gray-600">Videos</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            <span className="text-2xl">
              {materials.filter((m) => m.type === "test").length}
            </span>
          </div>
          <div className="text-sm text-gray-600">Evaluaciones</div>
        </div>
      </div>

      {/* Filters and Upload */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cursos</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as MaterialType | "all")}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo de material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="test">Evaluaciones</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Subir Material
        </Button>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6">Material</th>
                <th className="text-left py-4 px-6">Curso</th>
                <th className="text-left py-4 px-6">Fecha</th>
                <th className="text-left py-4 px-6">Info</th>
                <th className="text-right py-4 px-6">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((material) => (
                <tr key={material.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${getMaterialBg(
                          material.type
                        )}`}
                      >
                        {getMaterialIcon(material.type)}
                      </div>
                      <div>
                        <div className="mb-1">{material.title}</div>
                        <div className="text-sm text-gray-600 capitalize">
                          {material.type === "pdf"
                            ? "Documento PDF"
                            : material.type === "video"
                            ? "Video"
                            : "Evaluación"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">{material.course}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">{material.uploadDate}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">
                      {material.size || material.duration || "-"}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => deleteMaterial(material.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMaterials.length === 0 && (
          <div className="text-center py-12">
            <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl mb-2">No hay materiales</h3>
            <p className="text-gray-600 mb-6">
              Comienza subiendo tu primer material para este curso
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Subir Material
            </Button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl mb-6">Subir Nuevo Material</h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Título del Material</Label>
                <Input id="title" placeholder="Ej: Introducción a Variables" />
              </div>

              <div>
                <Label htmlFor="course">Curso</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un curso" />
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

              <div>
                <Label htmlFor="type">Tipo de Material</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">Documento PDF</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="test">Evaluación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe brevemente el contenido..."
                  rows={3}
                />
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="mb-2">
                  Arrastra tu archivo aquí o <span className="text-blue-600">busca</span>
                </div>
                <p className="text-sm text-gray-500">
                  Soporta: PDF, MP4, DOCX (Max. 100MB)
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setShowUploadModal(false)}>
                  Subir Material
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
