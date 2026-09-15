from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class User(AbstractUser):
    ROLE_STUDENT = 'student'
    ROLE_TEACHER = 'teacher'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_STUDENT, 'Estudiante'),
        (ROLE_TEACHER, 'Profesor'),
        (ROLE_ADMIN, 'Administrador'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    profile_image = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.username} ({self.role})"


class SecurityAuditEvent(models.Model):
    actor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='security_audit_events')
    action = models.CharField(max_length=80)
    outcome = models.CharField(max_length=20)
    reason_code = models.CharField(max_length=80)
    resource_type = models.CharField(max_length=40, blank=True)
    resource_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Los eventos de auditoría son inmutables.")
        return super().save(*args, **kwargs)


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=120, blank=True, default="General")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class CourseModule(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    duration_hours = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.course} - {self.title}"


class CourseLesson(models.Model):
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.module} - {self.title}"


class CourseMaterial(models.Model):
    TYPE_PDF = 'pdf'
    TYPE_VIDEO = 'video'
    TYPE_TEST = 'test'
    TYPE_CHOICES = [
        (TYPE_PDF, 'PDF'),
        (TYPE_VIDEO, 'Video'),
        (TYPE_TEST, 'Test'),
    ]

    lesson = models.ForeignKey(CourseLesson, on_delete=models.CASCADE, related_name='materials')
    material_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    url = models.TextField(blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_content_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    file_bytes = models.BinaryField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    def __str__(self):
        return f"{self.lesson} - {self.title}"


class Enrollment(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Activa'),
        (STATUS_COMPLETED, 'Completada'),
        (STATUS_CANCELLED, 'Cancelada'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    enrollment_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'course')

    def __str__(self):
        return f"{self.user} -> {self.course} ({self.status})"


class Session(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sessions')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_sessions')
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    attention_score = models.FloatField(null=True, blank=True)
    distracted_count = models.PositiveIntegerField(default=0)
    mean_attention = models.FloatField(default=0)
    low_attention_ratio = models.FloatField(default=0)
    frame_count = models.PositiveIntegerField(default=0)
    last_score = models.FloatField(null=True, blank=True)
    raw_metrics = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['course', 'student']),
        ]

    def __str__(self):
        return f"Sesion {self.id} - {self.course} - {self.student}"


class AttentionEvent(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='events')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attention_events')
    timestamp = models.DateTimeField()
    value = models.FloatField()
    label = models.CharField(max_length=100, blank=True)
    data = models.JSONField(default=dict, blank=True)
    idempotency_key = models.CharField(max_length=64, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['session', 'timestamp']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['session', 'idempotency_key'], name='uniq_attention_event_idempotency'),
        ]

    def __str__(self):
        return f"Evento {self.id} sesion {self.session_id}"


class D2RSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='d2r_sessions')
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    attention_score = models.FloatField(null=True, blank=True)
    mean_attention = models.FloatField(default=0)
    low_attention_ratio = models.FloatField(default=0)
    frame_count = models.PositiveIntegerField(default=0)
    last_score = models.FloatField(null=True, blank=True)
    raw_metrics = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"D2R sesion {self.id} - {self.user}"


class D2RAttentionEvent(models.Model):
    d2r_session = models.ForeignKey(D2RSession, on_delete=models.CASCADE, related_name='events')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='d2r_attention_events')
    timestamp = models.DateTimeField()
    value = models.FloatField()
    label = models.CharField(max_length=100, blank=True)
    data = models.JSONField(default=dict, blank=True)
    idempotency_key = models.CharField(max_length=64, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['d2r_session', 'timestamp']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['d2r_session', 'idempotency_key'], name='uniq_d2r_event_idempotency'),
        ]

    def __str__(self):
        return f"D2R evento {self.id} sesion {self.d2r_session_id}"


class ContentView(models.Model):
    TYPE_PDF = 'pdf'
    TYPE_VIDEO = 'video'
    TYPE_QUIZ = 'quiz'
    TYPE_CHOICES = [
        (TYPE_PDF, 'PDF'),
        (TYPE_VIDEO, 'Video'),
        (TYPE_QUIZ, 'Quiz'),
    ]

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='content_views')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='content_views')
    content_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    content_id = models.CharField(max_length=255, help_text="Identificador de contenido (slug o id interno)")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(default=0)

    def __str__(self):
        return f"{self.user} {self.content_type} {self.content_id}"


