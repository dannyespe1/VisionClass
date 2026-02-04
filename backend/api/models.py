from django.contrib.auth.models import AbstractUser
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['session', 'timestamp']),
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['d2r_session', 'timestamp']),
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
