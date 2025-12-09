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

    def __str__(self):
        return f"{self.username} ({self.role})"


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


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
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='d2r_results')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='d2r_results')
    raw_score = models.IntegerField()
    processing_speed = models.FloatField(help_text="Índice de velocidad/procesamiento")
    attention_span = models.FloatField(help_text="Indicador de atención")
    errors = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"D2R {self.user} sesion {self.session_id}"


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