class D2RResult(models.Model):
    d2r_session = models.ForeignKey(D2RSession, on_delete=models.CASCADE, related_name='results')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='d2r_results')
    raw_score = models.IntegerField()
    processing_speed = models.FloatField(help_text="Índice de velocidad/procesamiento")
    attention_span = models.FloatField(help_text="Indicador de atención")
    errors = models.IntegerField(default=0)
    phase_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"D2R {self.user} sesion {self.d2r_session_id}"


class QuizAttempt(models.Model):
    DIFF_NORMAL = 'normal'
    DIFF_HARD = 'hard'
    DIFF_CHOICES = [
        (DIFF_NORMAL, 'Normal'),
        (DIFF_HARD, 'Dificil'),
    ]

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='quiz_attempts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    difficulty = models.CharField(max_length=20, choices=DIFF_CHOICES, default=DIFF_NORMAL)
    score = models.FloatField(null=True, blank=True)
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quiz {self.difficulty} - {self.user}"


class D2RSchedule(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_COMPLETED, 'Completado'),
        (STATUS_CANCELLED, 'Cancelado'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='d2r_schedules')
    scheduled_for = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_for', 'id']

    def __str__(self):
        return f"D2R {self.user} {self.scheduled_for} ({self.status})"


class StudentReport(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', 'id']

    def __str__(self):
        return f"Reporte {self.user} {self.created_at}"


class StudentNotification(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_SENT = 'sent'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_SENT, 'Enviada'),
        (STATUS_FAILED, 'Fallida'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    error_message = models.TextField(blank=True, default="")
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"Notificacion {self.recipient} ({self.status})"


class ResearchAccessRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_APPROVED, 'Aprobado'),
        (STATUS_REJECTED, 'Rechazado'),
    ]

    researcher = models.CharField(max_length=255)
    institution = models.CharField(max_length=255)
    project = models.CharField(max_length=255)
    data_requested = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    ethics_approval = models.BooleanField(default=False)
    requested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-requested_at', 'id']

    def __str__(self):
        return f"{self.project} ({self.status})"


class PrivacyPolicySetting(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    current_value = models.CharField(max_length=255)
    options = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name', 'id']

    def __str__(self):
        return self.name


class ConsentEvent(models.Model):
    PURPOSE_LOCAL_PROCESSING = "local_processing"
    PURPOSE_DERIVED_PERSISTENCE = "derived_persistence"
    PURPOSE_RESEARCH = "research"
    PURPOSE_CHOICES = [
        (PURPOSE_LOCAL_PROCESSING, "Procesamiento local"),
        (PURPOSE_DERIVED_PERSISTENCE, "Persistencia de datos derivados"),
        (PURPOSE_RESEARCH, "Uso en investigación"),
    ]
    ACTION_GRANT = "grant"
    ACTION_DECLINE = "decline"
    ACTION_REVOKE = "revoke"
    ACTION_CHOICES = [
        (ACTION_GRANT, "Otorgar"),
        (ACTION_DECLINE, "Rechazar"),
        (ACTION_REVOKE, "Revocar"),
    ]

    participant = models.ForeignKey(User, on_delete=models.PROTECT, related_name="consent_events")
    version = models.CharField(max_length=64)
    purpose = models.CharField(max_length=32, choices=PURPOSE_CHOICES)
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    expires_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=32, default="web")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["participant", "purpose", "created_at"])]

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Los eventos de consentimiento son inmutables.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Los eventos de consentimiento son inmutables.")


class TemporalSession(models.Model):
    """Stable envelope that keeps observations separate from interpretations."""

    participant = models.ForeignKey(User, on_delete=models.PROTECT, related_name="temporal_sessions")
    course_session = models.OneToOneField(
        Session, on_delete=models.PROTECT, null=True, blank=True, related_name="temporal_session"
    )
    d2r_session = models.OneToOneField(
        D2RSession, on_delete=models.PROTECT, null=True, blank=True, related_name="temporal_session"
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    provenance = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["participant", "started_at"])]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (models.Q(course_session__isnull=False) & models.Q(d2r_session__isnull=True))
                    | (models.Q(course_session__isnull=True) & models.Q(d2r_session__isnull=False))
                ),
                name="temporal_session_exactly_one_source",
            ),
            models.CheckConstraint(
                condition=models.Q(ended_at__isnull=True) | models.Q(ended_at__gte=models.F("started_at")),
                name="temporal_session_valid_range",
            ),
        ]


