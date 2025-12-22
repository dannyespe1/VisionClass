from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.http import HttpRequest, HttpResponseBadRequest
from django.urls import NoReverseMatch, reverse
from django.contrib.auth import get_user_model as get_auth_user_model
from django.db import IntegrityError
from requests.exceptions import HTTPError
from allauth.account import app_settings as allauth_account_settings
from allauth.socialaccount.helpers import complete_social_login
from dj_rest_auth.registration.serializers import SocialLoginSerializer
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
import inspect
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Course,
    Enrollment,
    Session,
    AttentionEvent,
    ContentView,
    D2RResult,
    QuizAttempt,
    D2RSchedule,
    StudentReport,
    CourseModule,
    CourseLesson,
    CourseMaterial,
    ResearchAccessRequest,
    PrivacyPolicySetting,
)

User = get_user_model()
AuthUser = get_auth_user_model()


class GoogleSocialLoginSerializer(SocialLoginSerializer):
    def validate(self, attrs):
        view = self.context.get('view')
        request = self._get_request()

        if not view:
            raise serializers.ValidationError(
                'View is not defined, pass it as a context variable'
            )

        adapter_class = getattr(view, 'adapter_class', None)
        if not adapter_class:
            raise serializers.ValidationError('Define adapter_class in view')

        adapter = adapter_class(request)
        app = adapter.get_provider().app

        access_token = attrs.get('access_token')
        code = attrs.get('code')

        if access_token:
            tokens_to_parse = {'access_token': access_token}
            token = access_token
            id_token = attrs.get('id_token')
            if id_token:
                tokens_to_parse['id_token'] = id_token
        elif code:
            self.set_callback_url(view=view, adapter_class=adapter_class)
            redirect_uri = None
            if request:
                redirect_uri = request.data.get("redirect_uri")
            if redirect_uri:
                self.callback_url = redirect_uri
            self.client_class = getattr(view, 'client_class', None)

            if not self.client_class:
                raise serializers.ValidationError('Define client_class in view')

            provider = adapter.get_provider()
            try:
                scope = provider.get_scope(request)
            except TypeError:
                scope = provider.get_scope()

            client = self._build_oauth_client(
                request=request,
                app=app,
                adapter=adapter,
            )
            try:
                token = client.get_access_token(code)
            except OAuth2Error as ex:
                raise serializers.ValidationError(
                    'Failed to exchange code for access token'
                ) from ex
            access_token = token['access_token']
            tokens_to_parse = {'access_token': access_token}

            for key in ['refresh_token', 'id_token', adapter.expires_in_key]:
                if key in token:
                    tokens_to_parse[key] = token[key]
        else:
            raise serializers.ValidationError(
                'Incorrect input. access_token or code is required.'
            )

        social_token = adapter.parse_token(tokens_to_parse)
        social_token.app = app

        try:
            if adapter.provider_id == 'google' and not code:
                login = self.get_social_login(adapter, app, social_token, response={'id_token': id_token})
            else:
                login = self.get_social_login(adapter, app, social_token, token)
            ret = complete_social_login(request, login)
        except HTTPError:
            raise serializers.ValidationError('Incorrect value')

        if isinstance(ret, HttpResponseBadRequest):
            raise serializers.ValidationError(ret.content)

        if not login.is_existing:
            if allauth_account_settings.UNIQUE_EMAIL:
                account_exists = AuthUser.objects.filter(
                    email=login.user.email,
                ).exists()
                if account_exists:
                    raise serializers.ValidationError(
                        'User is already registered with this e-mail address.'
                    )

            login.lookup()
            try:
                login.save(request, connect=True)
            except IntegrityError as ex:
                raise serializers.ValidationError(
                    'User is already registered with this e-mail address.'
                ) from ex
            self.post_signup(login, attrs)

        attrs['user'] = login.account.user

        return attrs

    def _build_oauth_client(self, request, app, adapter):
        return self.client_class(
            request,
            app.client_id,
            app.secret,
            adapter.access_token_method,
            adapter.access_token_url,
            self.callback_url,
            scope_delimiter=adapter.scope_delimiter,
            headers=adapter.headers,
            basic_auth=adapter.basic_auth,
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'profile_image',
            'is_staff',
            'is_superuser',
        ]
        read_only_fields = ['id', 'is_staff', 'is_superuser']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.get('email')
        if email:
            validated_data['username'] = email
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get("username") or attrs.get("email")
        if username and "@" in username:
            try:
                user = User.objects.get(email__iexact=username)
                attrs["username"] = user.get_username()
            except User.DoesNotExist:
                attrs["username"] = username
        return super().validate(attrs)


class CourseSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'category', 'owner', 'created_at', 'is_active']
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


