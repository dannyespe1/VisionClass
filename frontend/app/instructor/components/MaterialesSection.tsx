
import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileText,
  Video,
  ClipboardList,
  Plus,
  Trash2,
  Download,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Library,
  Layers,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const BASELINE_TITLE = "baseline d2r";

type MaterialType = "pdf" | "video" | "test";

type MaterialForm = {
  title: string;
  description: string;
  type: MaterialType;
  url: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
};

type CourseMeta = {
  thumbnail: string;
  level: string;
  field: string;
  modules: ModuleBlock[];
  totalLessons: number;
  totalDurationHours: number;
};

type CourseItem = {
  id: number;
  title: string;
  description: string;
  meta: CourseMeta;
};

type ModuleBlock = {
  id: string;
  name: string;
  lessons: number;
  tests: number;
  durationMinutes: number;
};

type CourseModule = {
  id: number;
  title: string;
  order: number;
  durationMinutes: number;
  courseId: number;
  courseTitle: string;
};

type CourseLesson = {
  id: number;
  title: string;
  order: number;
  moduleId: number;
  moduleTitle: string;
  courseId: number;
};

type CourseMaterial = {
  id: number;
  title: string;
  description: string;
  materialType: MaterialType;
  url: string;
  metadata: Record<string, any>;
  lessonId: number;
  lessonTitle: string;
  moduleId: number;
  moduleTitle: string;
  courseId: number;
  courseTitle: string;
  createdAt: string;
};