class Observation(models.Model):
    temporal_session = models.ForeignKey(TemporalSession, on_delete=models.CASCADE, related_name="observations")
    event_id = models.UUIDField(unique=True)
    kind = models.CharField(max_length=64)
    captured_at = models.DateTimeField()
    received_at = models.DateTimeField()
    processed_at = models.DateTimeField(null=True, blank=True)
    values = models.JSONField(default=dict)
    quality = models.JSONField(default=dict, blank=True)
    provenance = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["temporal_session", "captured_at"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(received_at__gte=models.F("captured_at")),
                name="observation_received_after_capture",
            ),
            models.CheckConstraint(
                condition=models.Q(processed_at__isnull=True) | models.Q(processed_at__gte=models.F("received_at")),
                name="observation_processed_after_received",
            ),
        ]


class ObservationWindow(models.Model):
    temporal_session = models.ForeignKey(TemporalSession, on_delete=models.CASCADE, related_name="windows")
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()
    aggregation_version = models.CharField(max_length=64)
    features = models.JSONField(default=dict)
    quality = models.JSONField(default=dict, blank=True)
    provenance = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["temporal_session", "started_at"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ended_at__gt=models.F("started_at")),
                name="observation_window_positive_duration",
            )
        ]


class ModelArtifact(models.Model):
    STATUS_CANDIDATE = "candidate"
    STATUS_VALIDATED = "validated"
    STATUS_ACTIVE = "active"
    STATUS_RETIRED = "retired"
    STATUS_BLOCKED = "blocked"
    STATUS_CHOICES = [
        (STATUS_CANDIDATE, "Candidate"),
        (STATUS_VALIDATED, "Validated"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_RETIRED, "Retired"),
        (STATUS_BLOCKED, "Blocked"),
    ]

    name = models.CharField(max_length=128)
    version = models.CharField(max_length=64)
    artifact_sha256 = models.CharField(max_length=64)
    artifact_uri = models.CharField(max_length=512)
    algorithm = models.CharField(max_length=128)
    feature_contract = models.CharField(max_length=64)
    dataset_reference = models.CharField(max_length=128)
    code_revision = models.CharField(max_length=64)
    metrics = models.JSONField(default=dict)
    thresholds = models.JSONField(default=dict, blank=True)
    evaluation = models.JSONField(default=dict)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_CANDIDATE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["name", "version"], name="uniq_model_name_version"),
            models.UniqueConstraint(fields=["artifact_sha256"], name="uniq_model_artifact_sha256"),
            models.UniqueConstraint(
                fields=["name"], condition=models.Q(status="active"), name="uniq_active_model_per_name"
            ),
        ]
        indexes = [models.Index(fields=["name", "status"])]

    def clean(self):
        super().clean()
        digest = self.artifact_sha256.lower()
        if len(digest) != 64 or any(character not in "0123456789abcdef" for character in digest):
            raise ValidationError({"artifact_sha256": "Debe ser un SHA-256 hexadecimal de 64 caracteres."})
        self.artifact_sha256 = digest
        if self.status in {self.STATUS_VALIDATED, self.STATUS_ACTIVE} and not self.evaluation:
            raise ValidationError({"evaluation": "Un modelo validado o activo requiere evidencia de evaluación."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class InferredState(models.Model):
    STATE_NO_OBSERVABLE = "no_observable"
    STATE_UNKNOWN = "unknown"
    STATE_ATTENTIVE = "attentive"
    STATE_DISTRACTED = "distracted"
    STATE_CHOICES = [
        (STATE_NO_OBSERVABLE, "No observable"),
        (STATE_UNKNOWN, "Unknown"),
        (STATE_ATTENTIVE, "Attentive"),
        (STATE_DISTRACTED, "Distracted"),
    ]

    window = models.ForeignKey(ObservationWindow, on_delete=models.PROTECT, related_name="inferred_states")
    state = models.CharField(max_length=32, choices=STATE_CHOICES)
    probabilities = models.JSONField(default=dict)
    uncertainty = models.FloatField(null=True, blank=True)
    model_reference = models.CharField(max_length=128, blank=True)
    model_artifact = models.ForeignKey(
        ModelArtifact, on_delete=models.PROTECT, null=True, blank=True, related_name="inferences"
    )
    inference_version = models.CharField(max_length=64)
    inferred_at = models.DateTimeField()
    provenance = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["window", "inferred_at"])]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (models.Q(uncertainty__isnull=True))
                    | (models.Q(uncertainty__gte=0.0) & models.Q(uncertainty__lte=1.0))
                ),
                name="inferred_state_uncertainty_unit_range",
            )
        ]


