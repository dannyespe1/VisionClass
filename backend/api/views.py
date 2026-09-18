from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import IntegrityError, models
from django.db.models import Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, permissions, mixins, status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.http import HttpResponse, HttpResponseRedirect
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
import random
import logging
import os
import json
import re
from urllib.parse import urlparse, parse_qs
import io
import csv
import uuid
import hashlib
import secrets
from datetime import timedelta
from google import genai
from google.genai import types
from django.db import connection
from .redis_client import redis_health

from .models import (
    Course,
    CourseModule,
    CourseLesson,
    CourseMaterial,
    Enrollment,
    Session,
    AttentionEvent,
    User,
    ContentView,
    QuizAttempt,
    SecurityAuditEvent,
    StudentReport,
    StudentNotification,
    ResearchAccessRequest,
    ResearchExportLease,
    PrivacyPolicySetting,
    ConsentEvent,
    TemporalSession,
    Observation,
    ObservationWindow,
    InferredState,
    LearningInteractionEvent,
    DeviceBudgetTelemetry,
)
from .group_dashboard import PERIOD_DAYS, build_teacher_group_dashboard
from .research_dashboard import (
    PERIOD_DAYS as RESEARCH_PERIOD_DAYS,
    build_pseudonymized_export_rows,
    build_research_dashboard,
)
from .conservative_interventions import evaluate_intervention, public_policy


class HealthLiveView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok", "correlation_id": request.headers.get("X-Correlation-ID", str(uuid.uuid4()))})


class HealthReadyView(APIView):
    permission_classes = []

    def get(self, request):
        checks = {"database": "ok"}
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            redis_result = redis_health()
            checks["redis"] = redis_result["status"]
            if redis_result["status"] == "error":
                return Response({"status": "not_ready", "checks": checks}, status=503)
            return Response({"status": "ready", "checks": checks})
        except Exception:
            logging.getLogger(__name__).exception("readiness_check_failed")
            checks["database"] = "error"
            return Response({"status": "not_ready", "checks": checks}, status=503)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    GoogleSocialLoginSerializer,
    CourseSerializer,
    CourseModuleSerializer,
    CourseLessonSerializer,
    CourseMaterialSerializer,
    EnrollmentSerializer,
    SessionSerializer,
    AttentionEventSerializer,
    ContentViewSerializer,
    QuizAttemptSerializer,
    StudentReportSerializer,
    StudentNotificationSerializer,
    EmailTokenObtainPairSerializer,
    AdminUserSerializer,
    AdminCourseSerializer,
    ResearchAccessRequestSerializer,
    PrivacyPolicySettingSerializer,
    ConsentEventSerializer,
)
from .utils import send_mailgun_email
from .permissions import IsAdminUserRole
from .consent import consent_status, has_capture_consent
from .event_contract import validate_attention_event_v2

UserModel = get_user_model()
logger = logging.getLogger(__name__)


class ReplayConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "El evento ya fue procesado."
    default_code = "event_replay"


def _audit_identity(request, action, outcome, reason_code, resource_type="", resource_id=""):
    if request.user and request.user.is_authenticated:
        SecurityAuditEvent.objects.create(
            actor=request.user,
            action=action,
            outcome=outcome,
            reason_code=reason_code,
            resource_type=resource_type,
            resource_id=str(resource_id or "")[:64],
        )


def _deny_identity(request, action, reason_code, resource_type="", resource_id=""):
    _audit_identity(request, action, "denied", reason_code, resource_type, resource_id)
    raise PermissionDenied("La identidad o sesión del evento no es válida.")


def _pop_claimed_user(serializer, field="user_id"):
    return serializer.validated_data.pop(field, None)


def _validate_course_session(request, session, action):
    user = request.user
    if not settings.STRICT_EVENT_IDENTITY:
        _deny_identity(request, action, "strict_identity_disabled", "session", session.id)
    if user.role != User.ROLE_STUDENT:
        _deny_identity(request, action, "role_not_student", "session", session.id)
    if session.student_id != user.id:
        _deny_identity(request, action, "session_owner_mismatch", "session", session.id)
    active_enrollment = Enrollment.objects.filter(
        user=user,
        course=session.course,
        status=Enrollment.STATUS_ACTIVE,
    ).exists()
    if not active_enrollment:
        _deny_identity(request, action, "inactive_enrollment", "session", session.id)
    now = timezone.now()
    max_age = timedelta(minutes=settings.EVENT_SESSION_MAX_AGE_MINUTES)
    if not session.started_at or session.started_at > now or session.started_at < now - max_age or session.ended_at:
        _deny_identity(request, action, "session_expired", "session", session.id)


def _validate_claimed_user(request, claimed_user_id, action, resource_type, resource_id):
    if claimed_user_id is not None and claimed_user_id != request.user.id:
        _deny_identity(request, action, "claimed_user_mismatch", resource_type, resource_id)


def _event_idempotency_key(request, model, session_field, session, action):
    key = request.headers.get("Idempotency-Key", "").strip()
    if not re.fullmatch(r"[A-Za-z0-9._:-]{16,64}", key):
        _deny_identity(request, action, "invalid_idempotency_key", session_field, session.id)
    if model.objects.filter(**{session_field: session, "idempotency_key": key}).exists():
        _audit_identity(request, action, "rejected", "event_replay", session_field, session.id)
        raise ReplayConflict()
    return key


class ObservationIngestView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    feature_fields = {
        "face_present", "face_count", "face_center_x", "face_center_y", "face_width", "face_height",
        "eye_span", "head_roll", "gaze_horizontal_proxy", "pose_available", "gaze_available",
        "window_offset_ms", "window_duration_ms", "profile_generation",
    }

    def post(self, request):
        if not settings.NORMALIZED_FEATURES_V1 or not settings.QUALITY_GATE_V1:
            return Response({"detail": "Ingesta de características desactivada."}, status=503)
        event = validate_attention_event_v2(request.data.copy())
        if event["session_type"] != "course":
            return Response({"detail": "Tipo de sesión no soportado."}, status=400)
        source = Session.objects.filter(pk=event["session_id"]).first()
        if not source:
            _audit_identity(request, "observation_ingest", "denied", "session_not_found", "session", event["session_id"])
            return Response({"detail": "Sesión no autorizada."}, status=403)
        _validate_course_session(request, source, "observation_ingest")
        if not has_capture_consent(request.user):
            _audit_identity(request, "observation_ingest", "denied", "consent_not_valid", "session", source.pk)
            return Response({"detail": "Consentimiento ausente, vencido o revocado."}, status=403)
        consent = event["consent"]
        required_purposes = {ConsentEvent.PURPOSE_LOCAL_PROCESSING, ConsentEvent.PURPOSE_DERIVED_PERSISTENCE}
        if consent["version"] != settings.CONSENT_CURRENT_VERSION or not required_purposes <= set(consent["purposes"]):
            return Response({"detail": "Sobre de consentimiento inconsistente."}, status=400)
        if set(event["features"]) != self.feature_fields:
            return Response({"detail": "Conjunto de características no soportado."}, status=400)
        device = event.get("device") or {}
        if device.get("preprocessing_version") != "normalized-features-v1" or device.get("execution_profile") not in {"low", "balanced", "high"}:
            return Response({"detail": "Versión o perfil de características no soportado."}, status=400)
        captured_at = parse_datetime(event["captured_at"])
        if not captured_at or captured_at > timezone.now() + timedelta(seconds=5):
            return Response({"detail": "Fecha de captura inválida."}, status=400)
        temporal, _ = TemporalSession.objects.get_or_create(
            course_session=source,
            defaults={
                "participant": request.user,
                "started_at": source.started_at or captured_at,
                "provenance": {"source": "normalized_features_v1"},
            },
        )
        existing = Observation.objects.filter(event_id=event["event_id"]).first()
        if existing:
            if existing.temporal_session_id != temporal.pk:
                return Response({"detail": "Identificador de evento en conflicto."}, status=409)
            return Response({"event_id": str(existing.event_id), "duplicate": True}, status=200)
        observation = Observation.objects.create(
            temporal_session=temporal,
            event_id=event["event_id"],
            kind="normalized_browser_features",
            captured_at=captured_at,
            received_at=max(timezone.now(), captured_at),
            values=event["features"],
            quality=event["quality"],
            provenance={
                "contract_version": event["contract_version"],
                "extractor_version": device.get("extractor_version"),
                "preprocessing_version": device["preprocessing_version"],
                "execution_profile": device["execution_profile"],
            },
        )
        return Response({"event_id": str(observation.event_id), "duplicate": False}, status=201)


class DeviceBudgetTelemetryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    allowed_fields = {
        "session_id", "profile", "profile_generation", "device_class", "fps_bucket",
        "latency_bucket", "memory_bucket", "network_bucket", "cpu_load_bucket",
        "energy_bucket", "sample_count", "invalid_sample_count",
    }
    choices = {
        "profile": {"low", "balanced", "high"},
        "device_class": {"constrained", "standard", "capable", "unknown"},
        "fps_bucket": {"under_5", "5_to_9", "10_to_14", "15_plus", "unknown"},
        "latency_bucket": {"under_50", "50_to_99", "100_to_249", "250_plus", "unknown"},
        "memory_bucket": {"up_to_2", "3_to_4", "5_to_8", "over_8", "unknown"},
        "network_bucket": {"offline", "slow", "standard", "fast", "unknown"},
        "cpu_load_bucket": {"normal", "busy", "saturated", "unknown"},
        "energy_bucket": {"charging", "low", "normal", "saver", "unknown"},
    }

    def post(self, request):
        if not settings.DEVICE_BUDGET_TELEMETRY:
            return Response({"detail": "Telemetría de dispositivo desactivada."}, status=503)
        supplied = set(request.data.keys())
        if supplied != self.allowed_fields:
            return Response({"detail": "Contrato de telemetría inválido."}, status=400)
        try:
            session_id = int(request.data["session_id"])
            generation = int(request.data["profile_generation"])
            sample_count = int(request.data["sample_count"])
            invalid_count = int(request.data["invalid_sample_count"])
        except (TypeError, ValueError):
            return Response({"detail": "Contadores de telemetría inválidos."}, status=400)
        if generation < 0 or not 1 <= sample_count <= 120 or not 0 <= invalid_count <= 120:
            return Response({"detail": "Contadores de telemetría fuera de rango."}, status=400)
        if any(request.data.get(field) not in allowed for field, allowed in self.choices.items()):
            return Response({"detail": "Categoría de telemetría no permitida."}, status=400)
        source = Session.objects.filter(pk=session_id).first()
        if not source:
            return Response({"detail": "Sesión no autorizada."}, status=403)
        _validate_course_session(request, source, "device_budget_telemetry")
        if not has_capture_consent(request.user):
            return Response({"detail": "Consentimiento ausente, vencido o revocado."}, status=403)
        cutoff = timezone.now() - timedelta(seconds=settings.DEVICE_BUDGET_TELEMETRY_MIN_INTERVAL_SECONDS)
        if DeviceBudgetTelemetry.objects.filter(course_session=source, created_at__gte=cutoff).exists():
            return Response({"detail": "Muestreo demasiado frecuente."}, status=429)
        sample = DeviceBudgetTelemetry.objects.create(
            course_session=source,
            profile=request.data["profile"],
            profile_generation=generation,
            device_class=request.data["device_class"],
            fps_bucket=request.data["fps_bucket"],
            latency_bucket=request.data["latency_bucket"],
            memory_bucket=request.data["memory_bucket"],
            network_bucket=request.data["network_bucket"],
            cpu_load_bucket=request.data["cpu_load_bucket"],
            energy_bucket=request.data["energy_bucket"],
            sample_count=sample_count,
            invalid_sample_count=invalid_count,
            expires_at=timezone.now() + timedelta(hours=settings.DEVICE_BUDGET_TELEMETRY_TTL_HOURS),
        )
        return Response({"accepted": True, "expires_at": sample.expires_at}, status=201)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    callback_url = getattr(settings, "GOOGLE_OAUTH_CALLBACK_URL", "http://localhost:3000/login")
    serializer_class = GoogleSocialLoginSerializer

    def post(self, request, *args, **kwargs):
        try:
            logger.info(f"🔄 GoogleLogin POST - data: {request.data.keys()}")
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data.get("user")
            if not user:
                logger.error("❌ No se pudo resolver el usuario desde OAuth")
                return Response({"detail": "No se pudo resolver el usuario."}, status=status.HTTP_400_BAD_REQUEST)
            logger.info(f"✅ Usuario OAuth autenticado: {user.email}")
            refresh = RefreshToken.for_user(user)
            return Response(
                {"access": str(refresh.access_token), "refresh": str(refresh)},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"❌ Error en GoogleLogin: {str(e)}", exc_info=True)
            return Response(
                {"detail": f"Error de autenticación: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )



def _safe_avg(values):
    if not values:
        return 0
    return sum(values) / len(values)


def _build_student_metrics(user):
    enrollments = Enrollment.objects.filter(user=user)
    sessions = Session.objects.filter(student=user)
    quiz_attempts = QuizAttempt.objects.filter(user=user)
    content_views = ContentView.objects.filter(user=user)
    attention_events = AttentionEvent.objects.filter(user=user)

    avg_grade = _safe_avg([a.score or 0 for a in quiz_attempts]) if quiz_attempts.exists() else 0
    courses_completed = enrollments.filter(status=Enrollment.STATUS_COMPLETED).count()
    total_courses = enrollments.count()

    last_week = timezone.now() - timedelta(days=7)
    study_week_seconds = content_views.filter(started_at__gte=last_week).aggregate(
        total=models.Sum("duration_seconds")
    )["total"] or 0
    study_total_seconds = content_views.aggregate(total=models.Sum("duration_seconds"))["total"] or 0

    academic_metrics = {
        "gpa": round((avg_grade / 25), 2) if avg_grade else 0,
        "courses_completed": courses_completed,
        "total_courses": total_courses,
        "study_hours_week": round(study_week_seconds / 3600, 1),
        "study_hours_total": round(study_total_seconds / 3600, 1),
        "average_grade": round(avg_grade, 1) if avg_grade else 0,
        "certificates_earned": courses_completed,
    }

    attention_by_date = {}
    for session in sessions:
        key = (session.created_at or timezone.now()).date().isoformat()
        attention_by_date.setdefault(key, []).append((session.mean_attention or 0) * 100)
    attention_trend = [
        {"label": date, "attention": round(_safe_avg(values), 1), "performance": round(_safe_avg(values), 1)}
        for date, values in sorted(attention_by_date.items())
    ][-6:]

    session_attention = {s.id: (s.mean_attention or 0) * 100 for s in sessions}
    duration_total = content_views.aggregate(total=models.Sum("duration_seconds"))["total"] or 0
    content_stats = {}
    for view in content_views:
        key = view.content_type
        content_stats.setdefault(key, {"attention": [], "duration": 0})
        if view.session_id in session_attention:
            content_stats[key]["attention"].append(session_attention[view.session_id])
        content_stats[key]["duration"] += view.duration_seconds or 0

    content_effectiveness = []
    for content_type, stats in content_stats.items():
        attention_avg = _safe_avg(stats["attention"]) if stats["attention"] else 0
        preference = round((stats["duration"] / duration_total) * 100, 1) if duration_total else 0
        retention = attention_avg
        if content_type == ContentView.TYPE_QUIZ:
            retention = avg_grade or attention_avg
        content_effectiveness.append({
            "type": content_type.upper(),
            "attention": round(attention_avg, 1),
            "retention": round(retention, 1),
            "preference": preference,
        })

    def _bucket(hour):
        if 6 <= hour < 9:
            return "6-9am"
        if 9 <= hour < 12:
            return "9-12pm"
        if 12 <= hour < 15:
            return "12-3pm"
        if 15 <= hour < 18:
            return "3-6pm"
        if 18 <= hour < 21:
            return "6-9pm"
        return "9-12am"

    productivity_map = {}
    for event in attention_events:
        bucket = _bucket(event.timestamp.hour)
        productivity_map.setdefault(bucket, []).append((event.value or 0) * 100)

    productivity_by_hour = []
    for label in ["6-9am", "9-12pm", "12-3pm", "3-6pm", "6-9pm", "9-12am"]:
        values = productivity_map.get(label, [])
        productivity_by_hour.append({
            "hour": label,
            "productivity": round(_safe_avg(values), 1) if values else 0,
            "sessions": len(values),
        })

    course_breakdown = []
    for enrollment in enrollments:
        course = enrollment.course
        if not course:
            continue
        data = enrollment.enrollment_data or {}
        course_sessions = sessions.filter(course=course)
        course_views = content_views.filter(session__course=course)
        course_quizzes = quiz_attempts.filter(session__course=course)
        avg_attention = data.get("attention_avg") or _safe_avg([(s.mean_attention or 0) * 100 for s in course_sessions])
        grade = data.get("last_quiz_score") or _safe_avg([a.score or 0 for a in course_quizzes])
        study_hours = (course_views.aggregate(total=models.Sum("duration_seconds"))["total"] or 0) / 3600
        last_activity = None
        if course_views.exists():
            last_activity = course_views.order_by("-started_at").first().started_at
        elif course_sessions.exists():
            last_activity = course_sessions.order_by("-created_at").first().created_at
        last_activity_label = last_activity.date().isoformat() if last_activity else "Reciente"
        strengths = []
        improvements = []
        if avg_attention >= 85:
            strengths.append("Atencion sostenida")
        if grade >= 90:
            strengths.append("Alto rendimiento")
        if not strengths:
            strengths.append("Consistencia")
        if avg_attention < 75:
            improvements.append("Mantener foco")
        if grade < 80:
            improvements.append("Refuerzo de contenidos")
        if not improvements:
            improvements.append("Seguimiento de tareas")

        course_breakdown.append({
            "id": course.id,
            "name": course.title,
            "progress": round(data.get("progress_percent") or 0, 1),
            "grade": round(grade, 1) if grade else 0,
            "attention_avg": round(avg_attention, 1) if avg_attention else 0,
            "study_hours": round(study_hours, 1),
            "strengths": strengths,
            "improvements": improvements,
            "last_activity": last_activity_label,
            "next_milestone": "Completado" if (data.get("progress_percent") or 0) >= 100 else "Continuar",
        })

    focused_mind = sessions.filter(mean_attention__gte=0.9).count()
    perfect_focus = sessions.filter(mean_attention__gte=0.95).count()

    daily_study = {}
    for view in content_views:
        key = view.started_at.date().isoformat()
        daily_study[key] = daily_study.get(key, 0) + (view.duration_seconds or 0)
    marathon_days = sum(1 for seconds in daily_study.values() if seconds >= 3 * 3600)

    active_days = set()
    for view in content_views:
        active_days.add(view.started_at.date().isoformat())
    for event in attention_events:
        active_days.add(event.timestamp.date().isoformat())

    monthly_attention = {}
    for session in sessions:
        key = (session.created_at or timezone.now()).strftime("%Y-%m")
        monthly_attention.setdefault(key, []).append(session.mean_attention or 0)
    master_focus = sum(1 for values in monthly_attention.values() if _safe_avg(values) >= 0.85)

    achievements = [
        {
            "id": 1,
            "title": "Mente Enfocada",
            "description": "Manten 90%+ de atencion durante 5 sesiones",
            "progress": focused_mind,
            "goal": 5,
            "unlocked": focused_mind >= 5,
            "icon": "brain",
            "color": "purple",
        },
        {
            "id": 2,
            "title": "Maratonista Mental",
            "description": "Estudia 3+ horas con alta concentracion",
            "progress": marathon_days,
            "goal": 3,
            "unlocked": marathon_days >= 3,
            "icon": "zap",
            "color": "yellow",
        },
        {
            "id": 3,
            "title": "Concentracion Perfecta",
            "description": "Alcanza 95%+ de atencion en una sesion",
            "progress": perfect_focus,
            "goal": 3,
            "unlocked": perfect_focus >= 3,
            "icon": "target",
            "color": "blue",
        },
        {
            "id": 4,
            "title": "Estudiante Consistente",
            "description": "Estudia todos los dias durante 2 semanas",
            "progress": len(active_days),
            "goal": 14,
            "unlocked": len(active_days) >= 14,
            "icon": "calendar",
            "color": "green",
        },
        {
            "id": 5,
            "title": "Maestro del Foco",
            "description": "Manten tendencia positiva por 3 meses",
            "progress": master_focus,
            "goal": 3,
            "unlocked": master_focus >= 3,
            "icon": "trophy",
            "color": "orange",
        },
    ]

    recommendations = []
    top_hour = max(productivity_by_hour, key=lambda x: x["productivity"], default=None)
    if top_hour and top_hour["productivity"] > 0:
        recommendations.append({
            "type": "peak-time",
            "title": "Aprovecha tu Pico de Estudio",
            "description": f"Tu mejor rendimiento aparece en {top_hour['hour']}. Programa temas exigentes en ese horario.",
            "action": "Ajustar horario",
            "priority": "high",
        })
    lowest_course = min(course_breakdown, key=lambda x: x["attention_avg"], default=None)
    if lowest_course and lowest_course["attention_avg"] > 0:
        recommendations.append({
            "type": "improvement",
            "title": "Refuerzo en cursos con baja atencion",
            "description": f"El curso {lowest_course['name']} tiene menor atencion promedio. Considera repasar contenidos clave.",
            "action": "Ver curso",
            "priority": "medium",
        })
    if not recommendations:
        recommendations.append({
            "type": "general",
            "title": "Mantener constancia",
            "description": "Sigue registrando sesiones para obtener recomendaciones mas precisas.",
            "action": "Continuar",
            "priority": "low",
        })

    return {
        "academic_metrics": academic_metrics,
        "attention_trend": attention_trend,
        "content_effectiveness": content_effectiveness,
        "productivity_by_hour": productivity_by_hour,
        "course_breakdown": course_breakdown,
        "achievements": achievements,
        "recommendations": recommendations,
    }


def _persist_student_report(user, metrics):
    report = StudentReport.objects.create(user=user, payload=metrics)
    return report


def _export_student_report(metrics, fmt):
    if fmt == "xlsx":
        try:
            from openpyxl import Workbook
        except Exception:
            return Response({"detail": "openpyxl no esta instalado"}, status=500)
        wb = Workbook()
        ws = wb.active
        ws.title = "Resumen"
        ws.append(["Reporte VisionClass"])
        ws.append([])
        ws.append(["Promedio GPA", metrics["academic_metrics"]["gpa"]])
        ws.append(["Cursos completados", metrics["academic_metrics"]["courses_completed"]])
        ws.append(["Cursos totales", metrics["academic_metrics"]["total_courses"]])
        ws.append(["Promedio calificaciones", metrics["academic_metrics"]["average_grade"]])
        ws.append(["Horas estudio semana", metrics["academic_metrics"]["study_hours_week"]])
        ws.append(["Horas estudio total", metrics["academic_metrics"]["study_hours_total"]])

        ws.append([])
        ws.append(["Cursos"])
        ws.append(["Curso", "Progreso", "Atencion", "Calificacion", "Horas"])
        for course in metrics["course_breakdown"]:
            ws.append([
                course["name"],
                course["progress"],
                course["attention_avg"],
                course["grade"],
                course["study_hours"],
            ])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        response = HttpResponse(
            output.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="reporte_estudiante.xlsx"'
        return response

    if fmt == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["curso", "progreso", "atencion", "calificacion", "horas"])
        for course in metrics["course_breakdown"]:
            writer.writerow([
                course["name"],
                course["progress"],
                course["attention_avg"],
                course["grade"],
                course["study_hours"],
            ])
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="reporte_estudiante.csv"'
        return response

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
    except Exception:
        return Response({"detail": "reportlab no esta instalado"}, status=500)

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 40
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Reporte de estudiante - VisionClass")
    y -= 24
    pdf.setFont("Helvetica", 10)

    for label, value in [
        ("Promedio GPA", metrics["academic_metrics"]["gpa"]),
        ("Cursos completados", metrics["academic_metrics"]["courses_completed"]),
        ("Cursos totales", metrics["academic_metrics"]["total_courses"]),
        ("Promedio calificaciones", metrics["academic_metrics"]["average_grade"]),
        ("Horas estudio semana", metrics["academic_metrics"]["study_hours_week"]),
        ("Horas estudio total", metrics["academic_metrics"]["study_hours_total"]),
    ]:
        pdf.drawString(40, y, f"{label}: {value}")
        y -= 16

    y -= 8
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "Cursos")
    y -= 18
    pdf.setFont("Helvetica", 9)
    for course in metrics["course_breakdown"]:
        pdf.drawString(
            40,
            y,
            f"{course['name']} | Prog: {course['progress']}% | At: {course['attention_avg']}% | Cal: {course['grade']}%",
        )
        y -= 14
        if y < 80:
            pdf.showPage()
            y = height - 60
            pdf.setFont("Helvetica", 9)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="reporte_estudiante.pdf"'
    return response


class AllowRegistration(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.method == 'POST'


class UserViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = UserModel.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'create':
            return RegisterSerializer
        return UserSerializer


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Course.objects.all()
        if self.request.user.role == User.ROLE_ADMIN:
            return queryset
        return queryset.filter(is_active=True)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            raise PermissionDenied("Solo docentes o administradores pueden crear cursos.")
        serializer.save(owner=user)


class CourseModuleViewSet(viewsets.ModelViewSet):
    serializer_class = CourseModuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return CourseModule.objects.all()
        if user.role == User.ROLE_TEACHER:
            return CourseModule.objects.filter(course__owner=user, course__is_active=True)
        return CourseModule.objects.filter(course__enrollments__user=user, course__is_active=True).distinct()

    def perform_create(self, serializer):
        if self.request.user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            raise PermissionDenied("Solo docentes o administradores pueden crear modulos.")
        serializer.save()


class CourseLessonViewSet(viewsets.ModelViewSet):
    serializer_class = CourseLessonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return CourseLesson.objects.all()
        if user.role == User.ROLE_TEACHER:
            return CourseLesson.objects.filter(module__course__owner=user, module__course__is_active=True)
        return CourseLesson.objects.filter(module__course__enrollments__user=user, module__course__is_active=True).distinct()

    def perform_create(self, serializer):
        if self.request.user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            raise PermissionDenied("Solo docentes o administradores pueden crear lecciones.")
        serializer.save()


class CourseMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = CourseMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return CourseMaterial.objects.all()
        if user.role == User.ROLE_TEACHER:
            return CourseMaterial.objects.filter(lesson__module__course__owner=user, lesson__module__course__is_active=True)
        return CourseMaterial.objects.filter(
            lesson__module__course__enrollments__user=user,
            lesson__module__course__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        if self.request.user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            raise PermissionDenied("Solo docentes o administradores pueden crear materiales.")
        serializer.save()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        material = self.get_object()
        if material.file_bytes:
            content_type = material.file_content_type or "application/octet-stream"
            filename = material.file_name or f"material_{material.id}.bin"
            response = HttpResponse(material.file_bytes, content_type=content_type)
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        if material.url:
            return HttpResponseRedirect(material.url)
        return Response({"detail": "No hay archivo disponible"}, status=404)


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.ROLE_ADMIN:
            return Enrollment.objects.all()
        if self.request.user.role == User.ROLE_TEACHER:
            return Enrollment.objects.filter(course__owner=self.request.user)
        return Enrollment.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        course = serializer.validated_data.get("course")
        enrollment_data = serializer.validated_data.get("enrollment_data", {})

        enrollment, created = Enrollment.objects.get_or_create(
            user=user,
            course=course,
            defaults={"enrollment_data": enrollment_data},
        )

        if not created and enrollment_data:
            merged = {**(enrollment.enrollment_data or {}), **enrollment_data}
            enrollment.enrollment_data = merged
            enrollment.save(update_fields=["enrollment_data"])

        serializer.instance = enrollment

        if user and user.email:
            subject = "Inscripción confirmada"
            course_title = course.title if course else "tu curso"
            message = (
                "Tu inscripción se ha registrado correctamente.\n\n"
                f"Curso: {course_title}\n"
                "Ya puedes acceder a los contenidos desde la plataforma."
            )
            try:
                send_mailgun_email(user.email, subject, message)
            except Exception as exc:
                logger.warning("No se pudo enviar mailgun de inscripción a %s: %s", user.email, exc)


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return Session.objects.all()
        if user.role == User.ROLE_TEACHER:
            return Session.objects.none()
        return Session.objects.filter(student=user)

    def perform_create(self, serializer):
        user = self.request.user
        claimed_student_id = serializer.validated_data.pop('student_id', None)
        course = serializer.validated_data.get('course')
        if not settings.STRICT_EVENT_IDENTITY:
            _deny_identity(self.request, "session_create", "strict_identity_disabled", "course", getattr(course, "id", ""))
        if user.role != User.ROLE_STUDENT:
            _deny_identity(self.request, "session_create", "role_not_student", "course", getattr(course, "id", ""))
        _validate_claimed_user(self.request, claimed_student_id, "session_create", "course", getattr(course, "id", ""))
        if not course or not course.is_active or not Enrollment.objects.filter(
            user=user, course=course, status=Enrollment.STATUS_ACTIVE
        ).exists():
            _deny_identity(self.request, "session_create", "inactive_enrollment", "course", getattr(course, "id", ""))
        serializer.save(created_by=user, student=user, started_at=timezone.now())


class AttentionEventViewSet(viewsets.ModelViewSet):
    serializer_class = AttentionEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return AttentionEvent.objects.all()
        if user.role == User.ROLE_TEACHER:
            return AttentionEvent.objects.none()
        return AttentionEvent.objects.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        claimed_user_id = _pop_claimed_user(serializer)
        session = serializer.validated_data.get('session')
        _validate_claimed_user(self.request, claimed_user_id, "attention_event_create", "session", session.id)
        _validate_course_session(self.request, session, "attention_event_create")
        if not has_capture_consent(user):
            _deny_identity(self.request, "attention_event_create", "consent_not_valid", "session", session.id)
        idempotency_key = _event_idempotency_key(
            self.request, AttentionEvent, "session", session, "attention_event_create"
        )
        try:
            event = serializer.save(user=user, idempotency_key=idempotency_key)
        except IntegrityError:
            _audit_identity(self.request, "attention_event_create", "rejected", "event_replay", "session", session.id)
            raise ReplayConflict()

        # Actualizar métricas agregadas de la sesión
        if session:
            frames = session.frame_count or 0
            new_count = frames + 1
            new_mean = ((session.mean_attention or 0) * frames + event.value) / new_count
            low_prev = (session.low_attention_ratio or 0) * frames
            is_low = 1 if event.value < 0.4 else 0
            new_low_ratio = (low_prev + is_low) / new_count

            session.frame_count = new_count
            session.mean_attention = new_mean
            session.low_attention_ratio = new_low_ratio
            session.last_score = event.value
            session.attention_score = event.value
            session.save(update_fields=[
                'frame_count', 'mean_attention', 'low_attention_ratio', 'last_score', 'attention_score'
            ])


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        data = request.data.copy()
        current_password = data.pop("current_password", None)
        new_password = data.pop("new_password", None)
        requested_email = data.get("email")

        needs_auth = False
        if requested_email and requested_email != request.user.email:
            needs_auth = True
        if new_password:
            needs_auth = True

        if needs_auth:
            if not current_password or not request.user.check_password(current_password):
                return Response(
                    {"detail": "Contraseña actual requerida para cambiar correo o contraseña."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if requested_email and requested_email != request.user.email:
            if UserModel.objects.exclude(pk=request.user.pk).filter(username=requested_email).exists():
                return Response(
                    {"detail": "Este correo ya esta en uso."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            data["username"] = requested_email

        serializer = UserSerializer(request.user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if new_password:
            user.set_password(new_password)
            user.save(update_fields=["password"])
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class ContentViewSet(viewsets.ModelViewSet):
    serializer_class = ContentViewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return ContentView.objects.all()
        if user.role == User.ROLE_TEACHER:
            return ContentView.objects.filter(session__course__owner=user)
        return ContentView.objects.filter(user=user)

    def perform_create(self, serializer):
        claimed_user_id = _pop_claimed_user(serializer)
        session = serializer.validated_data.get('session')
        _validate_claimed_user(self.request, claimed_user_id, "content_view_create", "session", session.id)
        _validate_course_session(self.request, session, "content_view_create")
        serializer.save(user=self.request.user)


class QuizAttemptViewSet(viewsets.ModelViewSet):
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return QuizAttempt.objects.all()
        if user.role == User.ROLE_TEACHER:
            return QuizAttempt.objects.filter(session__course__owner=user)
        return QuizAttempt.objects.filter(user=user)

    def perform_create(self, serializer):
        claimed_user_id = _pop_claimed_user(serializer)
        session = serializer.validated_data.get('session')
        _validate_claimed_user(self.request, claimed_user_id, "quiz_attempt_create", "session", session.id)
        _validate_course_session(self.request, session, "quiz_attempt_create")
        serializer.save(user=self.request.user)


class StudentReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return StudentReport.objects.all()
        return StudentReport.objects.filter(user=user)


class StudentNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return StudentNotification.objects.all()
        if user.role == User.ROLE_TEACHER:
            return StudentNotification.objects.filter(
                recipient__enrollments__course__owner=user
            ).distinct()
        return StudentNotification.objects.filter(recipient=user)


class StudentMetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        fmt = request.query_params.get("export", "").lower()
        metrics = _build_student_metrics(request.user)
        report = _persist_student_report(request.user, metrics)
        if fmt in ["pdf", "xlsx", "csv"]:
            return _export_student_report(report.payload, fmt)
        return Response(metrics, status=status.HTTP_200_OK)


class StudentEvidenceDashboardView(APIView):
    """Return a minimized, self-only view of observable session evidence."""

    permission_classes = [permissions.IsAuthenticated]
    session_limit = 12

    def get(self, request):
        if not settings.STUDENT_ATTENTION_DASHBOARD:
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != User.ROLE_STUDENT:
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        inferred_states = InferredState.objects.order_by("inferred_at", "id")
        temporal_sessions = list(
            TemporalSession.objects.filter(participant=request.user)
            .order_by("-started_at")
            .prefetch_related(
                models.Prefetch(
                    "windows",
                    queryset=ObservationWindow.objects.order_by("started_at", "id").prefetch_related(
                        models.Prefetch("inferred_states", queryset=inferred_states)
                    ),
                )
            )[: self.session_limit]
        )
        temporal_sessions.reverse()

        sessions = []
        has_partial_data = False
        for position, temporal_session in enumerate(temporal_sessions, start=1):
            windows = list(temporal_session.windows.all())
            counts = {
                InferredState.STATE_TASK_ORIENTED_EVIDENCE: 0,
                InferredState.STATE_OFF_TASK_EVIDENCE: 0,
                InferredState.STATE_NO_OBSERVABLE: 0,
                InferredState.STATE_UNKNOWN: 0,
            }
            uncertainties = []

            for window in windows:
                states = list(window.inferred_states.all())
                latest = states[-1] if states else None
                state_value = latest.state if latest else InferredState.STATE_UNKNOWN
                if state_value not in counts:
                    # Legacy labels are intentionally not re-exposed as evidence.
                    state_value = InferredState.STATE_UNKNOWN
                counts[state_value] += 1
                if (
                    latest
                    and state_value
                    in {
                        InferredState.STATE_TASK_ORIENTED_EVIDENCE,
                        InferredState.STATE_OFF_TASK_EVIDENCE,
                    }
                    and latest.uncertainty is not None
                ):
                    uncertainties.append(latest.uncertainty)

            total_windows = len(windows)
            observable_windows = (
                counts[InferredState.STATE_TASK_ORIENTED_EVIDENCE]
                + counts[InferredState.STATE_OFF_TASK_EVIDENCE]
            )
            partial = total_windows == 0 or counts[InferredState.STATE_UNKNOWN] > 0
            has_partial_data = has_partial_data or partial
            sessions.append(
                {
                    "label": f"Sesión {position}",
                    "started_at": temporal_session.started_at.isoformat(),
                    "completed": temporal_session.ended_at is not None,
                    "total_windows": total_windows,
                    "observable_windows": observable_windows,
                    "no_observable_windows": counts[InferredState.STATE_NO_OBSERVABLE],
                    "unknown_windows": counts[InferredState.STATE_UNKNOWN],
                    "task_oriented_evidence_windows": counts[
                        InferredState.STATE_TASK_ORIENTED_EVIDENCE
                    ],
                    "off_task_evidence_windows": counts[InferredState.STATE_OFF_TASK_EVIDENCE],
                    "coverage": round(observable_windows / total_windows, 4) if total_windows else None,
                    "task_oriented_evidence_ratio": (
                        round(counts[InferredState.STATE_TASK_ORIENTED_EVIDENCE] / observable_windows, 4)
                        if observable_windows
                        else None
                    ),
                    "mean_uncertainty": (
                        round(sum(uncertainties) / len(uncertainties), 4) if uncertainties else None
                    ),
                    "partial": partial,
                }
            )

        privacy = consent_status(request.user)
        dashboard_state = "empty" if not sessions else ("partial" if has_partial_data else "ready")
        return Response(
            {
                "schema_version": "student-evidence-dashboard-v1",
                "state": dashboard_state,
                "sessions": sessions,
                "definitions": {
                    "observation": "Señales técnicas derivadas y autorizadas; no incluyen imágenes ni video.",
                    "inference": "Clasificación técnica con incertidumbre; no mide pensamientos ni diagnostica.",
                    "no_observable": "La señal disponible no fue suficiente para interpretar esa ventana.",
                    "self_report": "Lo que declaras sobre tu experiencia; se mantiene separado de la inferencia.",
                },
                "limitations": [
                    "Los resultados describen evidencia de ventanas observables, no una capacidad personal.",
                    "No deben usarse para rankings, diagnósticos ni decisiones automáticas.",
                    "Una cobertura baja o datos parciales impiden interpretar una tendencia.",
                ],
                "privacy": {
                    "capture_allowed": privacy["capture_allowed"],
                    "consent_enabled": privacy["enabled"],
                    "consent_text_approved": privacy["text_approved"],
                    "current_version": privacy["current_version"],
                    "images_stored": False,
                    "teacher_access": False,
                },
            },
            status=status.HTTP_200_OK,
        )


class ConservativeInterventionView(APIView):
    """Evaluate a self-only, server-side rule without changing ML eligibility."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.CONSERVATIVE_INTERVENTIONS:
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        try:
            session_id = int(request.data.get("session_id"))
            if session_id <= 0:
                raise ValueError
        except (TypeError, ValueError):
            _audit_identity(request, "intervention_evaluate", "denied", "invalid_session")
            return Response({"detail": "Sesión no válida."}, status=status.HTTP_400_BAD_REQUEST)
        source = Session.objects.filter(pk=session_id).first()
        if source is None:
            _audit_identity(request, "intervention_evaluate", "denied", "session_not_found")
            return Response({"detail": "Sesión no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        _validate_course_session(request, source, "intervention_evaluate")
        decision = evaluate_intervention(request.user, source)
        _audit_identity(
            request,
            "intervention_evaluate",
            "allowed" if decision.status == "presented" else "suppressed",
            decision.reason_code,
            "session",
            source.id,
        )
        payload = {
            "schema_version": "conservative-intervention-v1",
            "state": decision.status,
            "reason_code": decision.reason_code,
            "policy": public_policy(),
        }
        if decision.status == "presented":
            payload.update(
                {
                    "message": decision.message,
                    "explanation": decision.explanation,
                    "optional": True,
                    "teacher_notified": False,
                    "academic_decision": False,
                }
            )
        return Response(payload, status=status.HTTP_200_OK)


class TeacherGroupDashboardView(APIView):
    """Publish only privacy-protected activity aggregates for course owners."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not settings.TEACHER_GROUP_DASHBOARD:
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != User.ROLE_TEACHER:
            return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        period = request.query_params.get("period", "90d")
        if period not in PERIOD_DAYS:
            return Response({"detail": "Filtro no válido."}, status=status.HTTP_400_BAD_REQUEST)

        owned_courses = Course.objects.filter(owner=request.user, is_active=True)
        course_id = request.query_params.get("course_id")
        if course_id is not None:
            try:
                course_id = int(course_id)
                if course_id <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response({"detail": "Filtro no válido."}, status=status.HTTP_400_BAD_REQUEST)
            if not owned_courses.filter(pk=course_id).exists():
                return Response({"detail": "Curso no encontrado."}, status=status.HTTP_404_NOT_FOUND)
            selected_courses = owned_courses.filter(pk=course_id)
        else:
            selected_courses = owned_courses

        inferred_states = InferredState.objects.order_by("inferred_at", "id")
        events = list(
            LearningInteractionEvent.objects.filter(
                temporal_session__course_session__course__in=selected_courses,
                window__isnull=False,
            )
            .select_related(
                "temporal_session__participant",
                "temporal_session__course_session__course",
                "window",
            )
            .prefetch_related(models.Prefetch("window__inferred_states", queryset=inferred_states))
            .order_by("occurred_at", "id")
        )

        activities = build_teacher_group_dashboard(
            events,
            period=period,
            minimum_participants=settings.TEACHER_GROUP_DASHBOARD_MIN_PARTICIPANTS,
            minimum_observable_windows=settings.TEACHER_GROUP_DASHBOARD_MIN_OBSERVABLE_WINDOWS,
        )
        return Response(
            {
                "schema_version": "teacher-group-dashboard-v1",
                "state": "empty" if not activities else "ready",
                "filters": {"period": period, "course_id": course_id},
                "courses": list(owned_courses.order_by("title", "id").values("id", "title")),
                "activities": activities,
                "privacy": {
                    "minimum_participants": settings.TEACHER_GROUP_DASHBOARD_MIN_PARTICIPANTS,
                    "minimum_observable_windows": settings.TEACHER_GROUP_DASHBOARD_MIN_OBSERVABLE_WINDOWS,
                    "individual_states_available": False,
                    "exact_small_group_counts_available": False,
                    "complementary_period_suppression": True,
                },
                "definitions": {
                    "coverage": "Proporción de ventanas con evidencia observable suficiente.",
                    "uncertainty": "Incertidumbre técnica media; no describe certeza sobre una persona.",
                    "interval": "Intervalo descriptivo aproximado sobre promedios por participante.",
                    "distribution": "Orientación se balancea por participante; no observable y desconocida usan ventanas.",
                },
                "limitations": [
                    "Los agregados describen señales observables de una actividad, no estados mentales.",
                    "No deben usarse para rankings, vigilancia individual ni decisiones automáticas.",
                    "Una actividad suprimida no significa ausencia de dificultades ni de diferencias.",
                    "Los intervalos son descriptivos y no establecen causalidad ni validez del constructo.",
                ],
            },
            status=status.HTTP_200_OK,
        )


def _active_research_grant(request):
    if request.user.role != User.ROLE_RESEARCHER:
        _audit_identity(request, "research_dashboard_access", "denied", "researcher_role_required")
        raise PermissionDenied("No autorizado.")
    grants = ResearchAccessRequest.objects.filter(
        principal=request.user,
        status=ResearchAccessRequest.STATUS_APPROVED,
        ethics_approval=True,
        expires_at__gt=timezone.now(),
    ).exclude(purpose="")
    grant_id = request.data.get("grant_id") if request.method == "POST" else request.query_params.get("grant_id")
    if grant_id is not None:
        try:
            grant_id = int(grant_id)
        except (TypeError, ValueError):
            _audit_identity(request, "research_dashboard_access", "denied", "invalid_grant")
            raise PermissionDenied("No autorizado.")
        grants = grants.filter(pk=grant_id)
    grant = grants.order_by("-requested_at", "-id").first()
    if grant is None:
        _audit_identity(request, "research_dashboard_access", "denied", "active_grant_required")
        raise PermissionDenied("No autorizado.")
    return grant


def _research_filters(payload, grant, *, export=False):
    period = payload.get("period", "90d")
    cohort = payload.get("cohort") or None
    model_value = payload.get("model") or None
    profile = payload.get("profile") or None
    if period not in RESEARCH_PERIOD_DAYS:
        raise ValueError("invalid_period")
    if cohort and cohort not in grant.cohort_scope:
        raise ValueError("invalid_cohort")
    if model_value and model_value not in grant.model_scope:
        raise ValueError("invalid_model")
    if model_value and model_value.count(":") != 1:
        raise ValueError("invalid_model_format")
    if profile and profile not in grant.profile_scope:
        raise ValueError("invalid_profile")
    if export and not all((cohort, model_value, profile)):
        raise ValueError("export_requires_exact_scope")
    return {"period": period, "cohort": cohort, "model": model_value, "profile": profile}


class ResearchDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not settings.RESEARCH_DASHBOARD:
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        grant = _active_research_grant(request)
        try:
            filters = _research_filters(request.query_params, grant)
        except ValueError:
            _audit_identity(
                request, "research_dashboard_access", "denied", "filter_outside_grant", "research_grant", grant.id
            )
            return Response({"detail": "Filtro no autorizado."}, status=status.HTTP_400_BAD_REQUEST)

        cells, _ = build_research_dashboard(
            grant,
            filters,
            settings.RESEARCH_DASHBOARD_MIN_PARTICIPANTS,
            settings.RESEARCH_DASHBOARD_MIN_OBSERVABLE_WINDOWS,
        )
        _audit_identity(
            request, "research_dashboard_access", "allowed", "active_scoped_grant", "research_grant", grant.id
        )
        return Response(
            {
                "schema_version": "research-dashboard-v1",
                "state": "empty" if not cells else "ready",
                "grant": {
                    "id": grant.id,
                    "project": grant.project,
                    "purpose": grant.purpose,
                    "expires_at": grant.expires_at,
                },
                "filters": filters,
                "filter_options": {
                    "cohorts": grant.cohort_scope,
                    "models": grant.model_scope,
                    "profiles": grant.profile_scope,
                    "periods": list(RESEARCH_PERIOD_DAYS),
                },
                "privacy": {
                    "minimum_participants": settings.RESEARCH_DASHBOARD_MIN_PARTICIPANTS,
                    "minimum_observable_windows": settings.RESEARCH_DASHBOARD_MIN_OBSERVABLE_WINDOWS,
                    "demographic_vault_joined": False,
                    "operational_identifiers_available": False,
                },
                "cells": cells,
                "limitations": [
                    "Las celdas describen evidencia observable y no miden estados mentales.",
                    "Validez y equidad sólo se muestran si existe una referencia registrada; no se infieren del panel.",
                    "Una celda suprimida representa evidencia insuficiente, no ausencia de diferencias.",
                    "Los recursos son telemetría gruesa vigente y no identifican dispositivos.",
                ],
            },
            status=status.HTTP_200_OK,
        )


class ResearchExportCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.RESEARCH_DASHBOARD:
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        grant = _active_research_grant(request)
        purpose = str(request.data.get("purpose", "")).strip()
        if purpose != grant.purpose:
            _audit_identity(
                request, "research_export_create", "denied", "purpose_outside_grant", "research_grant", grant.id
            )
            return Response({"detail": "Propósito no autorizado."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            filters = _research_filters(request.data, grant, export=True)
            expires_in_minutes = int(request.data.get("expires_in_minutes", settings.RESEARCH_EXPORT_MAX_MINUTES))
        except (TypeError, ValueError):
            _audit_identity(
                request, "research_export_create", "denied", "invalid_export_scope", "research_grant", grant.id
            )
            return Response({"detail": "Alcance de exportación no válido."}, status=status.HTTP_400_BAD_REQUEST)
        if not 5 <= expires_in_minutes <= settings.RESEARCH_EXPORT_MAX_MINUTES:
            _audit_identity(
                request, "research_export_create", "denied", "invalid_export_expiry", "research_grant", grant.id
            )
            return Response({"detail": "Caducidad no válida."}, status=status.HTTP_400_BAD_REQUEST)

        rows, reason = build_pseudonymized_export_rows(
            grant,
            filters,
            settings.RESEARCH_DASHBOARD_MIN_PARTICIPANTS,
            settings.RESEARCH_DASHBOARD_MIN_OBSERVABLE_WINDOWS,
        )
        if not rows:
            _audit_identity(
                request, "research_export_create", "denied", reason or "protected_sample_unavailable", "research_grant", grant.id
            )
            return Response({"detail": "La muestra protegida no es exportable."}, status=status.HTTP_409_CONFLICT)

        token = secrets.token_urlsafe(32)
        expires_at = min(
            timezone.now() + timedelta(minutes=expires_in_minutes),
            grant.expires_at,
        )
        lease = ResearchExportLease.objects.create(
            grant=grant,
            requested_by=request.user,
            token_digest=hashlib.sha256(token.encode("utf-8")).hexdigest(),
            purpose=purpose,
            filters=filters,
            row_count=len(rows),
            expires_at=expires_at,
        )
        _audit_identity(
            request, "research_export_create", "allowed", "protected_export_lease", "research_export", lease.export_id
        )
        return Response(
            {
                "export_id": lease.export_id,
                "download_token": token,
                "expires_at": lease.expires_at,
                "one_time_download": True,
            },
            status=status.HTTP_201_CREATED,
        )


def _csv_safe(value):
    text_value = str(value)
    return f"'{text_value}" if text_value.startswith(("=", "+", "-", "@")) else text_value


class ResearchExportDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.RESEARCH_DASHBOARD:
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != User.ROLE_RESEARCHER:
            _audit_identity(request, "research_export_download", "denied", "researcher_role_required")
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        token = str(request.data.get("download_token", ""))
        if len(token) < 32:
            _audit_identity(request, "research_export_download", "denied", "invalid_token")
            return Response({"detail": "Enlace no válido."}, status=status.HTTP_404_NOT_FOUND)
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        lease = ResearchExportLease.objects.filter(
            requested_by=request.user,
            token_digest=digest,
        ).select_related("grant").first()
        if lease is None:
            _audit_identity(request, "research_export_download", "denied", "invalid_token")
            return Response({"detail": "Enlace no válido."}, status=status.HTTP_404_NOT_FOUND)
        grant_inactive = (
            lease.grant.status != ResearchAccessRequest.STATUS_APPROVED
            or not lease.grant.ethics_approval
            or lease.grant.principal_id != request.user.id
        )
        if grant_inactive or lease.revoked_at or lease.downloaded_at or lease.expires_at <= timezone.now() or lease.grant.expires_at <= timezone.now():
            _audit_identity(
                request, "research_export_download", "denied", "lease_inactive", "research_export", lease.export_id
            )
            return Response({"detail": "Enlace vencido o utilizado."}, status=status.HTTP_410_GONE)

        rows, reason = build_pseudonymized_export_rows(
            lease.grant,
            lease.filters,
            settings.RESEARCH_DASHBOARD_MIN_PARTICIPANTS,
            settings.RESEARCH_DASHBOARD_MIN_OBSERVABLE_WINDOWS,
        )
        if not rows:
            _audit_identity(
                request, "research_export_download", "denied", reason or "protected_sample_unavailable", "research_export", lease.export_id
            )
            return Response({"detail": "La muestra ya no es exportable."}, status=status.HTTP_409_CONFLICT)

        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0]))
        writer.writeheader()
        for row in rows:
            writer.writerow({key: _csv_safe(value) for key, value in row.items()})
        lease.downloaded_at = timezone.now()
        lease.row_count = len(rows)
        lease.save(update_fields=["downloaded_at", "row_count"])
        _audit_identity(
            request, "research_export_download", "allowed", "one_time_download", "research_export", lease.export_id
        )
        response = HttpResponse(buffer.getvalue(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="research-export-{lease.export_id}.csv"'
        response["Cache-Control"] = "no-store"
        return response


class ResearchExportRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.RESEARCH_DASHBOARD:
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role != User.ROLE_RESEARCHER:
            _audit_identity(request, "research_export_revoke", "denied", "researcher_role_required")
            return Response({"detail": "No disponible."}, status=status.HTTP_404_NOT_FOUND)
        export_id = request.data.get("export_id")
        try:
            export_id = uuid.UUID(str(export_id))
        except (TypeError, ValueError, AttributeError):
            _audit_identity(request, "research_export_revoke", "denied", "invalid_export_id")
            return Response({"detail": "Exportación no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        lease = ResearchExportLease.objects.filter(
            export_id=export_id,
            requested_by=request.user,
            revoked_at__isnull=True,
        ).first()
        if lease is None:
            _audit_identity(request, "research_export_revoke", "denied", "export_not_found")
            return Response({"detail": "Exportación no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        lease.revoked_at = timezone.now()
        lease.save(update_fields=["revoked_at"])
        _audit_identity(
            request, "research_export_revoke", "allowed", "researcher_revoked", "research_export", lease.export_id
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentReportExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        fmt = request.query_params.get("export", "pdf").lower()
        report = StudentReport.objects.filter(user=request.user).order_by("-created_at").first()
        metrics = report.payload if report else _build_student_metrics(request.user)
        if not report:
            _persist_student_report(request.user, metrics)
        return _export_student_report(metrics, fmt)


class RecommendDifficultyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({"detail": "session_id requerido"}, status=400)
        try:
            session = Session.objects.get(id=session_id)
        except Session.DoesNotExist:
            return Response({"detail": "Sesion no encontrada"}, status=404)
        _validate_course_session(request, session, "difficulty_prediction")

        mean_attention = session.mean_attention or 0
        low_ratio = session.low_attention_ratio or 0
        # Heurística: baja atención -> quiz difícil, de lo contrario normal.
        if mean_attention < 0.4 or low_ratio > 0.3:
            difficulty = 'hard'
            reason = "Atención baja detectada (media < 0.4 o ratio baja > 0.3)"
        else:
            difficulty = 'normal'
            reason = "Atención dentro de rango aceptable"

        return Response({
            "session_id": session.id,
            "suggested_difficulty": difficulty,
            "reason": reason,
            "mean_attention": mean_attention,
            "low_attention_ratio": low_ratio,
            "frame_count": session.frame_count,
            "last_score": session.last_score,
        })


class GenerateTestView(APIView):
    """
    Genera una prueba de hasta 20 preguntas. Si existe OPENAI_API_KEY usa OpenAI; si no, devuelve mock.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('course_id')
        module_id = request.data.get('module_id')
        difficulty = request.data.get('difficulty', 'media')
        num_questions = min(int(request.data.get('num_questions', 20)), 20)
        context = request.data.get('context', '')
        include_materials = str(request.data.get('include_materials', 'true')).lower() != 'false'

        if not course_id and not module_id:
            return Response({"detail": "course_id o module_id es requerido"}, status=400)

        user = request.user
        if user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            return Response({"detail": "No autorizado."}, status=403)

        gemini_key = os.environ.get("GOOGLE_API_KEY", "")
        questions = []
        module_context = ""
        transcript_sources = []
        source_items = []

        if include_materials:
            module_context, transcript_sources, source_items = self._build_module_context(user, course_id, module_id)

        # 1) Intentar con Gemini si existe key
        fallback_detail = None
        if gemini_key:
            try:
                client = genai.Client(api_key=gemini_key)
                system_prompt = (
                    "Eres un generador de examenes. Responde SOLO en JSON con la clave 'questions' "
                    "como lista de objetos: id, question, options (lista de 4), answer, difficulty. "
                    "No incluyas texto fuera del JSON."
                )
                user_prompt = (
                    f"Genera {num_questions} preguntas de dificultad {difficulty}. "
                    f"Usa el contenido del modulo y sus materiales. "
                    f"Contenido modulo: {module_context}. "
                    f"Notas del docente: {context}. "
                    "Ajusta la dificultad segun la atencion reportada."
                )
                resp = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[system_prompt, user_prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.6,
                        response_mime_type="application/json",
                    ),
                )
                # Extraer texto de respuesta
                text_payload = ""
                if getattr(resp, "text", None):
                    text_payload = resp.text
                elif getattr(resp, "candidates", None):
                    parts = []
                    for cand in resp.candidates:
                        if getattr(cand, "content", None) and getattr(cand.content, "parts", None):
                            for part in cand.content.parts:
                                if getattr(part, "text", None):
                                    parts.append(part.text)
                    text_payload = "\n".join(parts)
                if text_payload:
                    parsed = json.loads(text_payload)
                    questions = parsed.get("questions") or parsed.get("preguntas") or []
            except Exception as exc:
                fallback_detail = f"Gemini fallback: {exc}"
                pass

        # 3) Mock final
        if not questions:
            questions = self._mock_questions(num_questions, difficulty, course_id, context)

        return Response(
            {
                "course_id": course_id,
                "module_id": module_id,
                "difficulty": difficulty,
                "num_questions": num_questions,
                "questions": questions,
                "detail": fallback_detail,
                "transcripts": transcript_sources,
                "sources": source_items,
            }
        )

    def _mock_questions(self, num_questions, difficulty, course_id, context):
        difficulties = ["baja", "media", "alta"]
        out = []
        for i in range(num_questions):
            d = difficulty if difficulty in difficulties else random.choice(difficulties)
            out.append(
                {
                    "id": i + 1,
                    "question": f"[{d}] Pregunta generada #{i+1} sobre el curso {course_id}. Contexto: {context[:60]}...",
                    "options": [
                        f"Opcion A ({d})",
                        f"Opcion B ({d})",
                        f"Opcion C ({d})",
                        f"Opcion D ({d})",
                    ],
                    "answer": "Opcion A",
                    "difficulty": d,
                }
            )
        return out

    def _build_module_context(self, user, course_id, module_id):
        max_chars = 6000
        parts = []
        transcript_sources = []
        source_items = []

        module = None
        if module_id:
            module = CourseModule.objects.select_related("course").filter(id=module_id).first()
        elif course_id:
            module = CourseModule.objects.select_related("course").filter(course_id=course_id).order_by("order", "id").first()

        if not module:
            return ""

        if user.role == User.ROLE_TEACHER and module.course.owner_id != user.id:
            return ""

        parts.append(f"Curso: {module.course.title}")
        source_items.append({
            "type": "course",
            "title": module.course.title,
        })
        parts.append(f"Modulo: {module.title}")
        source_items.append({
            "type": "module",
            "title": module.title,
        })

        lessons = CourseLesson.objects.filter(module=module).order_by("order", "id")
        materials = CourseMaterial.objects.filter(lesson__in=lessons).order_by("created_at", "id")

        for lesson in lessons:
            parts.append(f"Leccion: {lesson.title}")
            source_items.append({
                "type": "lesson",
                "title": lesson.title,
            })

        for material in materials:
            if material.material_type == CourseMaterial.TYPE_TEST:
                continue
            title = material.title or "Material"
            desc = material.description or ""
            parts.append(f"Material: {title}. {desc}")
            if material.material_type == CourseMaterial.TYPE_PDF:
                source_items.append({
                    "type": "pdf",
                    "title": title,
                    "detail": desc,
                })

            if material.material_type == CourseMaterial.TYPE_PDF:
                pdf_text = self._extract_pdf_text(material)
                if pdf_text:
                    parts.append(f"Contenido PDF: {pdf_text}")
            if material.material_type == CourseMaterial.TYPE_VIDEO:
                meta = material.metadata or {}
                transcript = meta.get("transcript") or meta.get("summary") or meta.get("descripcion") or ""
                url = material.url or ""
                if not transcript and url:
                    transcript, transcript_error = self._extract_youtube_transcript(url)
                    if transcript:
                        meta["transcript"] = transcript
                        material.metadata = meta
                        material.save(update_fields=["metadata"])
                        transcript_sources.append({
                            "material_id": material.id,
                            "title": title,
                            "source": "youtube",
                            "status": "fetched",
                        })
                        source_items.append({
                            "type": "video",
                            "title": title,
                            "detail": url,
                            "status": "transcribed",
                        })
                    else:
                        fallback_text = meta.get("summary") or meta.get("descripcion") or desc or ""
                        if fallback_text:
                            parts.append(f"Resumen video: {fallback_text}")
                            source_items.append({
                                "type": "video",
                                "title": title,
                                "detail": url,
                                "status": "fallback_summary",
                                "reason": transcript_error or "Sin subtitulos disponibles",
                            })
                        elif url:
                            source_items.append({
                                "type": "video",
                                "title": title,
                                "detail": url,
                                "status": "no_transcript",
                                "reason": transcript_error or "Sin subtitulos disponibles",
                            })
                if transcript:
                    parts.append(f"Contenido video: {transcript}")
                    if not any(s["material_id"] == material.id for s in transcript_sources):
                        transcript_sources.append({
                            "material_id": material.id,
                            "title": title,
                            "source": "metadata",
                            "status": "cached",
                        })
                        source_items.append({
                            "type": "video",
                            "title": title,
                            "detail": url,
                            "status": "cached",
                        })
                elif url:
                    parts.append(f"Video: {url}")
                    transcript_sources.append({
                        "material_id": material.id,
                        "title": title,
                        "source": "youtube",
                        "status": "not_available",
                    })
                    source_items.append({
                        "type": "video",
                        "title": title,
                        "detail": url,
                        "status": "no_transcript",
                    })

        joined = "\n".join(parts)
        if len(joined) > max_chars:
            joined = joined[:max_chars] + "..."
        return joined, transcript_sources, source_items

    def _extract_pdf_text(self, material):
        if not material.file_bytes:
            return ""
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(material.file_bytes))
            texts = []
            for page in reader.pages[:10]:
                text = page.extract_text() or ""
                if text:
                    texts.append(text.strip())
            return " ".join(texts)[:2000]
        except Exception:
            return ""

    def _extract_youtube_transcript(self, url):
        video_id = self._parse_youtube_id(url)
        if not video_id:
            return "", "No se pudo extraer el ID del video"
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["es", "en"])
            text = " ".join([item.get("text", "") for item in transcript if item.get("text")])
            return text[:2000], ""
        except Exception as exc:
            return "", str(exc)

    def _parse_youtube_id(self, url):
        if not url:
            return ""
        try:
            parsed = urlparse(url)
            if parsed.hostname in ["youtu.be"]:
                return parsed.path.strip("/").split("/")[0]
            if parsed.hostname and "youtube" in parsed.hostname:
                qs = parse_qs(parsed.query)
                if "v" in qs and qs["v"]:
                    return qs["v"][0]
                if parsed.path.startswith("/embed/"):
                    return parsed.path.split("/embed/")[1].split("/")[0]
        except Exception:
            pass
        match = re.search(r"v=([\\w-]{6,})", url)
        return match.group(1) if match else ""


class SendTestEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        to_email = request.data.get("to_email") or request.user.email
        subject = request.data.get("subject") or "Notificacion VisionClass"
        message = request.data.get("message") or "Este es un mensaje de prueba."

        if not to_email:
            return Response({"detail": "to_email es requerido."}, status=400)

        try:
            send_mailgun_email(to_email, subject, message)
        except Exception as exc:
            return Response({"detail": f"No se pudo enviar el correo: {exc}"}, status=500)

        return Response({"detail": "Correo enviado."}, status=200)


class SendStudentNotificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            return Response({"detail": "No autorizado."}, status=403)

        student_id = request.data.get("student_id")
        course_id = request.data.get("course_id")
        subject = request.data.get("subject") or "Notificacion de rendimiento"
        message = request.data.get("message") or ""

        if not student_id:
            return Response({"detail": "student_id es requerido."}, status=400)

        try:
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response({"detail": "Estudiante no encontrado."}, status=404)

        if not student.email:
            return Response({"detail": "El estudiante no tiene email registrado."}, status=400)

        if user.role == User.ROLE_TEACHER:
            enrollments = Enrollment.objects.filter(user=student, course__owner=user)
            if course_id:
                enrollments = enrollments.filter(course_id=course_id)
            if not enrollments.exists():
                return Response({"detail": "No tienes acceso a este estudiante."}, status=403)

        notification = StudentNotification.objects.create(
            recipient=student,
            sender=user,
            course_id=course_id,
            subject=subject,
            message=message or "Notificacion enviada por el docente.",
            status=StudentNotification.STATUS_PENDING,
        )

        try:
            send_mailgun_email(student.email, subject, message or "Notificacion enviada por el docente.")
        except Exception as exc:
            notification.status = StudentNotification.STATUS_FAILED
            notification.error_message = str(exc)
            notification.save(update_fields=["status", "error_message"])
            logger.warning("No se pudo enviar mailgun a %s: %s", student.email, exc)
            return Response({"detail": f"No se pudo enviar el correo: {exc}"}, status=500)

        notification.status = StudentNotification.STATUS_SENT
        notification.sent_at = timezone.now()
        notification.save(update_fields=["status", "sent_at"])

        return Response({"detail": "Notificacion enviada."}, status=200)


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUserRole]
    queryset = User.objects.all().order_by("id")

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        return queryset


class AdminCourseViewSet(viewsets.ModelViewSet):
    serializer_class = AdminCourseSerializer
    permission_classes = [IsAdminUserRole]
    queryset = Course.objects.all().order_by("id")

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(owner__username__icontains=search)
                | Q(owner__first_name__icontains=search)
                | Q(owner__last_name__icontains=search)
                | Q(category__icontains=search)
            )
        return queryset

    def _resolve_instructor(self):
        instructor_id = self.request.data.get("instructor_id")
        instructor_email = self.request.data.get("instructor_email")
        if instructor_id:
            try:
                return UserModel.objects.get(id=instructor_id)
            except UserModel.DoesNotExist:
                return None
        if instructor_email:
            try:
                return UserModel.objects.get(email__iexact=instructor_email)
            except UserModel.DoesNotExist:
                return None
        return None

    def perform_create(self, serializer):
        owner = self._resolve_instructor()
        if owner:
            serializer.save(owner=owner)
        else:
            serializer.save()

    def perform_update(self, serializer):
        owner = self._resolve_instructor()
        if owner:
            serializer.save(owner=owner)
        else:
            serializer.save()


class AdminOverviewView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        courses = Course.objects.filter(is_active=True)
        enrollments = Enrollment.objects.filter(course__is_active=True)
        users = User.objects.all()
        students = users.filter(role=User.ROLE_STUDENT)
        teachers = users.filter(role=User.ROLE_TEACHER)

        data = {
            "total_users": users.count(),
            "total_students": students.count(),
            "total_professors": teachers.count(),
            "total_courses": courses.count(),
            "active_courses": courses.filter(is_active=True).count(),
            "total_enrollments": enrollments.count(),
        }
        return Response(data, status=status.HTTP_200_OK)


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdminUserRole]

    def _month_label(self, dt):
        labels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        return labels[dt.month - 1]

    def _faculty_metrics(self):
        courses = Course.objects.filter(is_active=True)
        categories = courses.values_list("category", flat=True).distinct()
        output = []
        for idx, category in enumerate(categories, start=1):
            category_courses = courses.filter(category=category)
            enrollments = Enrollment.objects.filter(course__in=category_courses)
            sessions = Session.objects.filter(course__in=category_courses)
            quiz_attempts = QuizAttempt.objects.filter(session__course__in=category_courses)
            students = enrollments.values_list("user_id", flat=True).distinct().count()
            professors = category_courses.values_list("owner_id", flat=True).distinct().count()
            attention = sessions.aggregate(avg=models.Avg("mean_attention"))["avg"] or 0
            avg_grade = quiz_attempts.aggregate(avg=models.Avg("score"))["avg"] or 0
            completed = enrollments.filter(status=Enrollment.STATUS_COMPLETED).count()
            total = enrollments.count() or 1
            completion_rate = round((completed / total) * 100, 1)
            low_attention = sessions.filter(mean_attention__lt=0.4).count()
            dropout_risk = round((low_attention / (sessions.count() or 1)) * 100, 1)
            output.append(
                {
                    "id": idx,
                    "name": category or "General",
                    "students": students,
                    "professors": professors,
                    "courses": category_courses.count(),
                    "avgAttention": round(attention * 100, 1),
                    "avgGrade": round(avg_grade or 0, 1),
                    "completionRate": completion_rate,
                    "dropoutRisk": dropout_risk,
                    "trend": "+0%",
                }
            )
        if not output:
            output.append(
                {
                    "id": 1,
                    "name": "General",
                    "students": 0,
                    "professors": 0,
                    "courses": 0,
                    "avgAttention": 0,
                    "avgGrade": 0,
                    "completionRate": 0,
                    "dropoutRisk": 0,
                    "trend": "+0%",
                }
            )
        return output

    def _institutional_trend(self):
        sessions = Session.objects.filter(course__is_active=True)
        enrollments = Enrollment.objects.filter(course__is_active=True)
        session_by_month = (
            sessions.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(attention=models.Avg("mean_attention"))
            .order_by("month")
        )
        enrollment_by_month = (
            enrollments.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(students=models.Count("user_id", distinct=True))
            .order_by("month")
        )
        completion_by_month = (
            enrollments.filter(status=Enrollment.STATUS_COMPLETED)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(rate=models.Count("id"))
            .order_by("month")
        )

        metrics = {}
        for row in enrollment_by_month:
            if not row["month"]:
                continue
            metrics[row["month"]] = {"students": row["students"], "attention": 0, "graduation": 0}
        for row in session_by_month:
            if not row["month"]:
                continue
            metrics.setdefault(row["month"], {"students": 0, "attention": 0, "graduation": 0})
            metrics[row["month"]]["attention"] = round((row["attention"] or 0) * 100, 1)
        for row in completion_by_month:
            if not row["month"]:
                continue
            metrics.setdefault(row["month"], {"students": 0, "attention": 0, "graduation": 0})
            total_enrollments = enrollments.filter(created_at__month=row["month"].month).count() or 1
            metrics[row["month"]]["graduation"] = round((row["rate"] / total_enrollments) * 100, 1)

        output = []
        for month in sorted(metrics.keys())[-6:]:
            output.append(
                {
                    "month": self._month_label(month),
                    "students": metrics[month]["students"],
                    "attention": metrics[month]["attention"],
                    "graduation": metrics[month]["graduation"],
                }
            )
        return output

    def _dropout_prediction(self):
        students = User.objects.filter(role=User.ROLE_STUDENT)
        results = []
        for user in students:
            sessions = Session.objects.filter(student=user, course__is_active=True)
            if not sessions.exists():
                continue
            avg_attention = sessions.aggregate(avg=models.Avg("mean_attention"))["avg"] or 0
            low_ratio = sessions.aggregate(avg=models.Avg("low_attention_ratio"))["avg"] or 0
            last_session = sessions.order_by("-created_at").first()
            inactivity_days = (timezone.now() - (last_session.created_at or timezone.now())).days if last_session else 0
            risk_score = int(max(0, min(100, (1 - avg_attention) * 100 + low_ratio * 30 + inactivity_days)))
            if risk_score < 50:
                continue
            if risk_score >= 85:
                risk_level = "critical"
            elif risk_score >= 70:
                risk_level = "high"
            else:
                risk_level = "medium"
            factors = []
            if avg_attention < 0.6:
                factors.append("Atencion baja en sesiones recientes")
            if low_ratio > 0.3:
                factors.append("Varias sesiones con baja atencion")
            if inactivity_days > 7:
                factors.append(f"Inactividad prolongada ({inactivity_days} dias)")
            if not factors:
                factors.append("Patrones de estudio irregulares")

            results.append(
                {
                    "id": user.id,
                    "student": f"{user.first_name} {user.last_name}".strip() or user.username,
                    "faculty": "General",
                    "riskLevel": risk_level,
                    "riskScore": risk_score,
                    "factors": factors,
                    "recommendation": "Programar seguimiento academico",
                }
            )
        return sorted(results, key=lambda x: x["riskScore"], reverse=True)[:10]

    def get(self, request):
        if not PrivacyPolicySetting.objects.exists():
            PrivacyPolicySetting.objects.bulk_create(
                [
                    PrivacyPolicySetting(
                        name="Retencion de Datos de Atencion",
                        description="Tiempo que se almacenan las metricas de atencion de estudiantes",
                        current_value="2 anos",
                        options=["6 meses", "1 ano", "2 anos", "5 anos"],
                    ),
                    PrivacyPolicySetting(
                        name="Compartir con Profesores",
                        description="Nivel de detalle de datos compartidos con instructores",
                        current_value="Agregado por curso",
                        options=["Solo promedio", "Agregado por curso", "Individual detallado"],
                    ),
                    PrivacyPolicySetting(
                        name="Anonimizacion de Datos",
                        description="Uso de datos para investigacion y analisis",
                        current_value="Siempre anonimo",
                        options=["Siempre anonimo", "Con consentimiento", "Deshabilitado"],
                    ),
                    PrivacyPolicySetting(
                        name="Notificaciones de Riesgo",
                        description="Alertas automaticas para estudiantes en riesgo",
                        current_value="Habilitado",
                        options=["Habilitado", "Solo critico", "Deshabilitado"],
                    ),
                ]
            )
        data = {
            "faculty_metrics": self._faculty_metrics(),
            "institutional_trend": self._institutional_trend(),
            "dropout_prediction": self._dropout_prediction(),
            "research_permissions": ResearchAccessRequestSerializer(
                ResearchAccessRequest.objects.all(), many=True
            ).data,
            "privacy_policies": PrivacyPolicySettingSerializer(
                PrivacyPolicySetting.objects.all(), many=True
            ).data,
        }
        return Response(data, status=status.HTTP_200_OK)


class AdminResearchPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = ResearchAccessRequestSerializer
    permission_classes = [IsAdminUserRole]
    queryset = ResearchAccessRequest.objects.all().order_by("-requested_at", "id")


class AdminPrivacyPolicyViewSet(viewsets.ModelViewSet):
    serializer_class = PrivacyPolicySettingSerializer
    permission_classes = [IsAdminUserRole]
    queryset = PrivacyPolicySetting.objects.all().order_by("name", "id")


class ConsentEventViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ConsentEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ConsentEvent.objects.filter(participant=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != User.ROLE_STUDENT:
            raise PermissionDenied("Solo el participante puede decidir su consentimiento.")
        action_value = serializer.validated_data["action"]
        version = serializer.validated_data["version"]
        if action_value == ConsentEvent.ACTION_GRANT:
            if not settings.CONSENT_V2_ENABLED or not settings.CONSENT_TEXT_APPROVED:
                raise PermissionDenied("El texto de consentimiento está pendiente de aprobación.")
            if version != settings.CONSENT_CURRENT_VERSION:
                raise PermissionDenied("La versión de consentimiento no está vigente.")
        serializer.save(participant=user, source="web")


class ConsentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_STUDENT:
            raise PermissionDenied("Estado disponible solo para participantes.")
        return Response(consent_status(request.user), status=status.HTTP_200_OK)
