from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    User,
    Course,
    CourseModule,
    CourseLesson,
    CourseMaterial,
    Enrollment,
    Session,
    AttentionEvent,
    D2RSession,
    D2RAttentionEvent,
    ContentView,
    D2RResult,
    QuizAttempt,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Rol', {'fields': ('role',)}),
    )
    list_display = ('username', 'email', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'owner__username')


@admin.register(CourseModule)
class CourseModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order', 'duration_hours', 'created_at')
    list_filter = ('course',)
    search_fields = ('title', 'course__title')


@admin.register(CourseLesson)
class CourseLessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'order', 'created_at')
    list_filter = ('module',)
    search_fields = ('title', 'module__title')


@admin.register(CourseMaterial)
class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ('title', 'material_type', 'lesson', 'created_at')
    list_filter = ('material_type',)
    search_fields = ('title', 'lesson__title')


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'course', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__username', 'course__title')


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'course', 'student', 'started_at', 'ended_at', 'attention_score', 'distracted_count')
    search_fields = ('course__title', 'student__username')


@admin.register(AttentionEvent)
class AttentionEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'user', 'timestamp', 'value', 'label')
    search_fields = ('session__id', 'user__username', 'label')


@admin.register(D2RSession)
class D2RSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'started_at', 'ended_at', 'attention_score', 'frame_count')
    search_fields = ('user__username',)


@admin.register(D2RAttentionEvent)
class D2RAttentionEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'd2r_session', 'user', 'timestamp', 'value', 'label')
    search_fields = ('d2r_session__id', 'user__username', 'label')


@admin.register(ContentView)
class ContentViewAdmin(admin.ModelAdmin):
    list_display = ('user', 'session', 'content_type', 'content_id', 'duration_seconds', 'started_at')
    list_filter = ('content_type',)
    search_fields = ('content_id', 'user__username', 'session__id')


@admin.register(D2RResult)
class D2RResultAdmin(admin.ModelAdmin):
    list_display = ('user', 'd2r_session', 'raw_score', 'processing_speed', 'attention_span', 'errors', 'created_at')
    search_fields = ('user__username', 'd2r_session__id')


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'session', 'difficulty', 'score', 'created_at')
    list_filter = ('difficulty',)
    search_fields = ('user__username', 'session__id')
