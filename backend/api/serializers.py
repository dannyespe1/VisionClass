from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Course,
    Enrollment,
    Session,
    AttentionEvent,
    ContentView,
    D2RResult,
    QuizAttempt,
    CourseModule,
    CourseLesson,
    CourseMaterial,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = ['id']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CourseSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'owner', 'created_at', 'is_active']
        read_only_fields = ['id', 'owner', 'created_at']


class CourseModuleSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), source='course', write_only=True)

    class Meta:
        model = CourseModule
        fields = ['id', 'course', 'course_id', 'title', 'order', 'duration_hours', 'created_at']
        read_only_fields = ['id', 'course', 'created_at']


class CourseLessonSerializer(serializers.ModelSerializer):
    module = CourseModuleSerializer(read_only=True)
    module_id = serializers.PrimaryKeyRelatedField(queryset=CourseModule.objects.all(), source='module', write_only=True)

    class Meta:
        model = CourseLesson
        fields = ['id', 'module', 'module_id', 'title', 'order', 'created_at']
        read_only_fields = ['id', 'module', 'created_at']


class CourseMaterialSerializer(serializers.ModelSerializer):
    lesson = CourseLessonSerializer(read_only=True)
    lesson_id = serializers.PrimaryKeyRelatedField(queryset=CourseLesson.objects.all(), source='lesson', write_only=True)
    file_base64 = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CourseMaterial
        fields = [
            'id', 'lesson', 'lesson_id', 'material_type', 'title', 'description',
            'url', 'metadata', 'file_name', 'file_content_type', 'file_size', 'file_base64', 'created_at'
        ]
        read_only_fields = ['id', 'lesson', 'created_at']

    def _apply_file_payload(self, instance, validated_data):
        import base64

        file_base64 = validated_data.pop('file_base64', None)
        if not file_base64:
            return
        try:
            decoded = base64.b64decode(file_base64)
        except Exception:
            decoded = b""
        instance.file_bytes = decoded if decoded else None
        instance.file_size = len(decoded) if decoded else 0

    def create(self, validated_data):
        file_base64 = validated_data.pop('file_base64', None)
        instance = super().create(validated_data)
        if file_base64:
            self._apply_file_payload(instance, {'file_base64': file_base64})
        if instance.file_bytes is not None:
            instance.save(update_fields=['file_bytes', 'file_size'])
        return instance

    def update(self, instance, validated_data):
        file_base64 = validated_data.pop('file_base64', None)
        instance = super().update(instance, validated_data)
        if file_base64 is not None:
            self._apply_file_payload(instance, {'file_base64': file_base64})
            instance.save(update_fields=['file_bytes', 'file_size'])
        return instance


class EnrollmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), source='course', write_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'user', 'course', 'course_id', 'status', 'enrollment_data', 'created_at']
        read_only_fields = ['id', 'user', 'course', 'created_at']


class SessionSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), source='course', write_only=True)
    student_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='student', write_only=True)

    class Meta:
        model = Session
        fields = [
            'id', 'course', 'course_id', 'student', 'student_id',
            'started_at', 'ended_at', 'attention_score', 'distracted_count', 'raw_metrics',
            'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'course', 'student', 'created_by', 'created_at']


class AttentionEventSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(queryset=Session.objects.all(), source='session', write_only=True)
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user', write_only=True)

    class Meta:
        model = AttentionEvent
        fields = [
            'id', 'session', 'session_id', 'user', 'user_id',
            'timestamp', 'value', 'label', 'data', 'created_at'
        ]
        read_only_fields = ['id', 'session', 'user', 'created_at']


class ContentViewSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(queryset=Session.objects.all(), source='session', write_only=True)
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user', write_only=True)

    class Meta:
        model = ContentView
        fields = [
            'id', 'session', 'session_id', 'user', 'user_id',
            'content_type', 'content_id', 'started_at', 'ended_at', 'duration_seconds'
        ]
        read_only_fields = ['id', 'session', 'user', 'started_at']


class D2RResultSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(queryset=Session.objects.all(), source='session', write_only=True)
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user', write_only=True)

    class Meta:
        model = D2RResult
        fields = [
            'id', 'session', 'session_id', 'user', 'user_id',
            'raw_score', 'processing_speed', 'attention_span', 'errors', 'phase_data', 'created_at'
        ]
        read_only_fields = ['id', 'session', 'user', 'created_at']


class QuizAttemptSerializer(serializers.ModelSerializer):
    session = SessionSerializer(read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(queryset=Session.objects.all(), source='session', write_only=True)
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user', write_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'session', 'session_id', 'user', 'user_id',
            'difficulty', 'score', 'reason', 'created_at'
        ]
        read_only_fields = ['id', 'session', 'user', 'created_at']