class StateTransition(models.Model):
    temporal_session = models.ForeignKey(TemporalSession, on_delete=models.CASCADE, related_name="transitions")
    from_state = models.ForeignKey(
        InferredState, on_delete=models.PROTECT, null=True, blank=True, related_name="outgoing_transitions"
    )
    to_state = models.ForeignKey(InferredState, on_delete=models.PROTECT, related_name="incoming_transitions")
    occurred_at = models.DateTimeField()
    reason = models.CharField(max_length=128, blank=True)
    provenance = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["temporal_session", "occurred_at"])]


class InterventionRecord(models.Model):
    STATUS_PROPOSED = "proposed"
    STATUS_SUPPRESSED = "suppressed"
    STATUS_PRESENTED = "presented"
    STATUS_CHOICES = [
        (STATUS_PROPOSED, "Proposed"),
        (STATUS_SUPPRESSED, "Suppressed"),
        (STATUS_PRESENTED, "Presented"),
    ]

    temporal_session = models.ForeignKey(TemporalSession, on_delete=models.CASCADE, related_name="interventions")
    triggering_state = models.ForeignKey(
        InferredState, on_delete=models.PROTECT, null=True, blank=True, related_name="interventions"
    )
    intervention_type = models.CharField(max_length=64)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PROPOSED)
    occurred_at = models.DateTimeField()
    policy_version = models.CharField(max_length=64)
    provenance = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["temporal_session", "occurred_at"])]


class MomentarySelfReport(models.Model):
    RESPONSE_FOCUSED = "focused"
    RESPONSE_DISTRACTED = "distracted"
    RESPONSE_UNSURE = "unsure"
    RESPONSE_OMITTED = "omitted"
    RESPONSE_CHOICES = [
        (RESPONSE_FOCUSED, "Focused"),
        (RESPONSE_DISTRACTED, "Distracted"),
        (RESPONSE_UNSURE, "Unsure"),
        (RESPONSE_OMITTED, "Omitted"),
    ]

    request_id = models.UUIDField(unique=True)
    temporal_session = models.ForeignKey(TemporalSession, on_delete=models.CASCADE, related_name="self_reports")
    window = models.ForeignKey(ObservationWindow, on_delete=models.PROTECT, null=True, blank=True, related_name="self_reports")
    participant = models.ForeignKey(User, on_delete=models.PROTECT, related_name="momentary_self_reports")
    prompt_version = models.CharField(max_length=64)
    response = models.CharField(max_length=16, choices=RESPONSE_CHOICES)
    requested_at = models.DateTimeField()
    responded_at = models.DateTimeField(null=True, blank=True)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    resource_kind = models.CharField(max_length=32, blank=True)
    resource_reference = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["temporal_session", "requested_at"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(responded_at__isnull=True) | models.Q(responded_at__gte=models.F("requested_at")),
                name="self_report_response_after_request",
            )
        ]

    def clean(self):
        super().clean()
        if self.participant_id and self.temporal_session_id and self.participant_id != self.temporal_session.participant_id:
            raise ValidationError("El participante no corresponde a la sesión temporal.")
        if self.response == self.RESPONSE_OMITTED and self.responded_at is not None:
            raise ValidationError("Una omisión no debe registrar tiempo de respuesta.")
