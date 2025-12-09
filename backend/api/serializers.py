from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Course, Enrollment, Session, AttentionEvent, ContentView, D2RResult, QuizAttempt

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


class EnrollmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), source='course', write_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'user', 'course', 'course_id', 'status', 'created_at']
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
            'raw_score', 'processing_speed', 'attention_span', 'errors', 'created_at'
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
