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
import { apiFetch, BACKEND_URL } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../ui/button";
import { CameraPermissionModal, PermissionSettings } from "../../CameraPermissionModal";
import { getConsentStatus, recordConsent, revokeCaptureConsent, type ConsentStatus } from "../../../lib/consent";
import { BoundedCaptureQueue } from "../../../lib/bounded-capture-queue.mjs";
import {
  BROWSER_EXTRACTOR_ENABLED,
  BOUNDED_CAPTURE_QUEUE_ENABLED,
  CAPTURE_DEADLINE_MS,
  ADAPTIVE_SCHEDULER_ENABLED,
  EDGE_FIXED_PROFILE,
  EDGE_PROFILES_ENABLED,
  DEVICE_BUDGET_TELEMETRY_ENABLED,
  NORMALIZED_FEATURES_V1_ENABLED,
  QUALITY_GATE_V1_ENABLED,
} from "../../../lib/capture-features";
import { BrowserFeatureExtractor } from "../../../lib/browser-feature-extractor.mjs";
import { buildNormalizedEvent } from "../../../lib/feature-normalization.mjs";
import type { AttentionEventV2 } from "../../../lib/event-contract.mjs";
import { evaluateFrame, evaluateWindow } from "../../../lib/quality-gate.mjs";
import { constraintsForProfile, EDGE_PROFILES, EdgeProfileController } from "../../../lib/edge-profiles.mjs";
import type { EdgeProfileName } from "../../../lib/edge-profiles.mjs";
import { DeviceBudgetCollector } from "../../../lib/device-budget-telemetry.mjs";
import { AdaptiveScheduler } from "../../../lib/adaptive-scheduler.mjs";
import { CONSERVATIVE_INTERVENTIONS_ENABLED } from "../../../lib/features";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
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

const isFinalExamLesson = (title: string) => (title || "").toLowerCase().includes("examen final");

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

type CameraOption = { deviceId: string; label: string };
type BatteryManagerLike = { level: number };
type InterventionSuggestion = {
  message: string;
  explanation: string;
};

const browserFamilyFromUserAgent = (userAgent: string) => {
  if (/firefox/i.test(userAgent)) return "firefox";
  if (/edg/i.test(userAgent)) return "edge";
  if (/chrome|chromium|crios/i.test(userAgent)) return "chromium";
  if (/safari/i.test(userAgent)) return "safari";
  return "unknown";
};

const readBatteryLevel = async () => {
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> }).getBattery;
  if (!getBattery) return null;
  try {
    const battery = await getBattery.call(navigator);
    return Number.isFinite(battery.level) ? battery.level : null;
  } catch {
    return null;
  }
};