class D2RScheduleSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user', write_only=True, required=False)

    class Meta:
        model = D2RSchedule
        fields = ['id', 'user', 'user_id', 'scheduled_for', 'status', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class StudentReportSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user', write_only=True, required=False)

    class Meta:
        model = StudentReport
        fields = ['id', 'user', 'user_id', 'payload', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class AdminUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    role = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True, write_only=True)
    courses = serializers.SerializerMethodField(read_only=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'status', 'courses', 'password']
        read_only_fields = ['id', 'courses']

    def get_courses(self, obj):
        return obj.enrollments.exclude(course__title__iexact="baseline d2r").count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["name"] = self._display_name(instance)
        data["role"] = self._role_to_label(instance.role)
        data["status"] = "active" if instance.is_active else "inactive"
        return data

    def _display_name(self, instance):
        name = f"{instance.first_name} {instance.last_name}".strip()
        return name or instance.username or instance.email or ""

    def _role_to_label(self, role_value):
        mapping = {
            User.ROLE_STUDENT: "estudiante",
            User.ROLE_TEACHER: "profesor",
            User.ROLE_ADMIN: "admin",
        }
        return mapping.get(role_value, role_value)

    def _label_to_role(self, label):
        mapping = {
            "estudiante": User.ROLE_STUDENT,
            "profesor": User.ROLE_TEACHER,
            "admin": User.ROLE_ADMIN,
        }
        return mapping.get(label, label)

    def _apply_name(self, instance, name_value):
        name_value = (name_value or "").strip()
        if not name_value:
            return
        parts = name_value.split()
        instance.first_name = parts[0]
        instance.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

    def _apply_role(self, instance, role_value):
        if not role_value:
            return
        normalized = self._label_to_role(role_value.lower())
        if normalized in dict(User.ROLE_CHOICES):
            instance.role = normalized

    def _apply_status(self, instance, status_value):
        if not status_value:
            return
        instance.is_active = status_value.lower() == "active"

    def create(self, validated_data):
        name = validated_data.pop("name", "")
        role_value = validated_data.pop("role", "")
        status_value = validated_data.pop("status", "")
        password = validated_data.pop("password", "")
        email = validated_data.get("email", "")
        if email:
            validated_data["username"] = email
        user = User(**validated_data)
        self._apply_name(user, name)
        self._apply_role(user, role_value)
        self._apply_status(user, status_value)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        name = validated_data.pop("name", "")
        role_value = validated_data.pop("role", "")
        status_value = validated_data.pop("status", "")
        password = validated_data.pop("password", "")
        self._apply_name(instance, name)
        self._apply_role(instance, role_value)
        self._apply_status(instance, status_value)
        if "email" in validated_data:
            instance.username = validated_data.get("email") or instance.username
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)


class AdminCourseSerializer(serializers.ModelSerializer):
    instructor = serializers.SerializerMethodField(read_only=True)
    students = serializers.SerializerMethodField(read_only=True)
    status = serializers.SerializerMethodField(read_only=True)
    instructor_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="owner",
        write_only=True,
        required=False,
    )

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'category',
            'instructor',
            'instructor_email',
            'instructor_id',
            'students',
            'status',
        ]
        read_only_fields = ['id', 'instructor', 'students', 'status']

    def get_instructor(self, obj):
        name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return name or obj.owner.username or obj.owner.email or ""

    def get_students(self, obj):
        return obj.enrollments.exclude(course__title__iexact="baseline d2r").count()

    def get_status(self, obj):
        return "active" if obj.is_active else "inactive"

    def _apply_status(self, instance, status_value):
        if not status_value:
            return
        instance.is_active = status_value.lower() == "active"

    def create(self, validated_data):
        status_value = self.initial_data.get("status")
        validated_data.pop("instructor_email", None)
        if not validated_data.get("owner"):
            request = self.context.get("request")
            if request and request.user:
                validated_data["owner"] = request.user
        instance = super().create(validated_data)
        if status_value:
            self._apply_status(instance, status_value)
            instance.save(update_fields=["is_active"])
        return instance

    def update(self, instance, validated_data):
        status_value = self.initial_data.get("status")
        validated_data.pop("instructor_email", None)
        instance = super().update(instance, validated_data)
        if status_value:
            self._apply_status(instance, status_value)
            instance.save(update_fields=["is_active"])
        return instance


class ResearchAccessRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchAccessRequest
        fields = [
            'id',
            'researcher',
            'institution',
            'project',
            'data_requested',
            'status',
            'ethics_approval',
            'requested_at',
        ]
        read_only_fields = ['id', 'requested_at']


class PrivacyPolicySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyPolicySetting
        fields = ['id', 'name', 'description', 'current_value', 'options', 'updated_at']
        read_only_fields = ['id', 'updated_at']