export function MaterialesSection() {
  const { token } = useAuth();
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedType, setSelectedType] = useState<MaterialType | "all">("all");
  const [manageCourseId, setManageCourseId] = useState("");
  const [youtubePreview, setYoutubePreview] = useState("");
  const [status, setStatus] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<any[]>([]);
  const [aiSourcesOpen, setAiSourcesOpen] = useState(false);
  const [aiSources, setAiSources] = useState<
    Array<{
      type: "pdf" | "video" | "lesson" | "course" | "module";
      title: string;
      detail: string;
      status: string;
      reason: string;
    }>
  >([]);
  const sourceTypeLabels: Record<string, string> = {
    pdf: "PDF",
    video: "Video",
    lesson: "Leccion",
    course: "Curso",
    module: "Modulo",
  };
  const sourceTypeIcons: Record<string, JSX.Element> = {
    pdf: <FileText className="h-4 w-4 text-sky-600" />,
    video: <Video className="h-4 w-4 text-violet-600" />,
    lesson: <BookOpen className="h-4 w-4 text-emerald-600" />,
    course: <Library className="h-4 w-4 text-amber-600" />,
    module: <Layers className="h-4 w-4 text-indigo-600" />,
  };
  const [aiDifficulty, setAiDifficulty] = useState("media");
  const [aiNumQuestions, setAiNumQuestions] = useState(20);
  const [aiContext, setAiContext] = useState("");
  const [aiTargetCourseId, setAiTargetCourseId] = useState("");
  const [aiTargetModuleId, setAiTargetModuleId] = useState("");
  const [aiTargetTestId, setAiTargetTestId] = useState("");

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [moduleTestDrafts, setModuleTestDrafts] = useState<Record<number, number>>({});
  const [finalExamEnabled, setFinalExamEnabled] = useState(false);

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseThumb, setNewCourseThumb] = useState("");
  const [newCourseField, setNewCourseField] = useState("");
  const [newCourseLevel, setNewCourseLevel] = useState("Basico");
  const [modulesDraft, setModulesDraft] = useState<ModuleBlock[]>([
    { id: crypto.randomUUID(), name: "Modulo 1", lessons: 4, tests: 1, durationMinutes: 120 },
  ]);

  const [formData, setFormData] = useState<MaterialForm>({
    title: "",
    description: "",
    type: "pdf",
    url: "",
    courseId: "",
    moduleId: "",
    lessonId: "",
  });
  const [filePdf, setFilePdf] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(null);

  const totalLessons = useMemo(
    () => modulesDraft.reduce((acc, m) => acc + (m.lessons || 0), 0),
    [modulesDraft]
  );
  const totalDuration = useMemo(
    () => modulesDraft.reduce((acc, m) => acc + (m.durationMinutes || 0), 0),
    [modulesDraft]
  );
  const refreshData = async () => {
    if (!token) return;
    try {
      const [coursesData, modulesData, lessonsData, materialsData] = await Promise.all([
        apiFetch<CourseItem[]>("/api/courses/", {}, token),
        apiFetch<any[]>("/api/course-modules/", {}, token),
        apiFetch<any[]>("/api/course-lessons/", {}, token),
        apiFetch<any[]>("/api/course-materials/", {}, token),
      ]);

      const filteredCourses = (coursesData || []).filter(
        (c) => (c.title || "").toLowerCase() !== BASELINE_TITLE
      );

      const mappedModules: CourseModule[] = (modulesData || [])
        .filter((m) => (m.course.title || "").toLowerCase() !== BASELINE_TITLE)
        .map((m) => ({
          id: m.id,
          title: m.title,
          order: m.order || 0,
          durationMinutes: Math.round((m.duration_hours || 0) * 60),
          courseId: m.course.id,
          courseTitle: m.course.title || "Curso",
        }));

      const mappedLessons: CourseLesson[] = (lessonsData || [])
        .filter((l) => (l.module.course.title || "").toLowerCase() !== BASELINE_TITLE)
        .map((l) => ({
          id: l.id,
          title: l.title,
          order: l.order || 0,
          moduleId: l.module.id,
          moduleTitle: l.module.title || "Modulo",
          courseId: l.module.course.id,
        }));

      const mappedMaterials: CourseMaterial[] = (materialsData || [])
        .filter((mat) => (mat.lesson.module.course.title || "").toLowerCase() !== BASELINE_TITLE)
        .map((mat) => ({
          id: mat.id,
          title: mat.title,
          description: mat.description || "",
          materialType: mat.material_type as MaterialType,
          url: mat.url || "",
          metadata: mat.metadata || {},
          lessonId: mat.lesson.id,
          lessonTitle: mat.lesson.title || "Leccion",
          moduleId: mat.lesson.module.id,
          moduleTitle: mat.lesson.module.title || "Modulo",
          courseId: mat.lesson.module.course.id,
          courseTitle: mat.lesson.module.course.title || "Curso",
          createdAt: mat.created_at || "",
        }));

      setCourses(filteredCourses);
      setCourseModules(mappedModules);
      setCourseLessons(mappedLessons);
      setMaterials(mappedMaterials);

      if (!formData.courseId && filteredCourses.length) {
        setFormData((prev) => ({ ...prev, courseId: String(filteredCourses[0].id) }));
      }
      if (!aiTargetCourseId && filteredCourses.length) {
        setAiTargetCourseId(String(filteredCourses[0].id));
      }
      if (!manageCourseId && filteredCourses.length) {
        setManageCourseId(String(filteredCourses[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("instructor_material_course_id");
    if (saved) {
      setManageCourseId(saved);
      setSelectedCourseId(saved);
      setFormData((prev) => ({ ...prev, courseId: saved }));
    }
  }, []);

  const moduleOptions = useMemo(() => {
    if (!formData.courseId) return [];
    return courseModules
      .filter((m) => String(m.courseId) === formData.courseId)
      .map((m) => ({ id: String(m.id), label: m.title }));
  }, [courseModules, formData.courseId]);

  const lessonOptions = useMemo(() => {
    if (!formData.moduleId) return [];
    return courseLessons
      .filter((l) => String(l.moduleId) === formData.moduleId)
      .map((l) => ({ id: String(l.id), label: l.title }));
  }, [courseLessons, formData.moduleId]);

  const aiModuleOptions = useMemo(() => {
    if (!aiTargetCourseId) return [];
    return courseModules
      .filter((m) => String(m.courseId) === aiTargetCourseId)
      .map((m) => ({ id: String(m.id), label: m.title }));
  }, [courseModules, aiTargetCourseId]);

  const isModuleTestLesson = (title: string) => {
    const normalized = (title || "").toLowerCase();
    return normalized.startsWith("prueba ") || normalized.startsWith("test ");
  };

  const isFinalExamLesson = (title: string) => (title || "").toLowerCase().includes("examen final");

  const getModuleTestLessons = (moduleId: number) => {
    return courseLessons
      .filter((l) => l.moduleId === moduleId && isModuleTestLesson(l.title))
      .sort((a, b) => a.order - b.order);
  };

  const getCourseFinalExamLesson = (courseId: number) => {
    return courseLessons.find((l) => l.courseId === courseId && isFinalExamLesson(l.title));
  };

  const aiTestOptions = useMemo(() => {
    if (!aiTargetModuleId) return [];
    const moduleId = Number(aiTargetModuleId);
    const tests = getModuleTestLessons(moduleId);
    const options = tests.map((t, idx) => ({
      id: `module:${moduleId}:test:${idx + 1}`,
      label: t.title || `Prueba ${idx + 1}`,
      lessonId: t.id,
    }));
    const courseId = Number(aiTargetCourseId || 0);
    const finalExam = courseId ? getCourseFinalExamLesson(courseId) : null;
    if (finalExam) {
      options.push({
        id: `final:${finalExam.id}`,
        label: finalExam.title || "Examen final",
        lessonId: finalExam.id,
      });
    }
    return options;
  }, [aiTargetModuleId, aiTargetCourseId, courseLessons]);

  useEffect(() => {
    if (moduleOptions.length && !formData.moduleId) {
      setFormData((prev) => ({ ...prev, moduleId: moduleOptions[0].id }));
    }
  }, [moduleOptions, formData.moduleId]);

  useEffect(() => {
    if (lessonOptions.length && !formData.lessonId) {
      setFormData((prev) => ({ ...prev, lessonId: lessonOptions[0].id }));
    }
  }, [lessonOptions, formData.lessonId]);

  useEffect(() => {
    if (aiModuleOptions.length && !aiTargetModuleId) {
      setAiTargetModuleId(aiModuleOptions[0].id);
    }
  }, [aiModuleOptions, aiTargetModuleId]);

  useEffect(() => {
    if (aiTestOptions.length && !aiTargetTestId) {
      setAiTargetTestId(aiTestOptions[0].id);
    }
  }, [aiTestOptions, aiTargetTestId]);

  useEffect(() => {
    if (!manageCourseId) return;
    const courseId = Number(manageCourseId);
    const courseModuleIds = courseModules.filter((m) => m.courseId === courseId).map((m) => m.id);
    const draft: Record<number, number> = {};
    courseModuleIds.forEach((id) => {
      draft[id] = getModuleTestLessons(id).length;
    });
    setModuleTestDrafts(draft);
    setFinalExamEnabled(Boolean(getCourseFinalExamLesson(courseId)));
  }, [manageCourseId, courseModules, courseLessons]);

  const addModuleDraft = () => {
    setModulesDraft((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: `Modulo ${prev.length + 1}`, lessons: 3, tests: 1, durationMinutes: 90 },
    ]);
  };

  const updateModuleDraft = (id: string, field: keyof Omit<ModuleBlock, "id">, value: string | number) => {
    setModulesDraft((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: typeof value === "string" ? value : Number(value) } : m))
    );
  };

  const removeModuleDraft = (id: string) => {
    setModulesDraft((prev) => prev.filter((m) => m.id !== id));
  };

  const moveModuleDraft = (id: string, dir: "up" | "down") => {
    setModulesDraft((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
      return copy;
    });
  };
  const createCourse = async () => {
    if (!newCourseTitle.trim()) {
      setStatus("Agrega un titulo de curso");
      return;
    }
    if (!token) {
      setStatus("Debes iniciar sesin");
      return;
    }
    try {
      setStatus("Creando curso...");
      const meta: CourseMeta = {
        thumbnail: newCourseThumb,
        level: newCourseLevel,
        field: newCourseField,
        modules: modulesDraft,
        totalLessons,
        totalDurationHours: totalDuration,
      };
      const created = await apiFetch<CourseItem>(
        "/api/courses/",
        {
          method: "POST",
          body: JSON.stringify({
            title: newCourseTitle,
            description: `${newCourseDesc}\n\n[meta]: ${JSON.stringify(meta)}`,
            is_active: true,
          }),
        },
        token
      );

      for (let i = 0; i < modulesDraft.length; i += 1) {
        const moduleDraft = modulesDraft[i];
        const moduleRes = await apiFetch<any>(
          "/api/course-modules/",
          {
            method: "POST",
            body: JSON.stringify({
              course_id: created.id,
              title: moduleDraft.name,
              order: i + 1,
              duration_hours: (moduleDraft.durationMinutes || 0) / 60,
            }),
          },
          token
        );
        const lessonsToCreate = Math.max(1, Number(moduleDraft.lessons) || 0);
        for (let j = 0; j < lessonsToCreate; j += 1) {
          await apiFetch(
            "/api/course-lessons/",
            {
              method: "POST",
              body: JSON.stringify({
                module_id: moduleRes.id,
                title: `Leccion ${j + 1}`,
                order: j + 1,
              }),
            },
            token
          );
        }
        const testsToCreate = Math.max(0, Number(moduleDraft.tests) || 0);
        for (let t = 0; t < testsToCreate; t += 1) {
          await apiFetch(
            "/api/course-lessons/",
            {
              method: "POST",
              body: JSON.stringify({
                module_id: moduleRes.id,
                title: `Prueba ${t + 1}`,
                order: lessonsToCreate + t + 1,
              }),
            },
            token
          );
        }
        if (i === modulesDraft.length - 1) {
          await apiFetch(
            "/api/course-lessons/",
            {
              method: "POST",
              body: JSON.stringify({
                module_id: moduleRes.id,
                title: "Examen final",
                order: lessonsToCreate + testsToCreate + 1,
              }),
            },
            token
          );
        }
      }

      setNewCourseTitle("");
      setNewCourseDesc("");
      setNewCourseThumb("");
      setNewCourseField("");
      setNewCourseLevel("Basico");
      setModulesDraft([{ id: crypto.randomUUID(), name: "Modulo 1", lessons: 4, tests: 1, durationMinutes: 120 }]);
      setStatus("Curso creado");
      await refreshData();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error creando curso";
      setStatus(msg);
    }
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesCourse = selectedCourseId === "all" || String(material.courseId) === selectedCourseId;
    const matchesType = selectedType === "all" || material.materialType === selectedType;
    return matchesCourse && matchesType;
  });

  const openNewMaterial = () => {
    setEditingMaterial(null);
    setFormData({
      title: "",
      description: "",
      type: "pdf",
      url: "",
      courseId: formData.courseId || (courses[0] ? String(courses[0].id) : ""),
      moduleId: moduleOptions[0]?.id || "",
      lessonId: lessonOptions[0]?.id || "",
    });
    setFilePdf(null);
    setFileBase64("");
    setYoutubePreview("");
    setShowMaterialModal(true);
  };

  const openEditMaterial = (material: CourseMaterial) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description,
      type: material.materialType,
      url: material.url,
      courseId: String(material.courseId),
      moduleId: String(material.moduleId),
      lessonId: String(material.lessonId),
    });
    setFilePdf(null);
    setFileBase64("");
    setYoutubePreview(material.materialType === "video" && material.url ? material.url.replace("watchv=", "embed/") : "");
    setShowMaterialModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!formData.lessonId) {
      setStatus("Selecciona una leccin");
      return;
    }
    let finalUrl = formData.url;
    const metadata: Record<string, any> = {};
    if (formData.type === "pdf" && filePdf) {
      metadata.file_name = filePdf.name;
      metadata.file_size = filePdf.size;
      metadata.file_type = filePdf.type;
      finalUrl = finalUrl || "";
    }

    try {
      if (editingMaterial) {
        await apiFetch(
          `/api/course-materials/${editingMaterial.id}/`,
          {
            method: "PATCH",
            body: JSON.stringify({
              lesson_id: Number(formData.lessonId),
              material_type: formData.type,
              title: formData.title,
              description: formData.description,
              url: finalUrl,
              metadata,
              file_name: filePdf.name || "",
              file_content_type: filePdf.type || "",
              file_size: filePdf.size || 0,
              file_base64: fileBase64 || "",
            }),
          },
          token
        );
        setStatus("Material actualizado");
        await refreshData();
      } else {
        await apiFetch(
          "/api/course-materials/",
          {
            method: "POST",
            body: JSON.stringify({
              lesson_id: Number(formData.lessonId),
              material_type: formData.type,
              title: formData.title,
              description: formData.description,
              url: finalUrl,
              metadata,
              file_name: filePdf.name || "",
              file_content_type: filePdf.type || "",
              file_size: filePdf.size || 0,
              file_base64: fileBase64 || "",
            }),
          },
          token
        );
        setStatus("Material guardado");
        await refreshData();
      }
      setShowMaterialModal(false);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error guardando material";
      setStatus(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await apiFetch(`/api/course-materials/${id}/`, { method: "DELETE" }, token);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setStatus("Material eliminado");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error eliminando material";
      setStatus(msg);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!token) return;
    try {
      await apiFetch(`/api/courses/${courseId}/`, { method: "DELETE" }, token);
      setStatus("Curso eliminado");
      await refreshData();
    } catch (err) {
      console.error(err);
      setStatus("Error eliminando curso");
    }
  };

  const handleYoutubePreview = (url: string) => {
    setFormData((prev) => ({ ...prev, url }));
    const match = url.match(/(:youtu\.be\/|v=)([^&#]+)/);
    if (match && match[1]) {
      setYoutubePreview(`https://www.youtube.com/embed/${match[1]}`);
    } else {
      setYoutubePreview("");
    }
  };

  const saveModule = async (module: CourseModule) => {
    if (!token) return;
    try {
      await apiFetch(
        `/api/course-modules/${module.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: module.title,
            order: module.order,
              duration_hours: (module.durationMinutes || 0) / 60,
            }),
          },
          token
        );
      setStatus("Modulo actualizado");
    } catch (err) {
      console.error(err);
      setStatus("Error actualizando modulo");
    }
  };

  const moveModule = async (moduleId: number, dir: "up" | "down") => {
    const courseModulesForCourse = courseModules
      .filter((m) => String(m.courseId) === manageCourseId)
      .sort((a, b) => a.order - b.order);
    const idx = courseModulesForCourse.findIndex((m) => m.id === moduleId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= courseModulesForCourse.length) return;
    const current = courseModulesForCourse[idx];
    const target = courseModulesForCourse[swapIdx];
    const updated = courseModules.map((m) => {
      if (m.id === current.id) return { ...m, order: target.order };
      if (m.id === target.id) return { ...m, order: current.order };
      return m;
    });
    setCourseModules(updated);
    await saveModule({ ...current, order: target.order });
    await saveModule({ ...target, order: current.order });
  };

  const addModuleToCourse = async () => {
    if (!token || !manageCourseId) return;
    const courseId = Number(manageCourseId);
    const count = courseModules.filter((m) => m.courseId === courseId).length;
    try {
      const moduleRes = await apiFetch<any>(
        "/api/course-modules/",
        {
          method: "POST",
          body: JSON.stringify({
            course_id: courseId,
            title: `Modulo ${count + 1}`,
            order: count + 1,
            duration_hours: 1,
          }),
        },
        token
      );
      await apiFetch(
        "/api/course-lessons/",
        {
          method: "POST",
          body: JSON.stringify({
            module_id: moduleRes.id,
            title: "Leccion 1",
            order: 1,
          }),
        },
        token
      );
      setStatus("Modulo creado");
      await refreshData();
    } catch (err) {
      console.error(err);
      setStatus("Error creando modulo");
    }
  };

  const addLesson = async (moduleId: number) => {
    if (!token) return;
    const lessonsForModule = courseLessons.filter((l) => l.moduleId === moduleId);
    const nextOrder = lessonsForModule.length + 1;
    try {
      await apiFetch(
        "/api/course-lessons/",
        {
          method: "POST",
          body: JSON.stringify({
            module_id: moduleId,
            title: `Leccion ${nextOrder}`,
            order: nextOrder,
          }),
        },
        token
      );
      setStatus("Leccion creada");
      await refreshData();
    } catch (err) {
      console.error(err);
      setStatus("Error creando leccin");
    }
  };

  const syncModuleTests = async (moduleId: number, desiredCount: number) => {
    if (!token) return;
    const existing = getModuleTestLessons(moduleId);
    const safeCount = Math.max(0, Math.floor(desiredCount));
    try {
      if (safeCount > existing.length) {
        const lessonsForModule = courseLessons.filter((l) => l.moduleId === moduleId);
        let nextOrder = lessonsForModule.length + 1;
        for (let i = existing.length; i < safeCount; i += 1) {
          await apiFetch(
            "/api/course-lessons/",
            {
              method: "POST",
              body: JSON.stringify({
                module_id: moduleId,
                title: `Prueba ${i + 1}`,
                order: nextOrder,
              }),
            },
            token
          );
          nextOrder += 1;
        }
      } else if (safeCount < existing.length) {
        const toRemove = existing.slice(safeCount);
        for (const lesson of toRemove) {
          await apiFetch(`/api/course-lessons/${lesson.id}/`, { method: "DELETE" }, token);
        }
      }
      setStatus("Pruebas por modulo actualizadas");
      await refreshData();
    } catch (err) {
      console.error(err);
      setStatus("Error actualizando pruebas");
    }
  };

  const toggleFinalExam = async (enabled: boolean) => {
    if (!token || !manageCourseId) return;
    const courseId = Number(manageCourseId);
    const finalLesson = getCourseFinalExamLesson(courseId);
    const modulesForCourse = courseModules
      .filter((m) => m.courseId === courseId)
      .sort((a, b) => a.order - b.order);
    const lastModule = modulesForCourse[modulesForCourse.length - 1];
    if (!lastModule) return;
    try {
      if (enabled && !finalLesson) {
        const lessonsForModule = courseLessons.filter((l) => l.moduleId === lastModule.id);
        const nextOrder = lessonsForModule.length + 1;
        await apiFetch(
          "/api/course-lessons/",
          {
            method: "POST",
            body: JSON.stringify({
              module_id: lastModule.id,
              title: "Examen final",
              order: nextOrder,
            }),
          },
          token
        );
      }
      if (!enabled && finalLesson) {
        await apiFetch(`/api/course-lessons/${finalLesson.id}/`, { method: "DELETE" }, token);
      }
      setFinalExamEnabled(enabled);
      setStatus("Examen final actualizado");
      await refreshData();
    } catch (err) {
      console.error(err);
      setStatus("Error actualizando examen final");
    }
  };

  const saveLesson = async (lesson: CourseLesson) => {
    if (!token) return;
    try {
      await apiFetch(
        `/api/course-lessons/${lesson.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: lesson.title,
            order: lesson.order,
          }),
        },
        token
      );
      setStatus("Leccion actualizada");
    } catch (err) {
      console.error(err);
      setStatus("Error actualizando leccion");
    }
  };

  const moveLesson = async (lessonId: number, dir: "up" | "down") => {
    const lesson = courseLessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const lessonsForModule = courseLessons
      .filter((l) => l.moduleId === lesson.moduleId)
      .sort((a, b) => a.order - b.order);
    const idx = lessonsForModule.findIndex((l) => l.id === lessonId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= lessonsForModule.length) return;
    const current = lessonsForModule[idx];
    const target = lessonsForModule[swapIdx];
    const updated = courseLessons.map((l) => {
      if (l.id === current.id) return { ...l, order: target.order };
      if (l.id === target.id) return { ...l, order: current.order };
      return l;
    });
    setCourseLessons(updated);
    await saveLesson({ ...current, order: target.order });
    await saveLesson({ ...target, order: current.order });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Materiales</h3>
          <p className="text-sm text-slate-500">Crea cursos, organiza modulos y sube recursos.</p>
          {status && <p className="text-xs text-slate-500 mt-1">{status}</p>}
        </div>
        <Button onClick={openNewMaterial}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo material
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Crear curso</h3>
            <p className="text-xs text-slate-500">Define nivel, campo, modulos y tiempos estimados.</p>
          </div>
          <Button onClick={createCourse} className="text-sm">
            Crear curso
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Titulo del curso" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} />
          <Input placeholder="Descripcion" value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} />
          <Input placeholder="Campo (Informatica, Economia, etc)" value={newCourseField} onChange={(e) => setNewCourseField(e.target.value)} />
          <Select value={newCourseLevel} onValueChange={(v) => setNewCourseLevel(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Basico">Basico</SelectItem>
              <SelectItem value="Intermedio">Intermedio</SelectItem>
              <SelectItem value="Avanzado">Avanzado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="URL miniatura (opcional)" value={newCourseThumb} onChange={(e) => setNewCourseThumb(e.target.value)} />
          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 text-sm">
            <p className="text-xs text-slate-500 mb-1">Resumen</p>
            <p className="font-semibold text-slate-900">{newCourseTitle || "Sin titulo"}</p>
            <p className="text-xs text-slate-500">Nivel: {newCourseLevel} | Campo: {newCourseField || "Sin campo"}</p>
            <p className="text-xs text-slate-500 mt-1">
              Modulos: {modulesDraft.length} | Lecciones: {totalLessons} | Duracion: {totalDuration} min
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Modulos</h4>
            <Button variant="outline" size="sm" onClick={addModuleDraft}>
              <Plus className="w-4 h-4 mr-1" /> Agregar modulo
            </Button>
          </div>
          <div className="space-y-2">
            {modulesDraft.map((m, idx) => (
              <div
                key={m.id}
                className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1 space-y-2">
                  <Input value={m.name} onChange={(e) => updateModuleDraft(m.id, "name", e.target.value)} placeholder={`Modulo ${idx + 1}`} />
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-600">Lecciones</Label>
                      <Input type="number" min={0} value={m.lessons} onChange={(e) => updateModuleDraft(m.id, "lessons", Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-600">Pruebas por modulo</Label>
                      <Input type="number" min={0} value={m.tests} onChange={(e) => updateModuleDraft(m.id, "tests", Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-600">Duracion (min)</Label>
                      <Input type="number" min={0} value={m.durationMinutes} onChange={(e) => updateModuleDraft(m.id, "durationMinutes", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => moveModuleDraft(m.id, "up")} disabled={idx === 0}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => moveModuleDraft(m.id, "down")} disabled={idx === modulesDraft.length - 1}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeModuleDraft(m.id)} disabled={modulesDraft.length <= 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Gestion de modulos y lecciones</h3>
            <p className="text-xs text-slate-500">Edita nombres, orden, pruebas por modulo y examen final.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={addModuleToCourse} disabled={!manageCourseId}>
              + Modulo
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Curso</Label>
            <Select
              value={manageCourseId}
              onValueChange={(value) => {
                setManageCourseId(value);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("instructor_material_course_id", value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={String(course.id)}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!manageCourseId) return;
                if (!window.confirm("Seguro que deseas eliminar este curso")) return;
                handleDeleteCourse(Number(manageCourseId));
              }}
            >
              Eliminar curso
            </Button>
          </div>
        </div>

        {manageCourseId && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Examen final del curso</p>
              <p className="text-xs text-slate-500">Habilita o elimina el examen final en el ultimo modulo.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFinalExam(!finalExamEnabled)}
            >
              {finalExamEnabled ? "Quitar examen final" : "Crear examen final"}
            </Button>
          </div>
        )}

        {!manageCourseId && (
          <p className="text-xs text-slate-500">Selecciona un curso para administrar sus modulos.</p>
        )}

        {manageCourseId &&
          courseModules
            .filter((m) => String(m.courseId) === manageCourseId)
            .sort((a, b) => a.order - b.order)
            .map((module, idx) => (
              <div key={module.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={module.title}
                      onChange={(e) =>
                        setCourseModules((prev) =>
                          prev.map((m) => (m.id === module.id ? { ...m, title: e.target.value } : m))
                        )
                      }
                    />
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-600">Duracion (min)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={module.durationMinutes}
                        onChange={(e) =>
                          setCourseModules((prev) =>
                            prev.map((m) =>
                              m.id === module.id ? { ...m, durationMinutes: Number(e.target.value) } : m
                            )
                          )
                        }
                      />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-600">Pruebas del modulo</Label>
                        <Input
                          type="number"
                          min={0}
                          value={moduleTestDrafts[module.id] ?? 0}
                          onChange={(e) =>
                            setModuleTestDrafts((prev) => ({
                              ...prev,
                              [module.id]: Number(e.target.value),
                            }))
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncModuleTests(module.id, moduleTestDrafts[module.id] ?? 0)}
                        >
                          Actualizar
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => moveModule(module.id, "up")} disabled={idx === 0}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => moveModule(module.id, "down")}
                      disabled={idx === courseModules.filter((m) => String(m.courseId) === manageCourseId).length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => saveModule(module)}>
                      Guardar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addLesson(module.id)}>
                      + Leccion
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {courseLessons
                    .filter((lesson) => lesson.moduleId === module.id)
                    .sort((a, b) => a.order - b.order)
                    .map((lesson, lessonIdx) => (
                      <div key={lesson.id} className="flex flex-col md:flex-row md:items-center gap-2">
                        <Input
                          value={lesson.title}
                          onChange={(e) =>
                            setCourseLessons((prev) =>
                              prev.map((l) => (l.id === lesson.id ? { ...l, title: e.target.value } : l))
                            )
                          }
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => moveLesson(lesson.id, "up")}
                            disabled={lessonIdx === 0}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => moveLesson(lesson.id, "down")}
                            disabled={
                              lessonIdx ===
                              courseLessons.filter((l) => l.moduleId === module.id).length - 1
                            }
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => saveLesson(lesson)}>
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Curso</Label>
          <Select value={selectedCourseId} onValueChange={(value) => setSelectedCourseId(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
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
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Generar prueba con IA</h3>
            <p className="text-sm text-slate-500">Genera preguntas y exporta a una prueba del modulo o examen final.</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Borrador</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Curso</Label>
            <Select value={aiTargetCourseId} onValueChange={(v) => setAiTargetCourseId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Curso" />
              </SelectTrigger>
              <SelectContent>
                {!courses.length && <SelectItem value="nocourse">Sin cursos</SelectItem>}
                {courses.map((course) => (
                  <SelectItem key={course.id} value={String(course.id)}>
                    {course.title}
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
            <Input type="number" min={1} max={20} value={aiNumQuestions} onChange={(e) => setAiNumQuestions(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Contexto / notas</Label>
            <Textarea value={aiContext} onChange={(e) => setAiContext(e.target.value)} placeholder="Resumen del contenido, objetivos, temas clave..." rows={3} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Modulo destino</Label>
            <Select value={aiTargetModuleId} onValueChange={(v) => setAiTargetModuleId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Modulo" />
              </SelectTrigger>
              <SelectContent>
                {aiModuleOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prueba destino</Label>
            <Select value={aiTargetTestId} onValueChange={(v) => setAiTargetTestId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Prueba" />
              </SelectTrigger>
              <SelectContent>
                {aiTestOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={async () => {
                if (!token) {
                  alert("Inicia sesión para usar IA.");
                  return;
                }
                try {
                  setAiLoading(true);
                  const res = await apiFetch<{ questions: any[]; sources: any[] }>(
                    "/api/ai/generate-test/",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        course_id: aiTargetCourseId,
                        module_id: aiTargetModuleId || null,
                        difficulty: aiDifficulty,
                        num_questions: aiNumQuestions,
                        context: aiContext,
                        include_materials: true,
                      }),
                    },
                    token
                  );
                  setAiQuestions(res.questions || []);
                  setAiSources(res.sources || []);
                } catch (err: any) {
                  alert(err.message || "Error generando prueba");
                } finally {
                  setAiLoading(false);
                }
              }}
              disabled={aiLoading}
              className="w-full"
            >
              {aiLoading ? "Generando..." : "Generar prueba IA"}
            </Button>
          </div>
        </div>

        {aiQuestions.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Preguntas generadas ({aiQuestions.length})</h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiSourcesOpen(true)}
                  disabled={!aiSources.length}
                >
                  Ver material usado
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!token || !aiTargetTestId) return;
                  try {
                    let lessonId: number | null = null;
                    if (aiTargetTestId.startsWith("final:")) {
                      const finalId = Number(aiTargetTestId.split(":")[1]);
                      lessonId = Number.isNaN(finalId) ? null : finalId;
                    } else if (aiTargetTestId.startsWith("module:")) {
                      const parts = aiTargetTestId.split(":");
                      const moduleId = Number(parts[1]);
                      const testIndex = Number(parts[3]);
                      const existing = getModuleTestLessons(moduleId);
                      const target = existing[testIndex - 1];
                      if (target.id) {
                        lessonId = target.id;
                      } else {
                        const lessonsForModule = courseLessons.filter((l) => l.moduleId === moduleId);
                        const nextOrder = lessonsForModule.length + 1;
                        const created = await apiFetch<any>(
                          "/api/course-lessons/",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              module_id: moduleId,
                              title: `Prueba ${testIndex}`,
                              order: nextOrder,
                            }),
                          },
                          token
                        );
                        lessonId = created.id || null;
                      }
                    }
                    if (!lessonId) return;
                    await apiFetch(
                      "/api/course-materials/",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          lesson_id: Number(lessonId),
                          material_type: "test",
                          title: "Prueba IA",
                          description: "Prueba generada automaticamente",
                          url: "",
                          metadata: {
                            questions: aiQuestions,
                            difficulty: aiDifficulty,
                            num_questions: aiNumQuestions,
                          },
                        }),
                      },
                      token
                    );
                    setStatus("Prueba exportada al curso");
                    await refreshData();
                  } catch (err) {
                    console.error(err);
                    setStatus("No se pudo exportar la prueba");
                  }
                }}
              >
                Exportar al curso
              </Button>
            </div>
            <div className="space-y-2 max-h-80 overflow-auto pr-2">
              {aiQuestions.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {idx + 1}. {q.question}
                  </p>
                  <div className="text-xs text-slate-500 mb-2">Dificultad: {q.difficulty}</div>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {q.options.map((opt: string, i: number) => (
                      <li key={i}>{opt}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-emerald-600 mt-1">Respuesta sugerida: {q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Dialog open={aiSourcesOpen} onOpenChange={setAiSourcesOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Material usado para generar la prueba</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {!aiSources.length && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  No hay materiales detectados para este módulo.
                </div>
              )}
              {aiSources.map((item, idx) => (
                <div key={`${item.type}-${idx}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {sourceTypeIcons[item.type] || <ClipboardList className="h-4 w-4 text-slate-400" />}
                    <span>{item.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Tipo: {sourceTypeLabels[item.type] || item.type}
                  </div>
                  {item.detail && <div className="text-xs text-slate-600 mt-1">{item.detail}</div>}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAiSourcesOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map((material) => (
          <div key={material.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 transition transform hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {material.materialType === "pdf" && <FileText className="w-4 h-4 text-sky-600" />}
                {material.materialType === "video" && <Video className="w-4 h-4 text-violet-600" />}
                {material.materialType === "test" && <ClipboardList className="w-4 h-4 text-emerald-600" />}
                <p className="text-sm font-semibold text-slate-900">{material.title}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-1 rounded-full hover:bg-slate-100" title="Descargar / abrir" onClick={() => window.open(material.url || "#", "_blank")}>
                  <Download className="w-4 h-4 text-slate-500" />
                </button>
                <button className="p-1 rounded-full hover:bg-slate-100" title="Eliminar" onClick={() => handleDelete(material.id)}>
                  <Trash2 className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">{material.courseTitle}</p>
            <p className="text-xs text-slate-500">{material.moduleTitle} - {material.lessonTitle}</p>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{material.createdAt ? new Date(material.createdAt).toLocaleDateString() : ""}</span>
              <Button variant="outline" size="sm" onClick={() => openEditMaterial(material)}>Editar</Button>
            </div>
            {material.materialType === "video" && material.url && (
              <div className="rounded-lg overflow-hidden border border-slate-100">
                <iframe
                  src={material.url.replace("watchv=", "embed/")}
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
      {showMaterialModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingMaterial ? "Editar material" : "Nuevo material"}
                </h3>
                <p className="text-sm text-slate-500">Sube un PDF, video de YouTube o un test.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowMaterialModal(false)}>
                Cerrar
              </Button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detalles del material" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Curso</Label>
                  <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={String(course.id)}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as MaterialType })}>
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modulo</Label>
                  <Select value={formData.moduleId} onValueChange={(value) => setFormData({ ...formData, moduleId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar modulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leccion</Label>
                  <Select value={formData.lessonId} onValueChange={(value) => setFormData({ ...formData, lessonId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar leccion" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessonOptions.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL / recurso</Label>
                <Input
                  value={formData.url}
                  onChange={(e) =>
                    formData.type === "video"
                      ? handleYoutubePreview(e.target.value)
                      : setFormData({ ...formData, url: e.target.value })
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
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setFilePdf(file);
                      setFileBase64("");
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === "string" ? reader.result : "";
                        const base64 = result.includes(",") ? result.split(",")[1] : result;
                        setFileBase64(base64 || "");
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <p className="text-xs text-slate-500">Si adjuntas un PDF local, la URL es opcional.</p>
                </div>
              )}

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
                <Button type="button" variant="outline" onClick={() => setShowMaterialModal(false)}>
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