const pageIsHidden = () => document.visibilityState === "hidden";

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const courseId = Number(params.courseId);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureQueueRef = useRef<BoundedCaptureQueue | null>(null);
  const cameraActiveRef = useRef(false);
  const cameraGenerationRef = useRef(0);
  const browserExtractorRef = useRef<BrowserFeatureExtractor | null>(null);
  const consentVersionRef = useRef<string | null>(null);
  const latestNormalizedEventRef = useRef<AttentionEventV2 | null>(null);
  const qualityWindowRef = useRef<Array<Awaited<ReturnType<BrowserFeatureExtractor["extract"]>>>>([]);
  const edgeProfileControllerRef = useRef<EdgeProfileController | null>(null);
  const deviceBudgetCollectorRef = useRef<DeviceBudgetCollector | null>(null);
  const adaptiveSchedulerRef = useRef<AdaptiveScheduler | null>(null);
  const batteryLevelRef = useRef<number | null>(null);
  const sessionRef = useRef<number | null>(null);
  const progressSyncRef = useRef<{ lessonId: number | null; completed: number }>({
    lessonId: null,
    completed: -1,
  });
  const initialLessonSetRef = useRef(false);
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
  const [lessonInitialized, setLessonInitialized] = useState(false);

  const [permissionOpen, setPermissionOpen] = useState(true);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [permissionSettings, setPermissionSettings] = useState<PermissionSettings>({
    enableCamera: false,
    enableAttentionTracking: false,
    saveAnalytics: false,
    shareWithInstructor: false,
    researchUse: false,
  });
  const [showCameraSettings, setShowCameraSettings] = useState(false);
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({});

  const [attentionScore] = useState(85);
  const [readingTime, setReadingTime] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [courseCompletedOpen, setCourseCompletedOpen] = useState(false);
  const [attentionStatus, setAttentionStatus] = useState<"ok" | "no_face" | "pending" | "error">("pending");
  const [mlServiceStatus, setMlServiceStatus] = useState<"checking" | "available" | "unavailable" | null>(null);
  const [captureTransportStatus, setCaptureTransportStatus] = useState<
    "idle" | "queued" | "sending" | "degraded" | "stopped"
  >("stopped");
  const [qualityMessage, setQualityMessage] = useState<string | null>(null);
  const [edgeProfile, setEdgeProfile] = useState<EdgeProfileName>("low");
  const [availableCameras, setAvailableCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [interventionSuggestion, setInterventionSuggestion] = useState<InterventionSuggestion | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
    
    // PR15 procesa en el navegador. No se consulta ni se usa el servicio de frames.
    setMlServiceStatus(BROWSER_EXTRACTOR_ENABLED ? "available" : null);
  }, [token, router]);

  useEffect(() => {
    if (!token) {
      setConsentStatus(null);
      return;
    }
    let active = true;
    getConsentStatus(token)
      .then((status) => {
        if (active) setConsentStatus(status);
      })
      .catch(() => {
        if (active) setConsentStatus(null);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const init = async () => {
      if (!token || !courseId || sessionRef.current) return;
      try {
        const me = await apiFetch<{ id: number }>("/api/me/", {}, token);
        const resolvedUserId = me.id || null;
        setUserId(resolvedUserId);
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
        const session = await apiFetch<any>(
          "/api/sessions/",
          {
            method: "POST",
            body: JSON.stringify({ course_id: courseId }),
          },
          token
        );
        if (session.id) {
          sessionRef.current = session.id;
          setSessionId(session.id);
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

  // Initialize selected lesson from enrollment data ONCE
  useEffect(() => {
    if (!enrollmentLoaded || lessonInitialized) return;
    if (!lessons.length) return;
    
    // Check sessionStorage first (fastest, most recent)
    let targetLessonId: number | null = null;
    if (typeof window !== "undefined") {
      const cacheKey = `course_${courseId}_lesson`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        targetLessonId = Number(cached);
      }
    }
    
    // Fall back to enrollment data if no cache
    if (!targetLessonId) {
      targetLessonId = Number(enrollmentData.last_lesson_id || 0);
    }
    
    // Verify the lesson exists, otherwise use first lesson
    const lessonExists = lessons.find((lesson) => lesson.id === targetLessonId);
    if (targetLessonId && lessonExists) {
      setSelectedLessonId(targetLessonId);
    } else {
      // Select first lesson if no previous lesson recorded or if lesson no longer exists
      const firstLesson = [...lessons].sort(
        (a, b) => (a.moduleOrder - b.moduleOrder) || (a.order - b.order)
      )[0];
      if (firstLesson) {
        setSelectedLessonId(firstLesson.id);
      }
    }
    
    setLessonInitialized(true);
  }, [enrollmentLoaded, lessons, lessonInitialized, courseId]);

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "No se pudo cargar el curso";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, courseId]);

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

  useEffect(() => {
    if (
      !CONSERVATIVE_INTERVENTIONS_ENABLED ||
      !token ||
      !sessionId ||
      !permissionSettings.enableCamera ||
      !permissionSettings.enableAttentionTracking ||
      !permissionSettings.saveAnalytics ||
      currentMaterial?.materialType === "test"
    ) {
      setInterventionSuggestion(null);
      return;
    }
    let cancelled = false;
    let inFlight = false;
    const evaluate = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const decision = await apiFetch<{
          state: "presented" | "suppressed";
          message?: string;
          explanation?: string;
        }>(
          "/api/interventions/evaluate/",
          { method: "POST", body: JSON.stringify({ session_id: sessionId }) },
          token,
        );
        if (!cancelled && decision.state === "presented" && decision.message && decision.explanation) {
          setInterventionSuggestion({ message: decision.message, explanation: decision.explanation });
        }
      } catch {
        // El panel sigue siendo utilizable; un fallo nunca genera una sugerencia local improvisada.
        if (!cancelled) setInterventionSuggestion(null);
      } finally {
        inFlight = false;
      }
    };
    void evaluate();
    const interval = window.setInterval(evaluate, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    token,
    sessionId,
    currentMaterial?.id,
    currentMaterial?.materialType,
    permissionSettings.enableCamera,
    permissionSettings.enableAttentionTracking,
    permissionSettings.saveAnalytics,
  ]);

  const stopCamera = () => {
    cameraGenerationRef.current += 1;
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
    captureQueueRef.current?.stop();
    captureQueueRef.current = null;
    browserExtractorRef.current?.close();
    browserExtractorRef.current = null;
    latestNormalizedEventRef.current = null;
    deviceBudgetCollectorRef.current = null;
    adaptiveSchedulerRef.current = null;
    batteryLevelRef.current = null;
    qualityWindowRef.current = [];
    setQualityMessage(null);
    setCaptureTransportStatus("stopped");
    setAttentionStatus("pending");
  };

  const startFrameTimer = (intervalMs: number) => {
    if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(() => {
      if (cameraActiveRef.current && videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
        processLocalFrame();
      }
    }, intervalMs);
  };

  const processLocalFrame = () => {
    if (!videoRef.current) return;
    const queue = captureQueueRef.current;
    if (!queue) return;

    const resourceSampleStartedAt = performance.now();
    queue.enqueue(async () => {
      const video = videoRef.current;
      if (!video) throw new Error("capture_stopped");
      browserExtractorRef.current ||= new BrowserFeatureExtractor();
      return browserExtractorRef.current.extract(video);
    }).then((outcome) => {
      if (ADAPTIVE_SCHEDULER_ENABLED || (DEVICE_BUDGET_TELEMETRY_ENABLED && permissionSettings.saveAnalytics)) {
        deviceBudgetCollectorRef.current ||= new DeviceBudgetCollector();
        deviceBudgetCollectorRef.current.record({
          at: performance.now(),
          latencyMs: outcome.status === "confirmed" ? performance.now() - resourceSampleStartedAt : -1,
        });
        const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
        const payload = deviceBudgetCollectorRef.current.take({
          sessionId: sessionId || 0,
          profile: edgeProfileControllerRef.current?.current || edgeProfile,
          profileGeneration: edgeProfileControllerRef.current?.generation || 0,
          deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
          effectiveType: connection?.effectiveType,
          online: navigator.onLine,
          energy: { level: batteryLevelRef.current },
        });
        if (payload && ADAPTIVE_SCHEDULER_ENABLED) {
          const qualitySamples = qualityWindowRef.current;
          const coverage = qualitySamples.length
            ? qualitySamples.filter((item) => item.quality?.observable === true).length / qualitySamples.length
            : null;
          const qualityConfidences = qualitySamples
            .map((item) => item.quality?.confidence)
            .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
          const uncertainty = qualityConfidences.length
            ? 1 - qualityConfidences.reduce((sum, value) => sum + value, 0) / qualityConfidences.length
            : null;
          adaptiveSchedulerRef.current ||= new AdaptiveScheduler({
            initialProfile: edgeProfileControllerRef.current?.current || "balanced",
          });
          const decision = adaptiveSchedulerRef.current.evaluate({
            latencyBucket: payload.latency_bucket,
            energyBucket: payload.energy_bucket,
            networkBucket: payload.network_bucket,
            cpuLoadBucket: payload.cpu_load_bucket,
            coverage,
            uncertainty,
            qualityAllowed: QUALITY_GATE_V1_ENABLED,
            consentGranted: Boolean(consentVersionRef.current && permissionSettings.enableAttentionTracking),
            privacyAllowed: true,
          });
          if (decision.enabled && decision.changed && decision.sampleIntervalMs) {
            const selection = edgeProfileControllerRef.current?.select(decision.profile, {
              source: "local",
              reason: `adaptive_${decision.reason}`,
            });
            if (selection?.changed) {
              qualityWindowRef.current = [];
              setEdgeProfile(selection.profile);
              startFrameTimer(decision.sampleIntervalMs);
              const videoConstraints = constraintsForProfile(selection.profile).video;
              const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0];
              if (track && typeof videoConstraints === "object") {
                void track.applyConstraints(videoConstraints).catch(() => {
                  stopCamera();
                  setAttentionStatus("error");
                });
              }
            }
          }
        }
        if (payload && token && DEVICE_BUDGET_TELEMETRY_ENABLED && permissionSettings.saveAnalytics) {
          void apiFetch("/api/device-budget-telemetry/", { method: "POST", body: JSON.stringify(payload) }, token)
            .catch(() => undefined);
        }
      }
      if (outcome.status === "confirmed") {
        let sample = outcome.value;
        if (QUALITY_GATE_V1_ENABLED) {
          const frameQuality = evaluateFrame(sample);
          sample = { ...sample, quality: { observable: frameQuality.observable, confidence: frameQuality.confidence, reason: frameQuality.reason } };
          const cutoff = Date.parse(sample.captured_at) - 5000;
          qualityWindowRef.current = [...qualityWindowRef.current, sample].filter((item) => Date.parse(item.captured_at) >= cutoff);
          const windowQuality = evaluateWindow(qualityWindowRef.current);
          sample = { ...sample, quality: { observable: windowQuality.observable, confidence: windowQuality.confidence, reason: windowQuality.reason } };
          setQualityMessage(windowQuality.message);
        }
        if (NORMALIZED_FEATURES_V1_ENABLED && QUALITY_GATE_V1_ENABLED && sessionId && consentVersionRef.current) {
          const event = buildNormalizedEvent(sample, {
            sessionId,
            consentVersion: consentVersionRef.current,
            purposes: ["local_processing", ...(permissionSettings.saveAnalytics ? ["derived_persistence"] : [])],
            browserFamily: browserFamilyFromUserAgent(navigator.userAgent),
            executionProfile: edgeProfileControllerRef.current?.current || edgeProfile,
            profileGeneration: edgeProfileControllerRef.current?.generation || 0,
          });
          latestNormalizedEventRef.current = event;
          setCaptureTransportStatus("sending");
          void apiFetch("/api/observations/", { method: "POST", body: JSON.stringify(event) }, token || undefined)
            .then(() => setCaptureTransportStatus("idle"))
            .catch(() => setCaptureTransportStatus("degraded"));
        }
        setAttentionStatus(sample.quality.observable ? "ok" : "no_face");
        if (!(NORMALIZED_FEATURES_V1_ENABLED && QUALITY_GATE_V1_ENABLED && sessionId && consentVersionRef.current)) {
          setCaptureTransportStatus("idle");
        }
      }
      if (outcome.status === "failed" || outcome.status === "timed_out") {
        setCaptureTransportStatus("degraded");
        setAttentionStatus("error");
      }
    });
  };

  const startCamera = async () => {
    if (cameraActiveRef.current) return;
    if (!videoRef.current) return;
    if (!BOUNDED_CAPTURE_QUEUE_ENABLED) {
      setCaptureTransportStatus("stopped");
      setAttentionStatus("error");
      return;
    }
    if (!BROWSER_EXTRACTOR_ENABLED) {
      setCaptureTransportStatus("stopped");
      setAttentionStatus("pending");
      return;
    }
    setAttentionStatus("pending");
    const generation = ++cameraGenerationRef.current;
    try {
      console.log("[startCamera] Iniciando cámara...");
      edgeProfileControllerRef.current ||= new EdgeProfileController({ remoteSelection: false });
      const batteryLevel = await readBatteryLevel();
      batteryLevelRef.current = batteryLevel;
      if (generation !== cameraGenerationRef.current || pageIsHidden()) return;
      const selection = EDGE_FIXED_PROFILE
        ? edgeProfileControllerRef.current.select(EDGE_FIXED_PROFILE, { source: "local", reason: "fixed_rollback_profile" })
        : EDGE_PROFILES_ENABLED
        ? edgeProfileControllerRef.current.selectForEnvironment({
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0,
            batteryLevel: batteryLevel ?? undefined,
            hidden: pageIsHidden(),
          })
        : edgeProfileControllerRef.current.select("low", { source: "local", reason: "safe_fallback" });
      if (selection.resetWindow) qualityWindowRef.current = [];
      setEdgeProfile(selection.profile);
      const profile = EDGE_PROFILES[selection.profile];
      const media = await navigator.mediaDevices.getUserMedia(constraintsForProfile(selection.profile, selectedCameraId || undefined));
      if (generation !== cameraGenerationRef.current || pageIsHidden()) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      media.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (generation === cameraGenerationRef.current) {
            stopCamera();
            setAttentionStatus("error");
          }
        }, { once: true });
      });
      videoRef.current.srcObject = media;
      
      // Esperar a que el video esté listo antes de empezar a capturar frames
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          videoRef.current?.removeEventListener("canplay", handleCanPlay);
          reject(new Error("Timeout esperando video"));
        }, 5000);
        const handleCanPlay = () => {
          clearTimeout(timeout);
          videoRef.current?.removeEventListener("canplay", handleCanPlay);
          resolve();
        };
        videoRef.current?.addEventListener("canplay", handleCanPlay);
      });
      
      await videoRef.current.play();
      if (generation !== cameraGenerationRef.current || pageIsHidden()) {
        media.getTracks().forEach((track) => track.stop());
        if (videoRef.current?.srcObject === media) videoRef.current.srcObject = null;
        return;
      }
      cameraActiveRef.current = true;
      captureQueueRef.current = new BoundedCaptureQueue({
        timeoutMs: CAPTURE_DEADLINE_MS,
        onState: (state) => setCaptureTransportStatus(state),
      });
      console.log("[startCamera] Cámara iniciada correctamente");
      
      startFrameTimer(profile.sampleIntervalMs);
    } catch (err) {
      console.error("[startCamera] Error al iniciar cámara:", err instanceof Error ? err.message : err);
      if (generation === cameraGenerationRef.current) {
        stopCamera();
        setAttentionStatus("error");
      }
    }
  };

  useEffect(() => {
    if (permissionSettings.enableCamera) {
      startCamera();
      return () => stopCamera();
    }
    stopCamera();
    return undefined;
  }, [permissionSettings.enableCamera, sessionId, userId, selectedCameraId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (EDGE_PROFILES_ENABLED) {
          edgeProfileControllerRef.current?.select("low", { source: "environment", reason: "background_tab" });
          setEdgeProfile("low");
          qualityWindowRef.current = [];
        }
        persistProgressNow();
        stopCamera();
      } else if (permissionSettings.enableCamera) {
        void startCamera();
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
  }, [permissionSettings.enableCamera, sessionId, userId, selectedCameraId]);

  const requestCamera = async (settings: PermissionSettings) => {
    if (!token) return;
    if (!settings.enableCamera) {
      stopCamera();
      setPermissionOpen(false);
      return;
    }
    try {
      const consent = await recordConsent(token, {
        local_processing: settings.enableCamera && settings.enableAttentionTracking,
        derived_persistence: settings.saveAnalytics,
        research: settings.researchUse,
      });
      if (!consent.capture_allowed) throw new Error("Consentimiento no vigente");
      consentVersionRef.current = consent.current_version;
      if (!BROWSER_EXTRACTOR_ENABLED) {
        setPermissionSettings({ ...settings, enableCamera: false, enableAttentionTracking: false });
        setCaptureTransportStatus("stopped");
        return;
      }
      console.log("[requestCamera] Verificando permisos de cámara...");
      const permissionStream = await navigator.mediaDevices.getUserMedia(constraintsForProfile(edgeProfile, selectedCameraId || undefined));
      permissionStream.getTracks().forEach((track) => track.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Cámara ${index + 1}` }));
      setAvailableCameras(cameras);
      if (!selectedCameraId && cameras[0]) setSelectedCameraId(cameras[0].deviceId);
      setPermissionSettings(settings);
      console.log("[requestCamera] Permisos de cámara otorgados");
    } catch (err) {
      console.error("[requestCamera] No se habilitó la cámara:", err instanceof Error ? err.message : err);
      stopCamera();
      setPermissionSettings((current) => ({ ...current, enableCamera: false }));
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
    
    // IMPORTANT: Save to sessionStorage as backup in case server sync fails
    if (typeof window !== "undefined") {
      const cacheKey = `course_${courseId}_lesson`;
      sessionStorage.setItem(cacheKey, String(selectedLessonId));
    }
    
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
            difficulty: currentMaterial.metadata.difficulty === "alta" ? "hard" : "normal",
            score,
            reason: currentMaterial.title || "Evaluación",
          }),
        },
        token
      );
      if (enrollmentId) {
        const finalExam = Boolean(selectedLesson && isFinalExamLesson(selectedLesson.title));
        const nextData: Record<string, any> = {
          ...enrollmentData,
          last_quiz_score: score,
          last_quiz_at: new Date().toISOString(),
        };
        if (finalExam) {
          nextData.progress_percent = 100;
          nextData.progress = 100;
          nextData.completed_at = new Date().toISOString();
        }
        setEnrollmentData(nextData);
        const payload: Record<string, unknown> = { enrollment_data: nextData };
        if (finalExam) {
          payload.status = "completed";
        }
        apiFetch(
          `/api/enrollments/${enrollmentId}/`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
          token
        ).catch((err) => console.error(err));
        if (finalExam) {
          setCourseCompletedOpen(true);
        }
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
      // Only sync if lesson or progress changed
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
      
      // Save to sessionStorage BEFORE updating state to prevent race conditions
      if (typeof window !== "undefined") {
        const cacheKey = `course_${courseId}_lesson`;
        sessionStorage.setItem(cacheKey, String(selectedLessonId));
      }
      
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
  }, [selectedLessonId, currentLessonIndex, token, enrollmentId, sortedLessons.length, courseId]);
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
                    {QUALITY_GATE_V1_ENABLED
                      ? (qualityMessage || "Comprobando si la señal es observable.")
                      : "El seguimiento está preparado, pero sus controles permanecen desactivados."}
                  </p>
                )}
                {EDGE_PROFILES_ENABLED && (
                  <p className="text-xs text-slate-600">Perfil Edge: {edgeProfile}</p>
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
            {permissionSettings.enableCamera && availableCameras.length > 0 && (
              <label className="block p-3 bg-slate-50 rounded-lg">
                <span className="block text-sm mb-2">Cámara seleccionada</span>
                <select
                  value={selectedCameraId}
                  onChange={(event) => setSelectedCameraId(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {availableCameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>{camera.label}</option>
                  ))}
                </select>
              </label>
            )}
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
                  <p className="text-xs text-slate-500" aria-live="polite">
                    Transporte de captura: {captureTransportStatus === "sending"
                      ? "enviando"
                      : captureTransportStatus === "queued"
                        ? "red lenta; se conserva solo la ventana más reciente"
                        : captureTransportStatus === "degraded"
                          ? "sin confirmación; no se actualizó la medición"
                          : captureTransportStatus === "idle"
                            ? "listo"
                            : "detenido"}
                  </p>
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

            {interventionSuggestion && (
              <section
                className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Sugerencia opcional</h2>
                    <p className="mt-1">{interventionSuggestion.message}</p>
                    <p className="mt-2 text-xs text-cyan-800">{interventionSuggestion.explanation}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-cyan-300 bg-white px-3 py-1 text-sm"
                    onClick={() => setInterventionSuggestion(null)}
                    aria-label="Ignorar sugerencia"
                  >
                    Ignorar
                  </button>
                </div>
              </section>
            )}

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
                    {permissionSettings.enableAttentionTracking && !QUALITY_GATE_V1_ENABLED && (
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

                  {permissionSettings.enableAttentionTracking && !QUALITY_GATE_V1_ENABLED && (
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

                  {permissionSettings.enableAttentionTracking && !QUALITY_GATE_V1_ENABLED && attentionScore < 65 && (
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

                {permissionSettings.enableAttentionTracking && QUALITY_GATE_V1_ENABLED && (
                  <div className="p-4 border-t bg-slate-50 text-sm text-slate-700" role="status">
                    <strong>{attentionStatus === "ok" ? "Señal observable" : "No observable"}.</strong>{" "}
                    {qualityMessage || "Se necesitan más muestras antes de interpretar esta ventana."}
                  </div>
                )}

                {permissionSettings.enableAttentionTracking && !QUALITY_GATE_V1_ENABLED && (
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

      {permissionOpen && (
        <CameraPermissionModal
          consentStatus={consentStatus}
          onAllow={(settings) => requestCamera(settings)}
          onDeny={async () => {
            stopCamera();
            if (token) await revokeCaptureConsent(token).catch(() => undefined);
            consentVersionRef.current = null;
            setPermissionSettings((current) => ({ ...current, enableCamera: false }));
            setPermissionOpen(false);
          }}
        />
      )}

      <Dialog open={courseCompletedOpen} onOpenChange={setCourseCompletedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Curso completado
            </DialogTitle>
            <DialogDescription>
              Has finalizado el examen final. Tu curso queda marcado como completado.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {courseTitle}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCourseCompletedOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => router.push("/student")}>Ir al panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
