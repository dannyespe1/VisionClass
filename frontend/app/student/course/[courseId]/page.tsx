"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  Maximize,
  Play,
  Settings as SettingsIcon,
  TrendingUp,
  Video,
  Volume2,
} from "lucide-react";
import { apiFetch, BACKEND_URL, postFrameToML, checkMLServiceHealth } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../ui/button";
import { CameraPermissionModal, PermissionSettings } from "../../CameraPermissionModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../ui/tooltip";

type CourseModule = {
  id: number;
  title: string;
  order: number;
  durationMinutes: number;
};

type CourseLesson = {
  id: number;
  title: string;
  order: number;
  moduleId: number;
  moduleOrder: number;
};

type CourseMaterial = {
  id: number;
  title: string;
  description: string;
  materialType: "pdf" | "video" | "test";
  url: string;
  metadata: Record<string, any>;
  lessonId: number;
};

type LessonSummary = {
  id: number;
  title: string;
  materialType: "pdf" | "video" | "test";
  duration: string;
  completed: boolean;
};

const toYoutubeEmbed = (url: string) => {
  if (!url) return "";
  if (url.includes("embed/")) return url;
  
  // Handle youtube.com/watch?v=VIDEO_ID format
  if (url.includes("watch?v=")) {
    const match = url.match(/v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }
  
  // Handle youtu.be/VIDEO_ID format
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1].split("?")[0].split("&")[0];
    if (id) return `https://www.youtube.com/embed/${id}`;
  }
  
  return url;
};

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const courseId = Number(params.courseId);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraActiveRef = useRef(false);
  const faceDetectorRef = useRef<any | null>(null);
  const sessionRef = useRef<number | null>(null);
  const progressSyncRef = useRef<{ lessonId: number | null; completed: number }>({
    lessonId: null,
    completed: -1,
  });
  const initialLessonSetRef = useRef(false);
  const attentionAggRef = useRef<{ sum: number; count: number; lastSent: number }>({
    sum: 0,
    count: 0,
    lastSent: 0,
  });
  const contentViewRef = useRef<{
    id: number | null;
    startedAt: number;
    contentType: "pdf" | "video" | "quiz";
    contentId: string;
  } | null>(null);

  const [courseTitle, setCourseTitle] = useState("Curso");
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<Record<string, any>>({});
  const [enrollmentLoaded, setEnrollmentLoaded] = useState(false);

  const [permissionOpen, setPermissionOpen] = useState(true);
  const [permissionSettings, setPermissionSettings] = useState<PermissionSettings>({
    enableCamera: false,
    enableAttentionTracking: false,
    saveAnalytics: false,
    shareWithInstructor: false,
  });
  const [showCameraSettings, setShowCameraSettings] = useState(false);
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});

  const [attentionScore, setAttentionScore] = useState(85);
  const [readingTime, setReadingTime] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [attentionStatus, setAttentionStatus] = useState<"ok" | "no_face" | "pending" | "error">("pending");
  const [mlServiceStatus, setMlServiceStatus] = useState<"checking" | "available" | "unavailable" | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
    
    // Verificar disponibilidad del ML Service
    const checkML = async () => {
      setMlServiceStatus("checking");
      const health = await checkMLServiceHealth();
      if (health.ok) {
        console.log("✅ ML Service disponible");
        setMlServiceStatus("available");
      } else {
        console.error("❌ ML Service no disponible:", health.message);
        setMlServiceStatus("unavailable");
      }
    };
    checkML();
  }, [token, router]);

  useEffect(() => {
    const init = async () => {
      if (!token || !courseId || sessionRef.current) return;
      try {
        const me = await apiFetch<{ id: number }>("/api/me/", {}, token);
        const resolvedUserId = me.id || null;
        setUserId(resolvedUserId);
        const session = await apiFetch<any>(
          "/api/sessions/",
          {
            method: "POST",
            body: JSON.stringify({ course_id: courseId, student_id: resolvedUserId }),
          },
          token
        );
        if (session.id) {
          sessionRef.current = session.id;
          setSessionId(session.id);
        }
        const enrollments = await apiFetch<any[]>("/api/enrollments/", {}, token);
        let enrollment = (enrollments || []).find((e) => e.course && e.course.id === courseId);
        if (!enrollment) {
          enrollment = await apiFetch<any>(
            "/api/enrollments/",
            {
              method: "POST",
              body: JSON.stringify({ course_id: courseId }),
            },
            token
          );
        }
        if (enrollment.id) {
          setEnrollmentId(enrollment.id);
          setEnrollmentData(enrollment.enrollment_data || {});
          setEnrollmentLoaded(true);
        }
      } catch (err) {
        console.error(err);
        setEnrollmentLoaded(true);
      }
    };
    init();
  }, [token, courseId]);

  useEffect(() => {
    if (!enrollmentLoaded) return;
    const lastLessonId = Number(enrollmentData.last_lesson_id || 0);
    if (!lastLessonId) return;
    if (lessons.find((lesson) => lesson.id === lastLessonId)) {
      setSelectedLessonId(lastLessonId);
      initialLessonSetRef.current = true;
    }
  }, [enrollmentData, lessons, enrollmentLoaded]);

  useEffect(() => {
    const load = async () => {
      if (!token || !courseId) return;
      setLoading(true);
      setError(null);
      try {
        const [course, modulesData, lessonsData, materialsData] = await Promise.all([
          apiFetch<any>(`/api/courses/${courseId}/`, {}, token),
          apiFetch<any[]>("/api/course-modules/", {}, token),
          apiFetch<any[]>("/api/course-lessons/", {}, token),
          apiFetch<any[]>("/api/course-materials/", {}, token),
        ]);
        setCourseTitle(course.title || "Curso");
        const mappedModules = (modulesData || [])
          .filter((m) => m.course.id === courseId)
          .map((m) => ({
            id: m.id,
            title: m.title,
            order: m.order || 0,
            durationMinutes: Math.round((m.duration_hours || 0) * 60),
          }));
        setModules(mappedModules);
        const mappedLessons = (lessonsData || [])
          .filter((l) => l.module.course.id === courseId)
          .map((l) => ({
            id: l.id,
            title: l.title,
            order: l.order || 0,
            moduleId: l.module.id,
            moduleOrder: mappedModules.find((m) => m.id === l.module.id)?.order || 0,
          }));
        const mappedMaterials = (materialsData || [])
          .filter((mat) => mat.lesson.module.course.id === courseId)
          .map((mat) => ({
            id: mat.id,
            title: mat.title,
            description: mat.description || "",
            materialType: mat.material_type,
            url: mat.url || "",
            metadata: mat.metadata || {},
            lessonId: mat.lesson.id,
          }));
        setLessons(mappedLessons);
        setMaterials(mappedMaterials);
        const lastLessonId = Number(enrollmentData.last_lesson_id || 0);
        const lessonIds = new Set(mappedLessons.map((lesson) => lesson.id));
        if (lastLessonId && lessonIds.has(lastLessonId)) {
          if (selectedLessonId !== lastLessonId) {
            setSelectedLessonId(lastLessonId);
          }
          initialLessonSetRef.current = true;
        } else if (enrollmentLoaded && !selectedLessonId && mappedLessons.length) {
          const firstLesson = [...mappedLessons].sort(
            (a, b) => (a.moduleOrder - b.moduleOrder) || (a.order - b.order)
          )[0];
          setSelectedLessonId(firstLesson.id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo cargar el curso";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, courseId, enrollmentData]);

  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => (a.moduleOrder - b.moduleOrder) || (a.order - b.order));
  }, [lessons]);

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId) || null;
  const lessonMaterials = materials.filter((m) => m.lessonId === selectedLessonId);
  const currentMaterial = lessonMaterials[0] || null;

  const currentLessonIndex = sortedLessons.findIndex((l) => l.id === selectedLessonId);
  const completedLessons = currentLessonIndex >= 0 ? currentLessonIndex : 0;

  const lessonsSummary: LessonSummary[] = useMemo(() => {
    return sortedLessons.map((lesson, idx) => {
      const material = materials.find((m) => m.lessonId === lesson.id);
      return {
        id: lesson.id,
        title: lesson.title,
        materialType: material?.materialType ?? "pdf",
        duration: "15 min",
        completed: idx < currentLessonIndex,
      };
    });
  }, [sortedLessons, materials, currentLessonIndex]);

  const groupedLessons = useMemo(() => {
    const modulesMap = new Map<number, CourseModule>();
    modules.forEach((m) => modulesMap.set(m.id, m));
    const byModule: Record<number, LessonSummary[]> = {};
    lessonsSummary.forEach((lesson) => {
      const lessonMeta = lessons.find((l) => l.id === lesson.id);
      const moduleId = lessonMeta?.moduleId || 0;
      if (!byModule[moduleId]) byModule[moduleId] = [];
      byModule[moduleId].push(lesson);
    });
    Object.values(byModule).forEach((list) => {
      list.sort((a, b) => {
        const aMeta = lessons.find((l) => l.id === a.id);
        const bMeta = lessons.find((l) => l.id === b.id);
        return (aMeta?.moduleOrder || 0) - (bMeta?.moduleOrder || 0) || (aMeta?.order || 0) - (bMeta?.order || 0);
      });
    });
    const orderedModules = [...modules].sort((a, b) => a.order - b.order);
    const moduleList = orderedModules.map((m) => ({
      id: m.id,
      title: m.title || `Módulo ${m.order + 1}`,
      lessons: byModule[m.id] || [],
    }));
    const unassigned = byModule[0] || [];
    if (unassigned.length) {
      moduleList.push({ id: 0, title: "Lecciónes", lessons: unassigned });
    }
    return moduleList;
  }, [modules, lessonsSummary, lessons]);

  useEffect(() => {
    setReadingTime(0);
    setPdfUrl(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizError(null);
  }, [selectedLessonId]);

  useEffect(() => {
    if (!modules.length) return;
    setOpenModules((prev) => {
      if (Object.keys(prev).length) return prev;
      const first = modules[0].id;
      return first ? { [first]: true } : prev;
    });
  }, [modules]);

  useEffect(() => {
    if (!selectedLessonId) return;
    const lesson = lessons.find((item) => item.id === selectedLessonId);
    if (!lesson?.moduleId) return;
    setOpenModules((prev) => ({ ...prev, [lesson.moduleId]: true }));
  }, [selectedLessonId, lessons]);

  useEffect(() => {
    if (!currentMaterial || currentMaterial.materialType !== "pdf") return;
    if (!token) return;

    let objectUrl: string | null = null;
    const loadPdf = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/course-materials/${currentMaterial.id}/download/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const blob = await res.blob();
        objectUrl = window.URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err) {
        console.error(err);
      }
    };
    loadPdf();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [currentMaterial, token]);

  useEffect(() => {
    if (currentMaterial?.materialType === "pdf") {
      const interval = setInterval(() => {
        setReadingTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentMaterial]);

  const persistContentView = async (reason: "switch" | "exit" | "complete") => {
    if (!token || !contentViewRef.current?.id) return;
    const durationSeconds = Math.max(1, Math.round((Date.now() - contentViewRef.current.startedAt) / 1000));
    const payload = {
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    };
    try {
      await fetch(`${BACKEND_URL}/api/content-views/${contentViewRef.current.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (err) {
      console.error(err);
    } finally {
      contentViewRef.current = null;
    }
  };

  const startContentView = async () => {
    if (!token || !sessionId || !userId || !currentMaterial) return;
    const contentType =
      currentMaterial.materialType === "test" ? "quiz" : currentMaterial.materialType;
    const contentId = `material:${currentMaterial.id}`;
    try {
      const view = await apiFetch<{ id: number }>(
        "/api/content-views/",
        {
          method: "POST",
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            content_type: contentType,
            content_id: contentId,
          }),
        },
        token
      );
      contentViewRef.current = {
        id: view.id ?? null,
        startedAt: Date.now(),
        contentType,
        contentId,
      };
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (permissionOpen) return;
    if (!currentMaterial) return;

    startContentView().catch((err) => console.error(err));

    return () => {
      if (contentViewRef.current?.id) {
        persistContentView("switch").catch((err) => console.error(err));
      }
    };
  }, [currentMaterial?.id, permissionOpen]);

  useEffect(() => {
    return () => {
      if (contentViewRef.current?.id) {
        persistContentView("exit").catch((err) => console.error(err));
      }
    };
  }, []);

  const stopCamera = () => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    cameraActiveRef.current = false;
    setAttentionStatus("pending");
  };

  const sendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!sessionId || !userId) return;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Validar que el video tiene contenido
      if (!video.videoWidth || !video.videoHeight) {
        console.warn("[sendFrame] Video no tiene dimensiones aún", {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
        });
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("[sendFrame] No se puede obtener contexto 2D del canvas");
        return;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Client-side face detection using FaceDetector API when available
      if (typeof window !== "undefined" && "FaceDetector" in window) {
        try {
          if (!faceDetectorRef.current) faceDetectorRef.current = new (window as any).FaceDetector();
          const faces = await faceDetectorRef.current.detect(canvas as any);
          if (!faces || faces.length === 0) {
            console.log("[sendFrame] Client-side FaceDetector: no faces detected");
            setAttentionStatus("no_face");
            setAttentionScore(0);
            return;
          }
        } catch (err) {
          console.warn("[sendFrame] FaceDetector error, falling back to server", err);
        }
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );
      if (!blob) {
        console.warn("[sendFrame] No se pudo crear blob de la imagen");
        return;
      }

      const form = new FormData();
      form.append("file", blob, "frame.jpg");
      form.append("session_id", String(sessionId));
      form.append("user_id", String(userId));
      form.append("test_name", "COURSE");
      form.append("course_id", String(courseId));
      if (selectedLessonId) form.append("lesson_id", String(selectedLessonId));
      if (currentMaterial?.materialType) form.append("material_type", currentMaterial.materialType);

      const resp = await postFrameToML(form, token || undefined);
      
      // Validar respuesta
      if (!resp?.ok) {
        console.warn("[sendFrame] Respuesta de ML no válida", {
          ok: resp?.ok,
          error: resp?.error,
          detail: resp?.detail,
        });
        // No cambiar el estado, mantener en "pending" mientras se intenta
        return;
      }
      
      // Extraer datos de frame_score de forma segura
      const frameScore = resp.frame_score || resp.score || {};
      const frameLabel = frameScore.label || frameScore.state;
      const hasFace = frameScore.data?.face ?? frameScore.face ?? false;
      
      console.log("[sendFrame] Frame procesado", {
        has_frame_score: !!resp.frame_score,
        has_score: !!resp.score,
        label: frameLabel,
        hasFace,
        frameScoreKeys: resp.frame_score ? Object.keys(resp.frame_score) : [],
        frameScoreDataKeys: resp.frame_score?.data ? Object.keys(resp.frame_score.data) : [],
        frameValue: frameScore.value,
      });
      
      if (frameLabel === "no_face" || hasFace === false) {
        console.log("[sendFrame] Sin rostro detectado");
        setAttentionStatus("no_face");
        setAttentionScore(0);
        return;
      }
      
      setAttentionStatus("ok");
      
      // Extraer valor de atención con múltiples fallbacks
      let rawValue = frameScore.value ?? resp.score?.value ?? resp.value ?? null;
      
      console.log("[sendFrame] Valores extraídos", {
        frameScore_value: frameScore.value,
        score_value: resp.score?.value,
        resp_value: resp.value,
        rawValue,
      });
      
      if (rawValue !== null && rawValue !== undefined) {
        const normalized = rawValue > 1 ? rawValue : rawValue * 100;
        const rounded = Math.round(normalized);
        console.log("[sendFrame] Atención calculada", {
          rawValue,
          normalized,
          rounded,
        });
        setAttentionScore(rounded);
        
        if (enrollmentId && token) {
          attentionAggRef.current.sum += rounded;
          attentionAggRef.current.count += 1;
          const now = Date.now();
          if (now - attentionAggRef.current.lastSent > 10000) {
            attentionAggRef.current.lastSent = now;
            const avg = attentionAggRef.current.count
              ? Math.round(attentionAggRef.current.sum / attentionAggRef.current.count)
              : 0;
            const nextData = {
              ...enrollmentData,
              attention_avg: avg,
              attention_frames: attentionAggRef.current.count,
              attention_last: rounded,
              attention_updated_at: new Date().toISOString(),
              last_attention_at: new Date().toISOString(),
            };
            setEnrollmentData(nextData);
            console.log("[sendFrame] Enviando datos de atención al backend", {
              avg,
              frames: attentionAggRef.current.count,
            });
            apiFetch(
              `/api/enrollments/${enrollmentId}/`,
              {
                method: "PATCH",
                body: JSON.stringify({ enrollment_data: nextData }),
              },
              token
            ).catch((err) => console.error("[sendFrame] Error actualizando enrollments", err));
          }
        }
      } else {
        console.warn("[sendFrame] No se pudo extraer valor de atención de la respuesta", {
          resp,
        });
      }
    } catch (err) {
      console.error("[sendFrame] Error en sendFrame:", err instanceof Error ? err.message : err);
    }
  };

  const startCamera = async () => {
    if (cameraActiveRef.current) return;
    if (!videoRef.current) return;
    setAttentionStatus("pending");
    try {
      console.log("[startCamera] Iniciando cámara...");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      videoRef.current.srcObject = media;
      
      // Esperar a que el video esté listo antes de empezar a capturar frames
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout esperando video")), 5000);
        const handleCanPlay = () => {
          clearTimeout(timeout);
          videoRef.current?.removeEventListener("canplay", handleCanPlay);
          resolve();
        };
        videoRef.current?.addEventListener("canplay", handleCanPlay);
      });
      
      await videoRef.current.play();
      cameraActiveRef.current = true;
      console.log("[startCamera] Cámara iniciada correctamente");
      
      // Comenzar a capturar frames cada 1 segundo
      frameTimerRef.current = setInterval(() => {
        if (cameraActiveRef.current && videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
          sendFrame();
        }
      }, 1000);
    } catch (err) {
      console.error("[startCamera] Error al iniciar cámara:", err instanceof Error ? err.message : err);
      cameraActiveRef.current = false;
      setAttentionStatus("pending");
    }
  };

  useEffect(() => {
    if (permissionSettings.enableCamera) {
      startCamera();
      return () => stopCamera();
    }
    stopCamera();
    return undefined;
  }, [permissionSettings.enableCamera, sessionId, userId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        persistProgressNow();
        stopCamera();
      }
    };
    const handleUnload = () => {
      persistProgressNow();
      stopCamera();
    };
    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      stopCamera();
    };
  }, []);

  const requestCamera = async (settings: PermissionSettings) => {
    setPermissionSettings(settings);
    if (!settings.enableCamera) {
      stopCamera();
      setPermissionOpen(false);
      return;
    }
    try {
      console.log("[requestCamera] Verificando permisos de cámara...");
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      console.log("[requestCamera] Permisos de cámara otorgados");
      
      // Verificar disponibilidad del servicio ML
      console.log("[requestCamera] Verificando disponibilidad del servicio ML...");
      const healthCheck = await checkMLServiceHealth();
      if (!healthCheck.ok) {
        console.warn("[requestCamera] Servicio ML no disponible. Algunos datos pueden no procesarse.", {
          service_url: healthCheck.url,
          message: healthCheck.message,
        });
      } else {
        console.log("[requestCamera] Servicio ML disponible");
      }
    } catch (err) {
      console.error("[requestCamera] Error al acceder a la cámara:", err instanceof Error ? err.message : err);
      // No lanzar error, permitir continuar sin cámara
    } finally {
      setPermissionOpen(false);
    }
  };

  const persistProgressNow = async () => {
    if (!token || !enrollmentId || !selectedLessonId || !sortedLessons.length) return;
    const completed = Math.max(currentLessonIndex, 0);
    const total = sortedLessons.length;
    const progressPercent = total ? Math.round((completed / total) * 100) : 0;
    const nextData = {
      ...enrollmentData,
      last_lesson_id: selectedLessonId,
      completed_lessons: completed,
      total_lessons: total,
      progress_percent: progressPercent,
      progress: progressPercent,
      updated_at: new Date().toISOString(),
    };
    setEnrollmentData(nextData);
    try {
      await fetch(`${BACKEND_URL}/api/enrollments/${enrollmentId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enrollment_data: nextData }),
        keepalive: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const downloadPdf = async (materialId: number, title: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/course-materials/${materialId}/download/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "documento"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentMaterial.metadata.questions.length) return;
    if (!token || !sessionId || !userId) return;
    const questions = currentMaterial.metadata.questions as Array<{
      question: string;
      answer: string;
      options: string[];
    }>;
    const total = questions.length;
    let correct = 0;
    questions.forEach((q, index) => {
      const selected = quizAnswers[index];
      if (!selected || !q.answer) return;
      const normalizedSelected = selected.trim().toLowerCase();
      const normalizedAnswer = String(q.answer).trim().toLowerCase();
      if (normalizedSelected === normalizedAnswer) {
        correct += 1;
      }
    });
    const score = total ? Math.round((correct / total) * 100) : 0;
    setQuizScore(score);
    setQuizSubmitted(true);
    setQuizError(null);
    try {
      await apiFetch(
        "/api/quiz-attempts/",
        {
          method: "POST",
          body: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            difficulty: currentMaterial.metadata.difficulty === "alta" ? "hard" : "normal",
            score,
            reason: currentMaterial.title || "Evaluación",
          }),
        },
        token
      );
      if (enrollmentId) {
        const nextData = {
          ...enrollmentData,
          last_quiz_score: score,
          last_quiz_at: new Date().toISOString(),
        };
        setEnrollmentData(nextData);
        apiFetch(
          `/api/enrollments/${enrollmentId}/`,
          {
            method: "PATCH",
            body: JSON.stringify({ enrollment_data: nextData }),
          },
          token
        ).catch((err) => console.error(err));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar la evaluación";
      setQuizError(msg);
    }
  };

  const goToNextLesson = () => {
    if (currentLessonIndex === -1) return;
    const next = sortedLessons[currentLessonIndex + 1];
    if (next) {
      setSelectedLessonId(next.id);
      return;
    }
    if (token && enrollmentId) {
      const total = sortedLessons.length;
      const nextData = {
        ...enrollmentData,
        last_lesson_id: selectedLessonId,
        completed_lessons: total,
        total_lessons: total,
        progress_percent: 100,
        progress: 100,
        updated_at: new Date().toISOString(),
      };
      setEnrollmentData(nextData);
      apiFetch(
        `/api/enrollments/${enrollmentId}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "completed", enrollment_data: nextData }),
        },
        token
      ).catch((err) => console.error(err));
    }
  };

  const hasNextLesson = currentLessonIndex < sortedLessons.length - 1 && currentLessonIndex >= 0;

  useEffect(() => {
    const syncProgress = async () => {
      if (!token || !enrollmentId || !selectedLessonId || !sortedLessons.length) return;
      const completed = Math.max(currentLessonIndex, 0);
      const lastSync = progressSyncRef.current;
      if (lastSync.lessonId === selectedLessonId && lastSync.completed === completed) return;
      const total = sortedLessons.length;
      const progressPercent = total ? Math.round((completed / total) * 100) : 0;
      const nextData = {
        ...enrollmentData,
        last_lesson_id: selectedLessonId,
        completed_lessons: completed,
        total_lessons: total,
        progress_percent: progressPercent,
        progress: progressPercent,
        updated_at: new Date().toISOString(),
      };
      progressSyncRef.current = { lessonId: selectedLessonId, completed };
      setEnrollmentData(nextData);
      try {
        await apiFetch(
          `/api/enrollments/${enrollmentId}/`,
          {
            method: "PATCH",
            body: JSON.stringify({ enrollment_data: nextData }),
          },
          token
        );
      } catch (err) {
        console.error(err);
      }
    };
    syncProgress();
  }, [token, enrollmentId, selectedLessonId, currentLessonIndex, sortedLessons.length, enrollmentData]);

  return (
    <main className="min-h-screen bg-slate-50">
      <TooltipProvider>
        <div className="fixed top-4 right-4 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowCameraSettings((prev) => !prev)}
                className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 hover:shadow-xl transition-shadow border border-slate-200"
              >
                <div className="relative">
                  <Camera
                    className={`w-4 h-4 ${permissionSettings.enableCamera ? "text-emerald-600" : "text-slate-400"}`}
                  />
                  <div
                    className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                      permissionSettings.enableCamera ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-sm ${permissionSettings.enableCamera ? "text-emerald-600" : "text-slate-600"}`}
                >
                  {permissionSettings.enableCamera ? "Activa" : "Inactiva"}
                </span>
                <SettingsIcon className="w-3 h-3 text-slate-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2">
                <p className="text-sm">
                  {permissionSettings.enableCamera
                    ? "Cámara activa para análisis de atención. Click para ajustar configuración."
                    : "Cámara inactiva. Click para habilitar análisis de atención."}
                </p>
                {permissionSettings.enableAttentionTracking && (
                  <p className="text-xs text-slate-600">
                    El seguimiento de atención esta recopilando datos de forma segura.
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {showCameraSettings && (
        <div className="fixed top-20 right-4 z-50 bg-white rounded-xl shadow-2xl p-6 w-96 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Configuración de Cámara
            </h3>
            <button
              onClick={() => setShowCameraSettings(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              x
            </button>
          </div>
          <div className="space-y-4">
            {[
              { label: "Habilitar Cámara", value: permissionSettings.enableCamera },
              { label: "Seguimiento de Atención", value: permissionSettings.enableAttentionTracking },
              { label: "Guardar Análisis", value: permissionSettings.saveAnalytics },
              { label: "Compartir con Instructor", value: permissionSettings.shareWithInstructor },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm mb-1">{item.label}</div>
                  <p className="text-xs text-slate-600">Estado actual</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${item.value ? "bg-emerald-500" : "bg-slate-400"}`} />
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setPermissionOpen(true)}>
              Cambiar configuración
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  persistProgressNow();
                  stopCamera();
                  router.push("/student");
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-xl">{courseTitle}</h1>
                <p className="text-sm text-slate-600">{selectedLesson?.title || "Seleccióna una lección"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {permissionSettings.enableAttentionTracking && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                    <Eye className="w-4 h-4 text-blue-600" />
                    {attentionStatus === "no_face" ? (
                      <span className="text-sm">Sin rostro</span>
                    ) : attentionStatus === "pending" ? (
                      <span className="text-sm">Esperando cámara</span>
                    ) : (
                      <span className="text-sm">Atención: {Math.round(attentionScore)}%</span>
                    )}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        attentionStatus === "no_face"
                          ? "bg-slate-400"
                          : attentionStatus === "pending"
                            ? "bg-amber-400"
                            : attentionScore > 80
                              ? "bg-emerald-500"
                              : attentionScore > 60
                                ? "bg-amber-500"
                                : "bg-red-500"
                      }`}
                    />
                  </div>
                  {mlServiceStatus && mlServiceStatus !== "available" && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-amber-700">
                        {mlServiceStatus === "unavailable" ? "ML Service no disponible" : "Verificando servicio..."}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="text-sm text-slate-600">
                Lección {currentLessonIndex + 1} de {sortedLessons.length || 1}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {loading && <p className="text-sm text-slate-500">Cargando contenidos...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!currentMaterial && !loading && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-slate-500">
                No hay contenidos disponibles para esta lección.
              </div>
            )}

            {currentMaterial?.materialType === "pdf" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>Documento PDF</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      Tiempo de lectura: {Math.floor(readingTime / 60)}:{String(readingTime % 60).padStart(2, "0")}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPdf(currentMaterial.id, currentMaterial.title)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </div>

                <div className="bg-white" style={{ minHeight: "600px" }}>
                  {pdfUrl ? (
                    <object data={pdfUrl} type="application/pdf" className="w-full h-[640px]">
                      <p className="p-6 text-sm text-slate-600">
                        No se pudo cargar el PDF. Usa el botón de descarga.
                      </p>
                    </object>
                  ) : (
                    <div className="p-6 text-sm text-slate-500">Cargando PDF...</div>
                  )}
                </div>

                <div className="bg-blue-50 p-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>Lectura en curso</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>Tiempo: {Math.floor(readingTime / 60)}:{String(readingTime % 60).padStart(2, "0")}</span>
                      </div>
                    </div>
                    {permissionSettings.enableAttentionTracking && (
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span>Concentración promedio: {Math.round(attentionScore)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentMaterial?.materialType === "video" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="relative bg-black aspect-video">
                  {currentMaterial.url ? (
                    <iframe
                      src={toYoutubeEmbed(currentMaterial.url)}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={currentMaterial.title}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <Play className="w-20 h-20 opacity-50" />
                    </div>
                  )}

                  {permissionSettings.enableAttentionTracking && (
                    <div className="absolute top-4 right-4 bg-black/70 rounded-lg px-4 py-2 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">{Math.round(attentionScore)}%</span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          attentionScore > 80 ? "bg-emerald-500" : attentionScore > 60 ? "bg-amber-500" : "bg-red-500"
                        }`}
                      />
                    </div>
                  )}

                  {permissionSettings.enableAttentionTracking && attentionScore < 65 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Tu atención ha disminuido. Considera una pausa.</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 text-white px-4 py-3 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Video en reproducción (YouTube)
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Volume2 className="w-4 h-4" />
                    <Maximize className="w-4 h-4" />
                  </div>
                </div>

                {permissionSettings.enableAttentionTracking && (
                  <div className="p-6 border-t">
                    <h3 className="mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Análisis de Atención en Tiempo Real
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl text-blue-600 mb-1">{Math.round(attentionScore)}%</div>
                        <div className="text-sm text-slate-600">Atención Actual</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <div className="text-2xl text-emerald-600 mb-1">87%</div>
                        <div className="text-sm text-slate-600">Promedio Sesión</div>
                      </div>
                      <div className="bg-violet-50 rounded-lg p-4">
                        <div className="text-2xl text-violet-600 mb-1">2</div>
                        <div className="text-sm text-slate-600">Pausas Sugeridas</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentMaterial?.materialType === "test" && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <ClipboardCheck className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl">Evaluación del Módulo</h2>
                    <p className="text-slate-600">El docente publicará las preguntas aquí.</p>
                  </div>
                </div>
                {currentMaterial.metadata?.questions?.length ? (
                  <div className="space-y-6">
                    {currentMaterial.metadata.questions.map((q: any, index: number) => (
                      <div key={q.id || index} className="border-b border-slate-100 pb-5">
                        <div className="text-sm text-slate-500">Pregunta {index + 1}</div>
                        <p className="text-base text-slate-900 mt-1">{q.question}</p>
                        <div className="mt-3 space-y-2">
                          {(q.options || []).map((opt: string, optIndex: number) => (
                            <button
                              key={optIndex}
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [index]: opt }))}
                              className={`w-full text-left px-4 py-2 rounded-lg border transition ${
                                quizAnswers[index] === opt
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-200 hover:border-slate-300 bg-slate-50"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={handleSubmitQuiz}
                        disabled={quizSubmitted || Object.keys(quizAnswers).length === 0}
                      >
                        Enviar evaluación
                      </Button>
                      <Button variant="outline" onClick={() => router.push("/student")}>
                        Volver al inicio
                      </Button>
                      {quizScore !== null && (
                        <span className="text-sm text-emerald-600">
                          Calificación: {quizScore}%
                        </span>
                      )}
                      {quizError && <span className="text-sm text-red-600">{quizError}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">
                    No hay preguntas disponibles aún para esta lección.
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-24">
              <div className="p-6 border-b">
                <h3 className="mb-2">Contenido del Curso</h3>
                <p className="text-sm text-slate-600">
                  {completedLessons} de {sortedLessons.length} completadas
                </p>
              </div>

              <div className="divide-y">
                {groupedLessons.map((group) => (
                  <div key={group.id}>
                    <button
                      className="w-full px-4 py-3 text-xs uppercase tracking-wide text-slate-500 bg-slate-50 flex items-center justify-between"
                      onClick={() =>
                        setOpenModules((prev) => ({
                          ...prev,
                          [group.id]: !prev[group.id],
                        }))
                      }
                    >
                      <span>{group.title}</span>
                      {openModules[group.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {openModules[group.id] &&
                      group.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                            lesson.id === selectedLessonId ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                lesson.completed
                                  ? "bg-emerald-100"
                                  : lesson.id === selectedLessonId
                                    ? "bg-blue-100"
                                    : "bg-slate-100"
                              }`}
                            >
                              {lesson.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : lesson.materialType === "pdf" ? (
                                <FileText
                                  className={`w-4 h-4 ${lesson.id === selectedLessonId ? "text-blue-600" : "text-slate-600"}`}
                                />
                              ) : lesson.materialType === "video" ? (
                                <Video
                                  className={`w-4 h-4 ${lesson.id === selectedLessonId ? "text-blue-600" : "text-slate-600"}`}
                                />
                              ) : (
                                <ClipboardCheck
                                  className={`w-4 h-4 ${lesson.id === selectedLessonId ? "text-blue-600" : "text-slate-600"}`}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm mb-1 truncate">{lesson.title}</div>
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Clock className="w-3 h-3" />
                                {lesson.duration}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                ))}
              </div>

              <div className="p-6 border-t bg-slate-50">
                <Button className="w-full" onClick={goToNextLesson} disabled={!hasNextLesson}>
                  {hasNextLesson ? "Siguiente Lección" : "Completado"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {permissionOpen && (
        <CameraPermissionModal
          onAllow={(settings) => requestCamera(settings)}
          onDeny={() => {
            stopCamera();
            setPermissionOpen(false);
          }}
        />
      )}
    </main>
  );
}
