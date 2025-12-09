from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, mixins, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action

from .models import (
    Course,
    Enrollment,
    Session,
    AttentionEvent,
    User,
    ContentView,
    D2RResult,
    QuizAttempt,
)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    SessionSerializer,
    AttentionEventSerializer,
    ContentViewSerializer,
    D2RResultSerializer,
    QuizAttemptSerializer,
)

UserModel = get_user_model()


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
        return Course.objects.all()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


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
        serializer.save(user=self.request.user)


class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return Session.objects.all()
        if user.role == User.ROLE_TEACHER:
            return Session.objects.filter(course__owner=user)
        return Session.objects.filter(student=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            raise permissions.PermissionDenied("Solo profesores o administradores pueden crear sesiones.")
        serializer.save(created_by=user)


class AttentionEventViewSet(viewsets.ModelViewSet):
    serializer_class = AttentionEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return AttentionEvent.objects.all()
        if user.role == User.ROLE_TEACHER:
            return AttentionEvent.objects.filter(session__course__owner=user)
        return AttentionEvent.objects.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        target_user = serializer.validated_data.get('user')
        session = serializer.validated_data.get('session')
        if target_user != user and user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            raise permissions.PermissionDenied("No puedes registrar eventos para otros usuarios.")
        if session and target_user != session.student and user.role not in [User.ROLE_TEACHER, User.ROLE_ADMIN]:
            raise permissions.PermissionDenied("El evento debe corresponder al estudiante de la sesión.")
        event = serializer.save()

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
        serializer.save(user=self.request.user)


class D2RResultViewSet(viewsets.ModelViewSet):
    serializer_class = D2RResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            return D2RResult.objects.all()
        if user.role == User.ROLE_TEACHER:
            return D2RResult.objects.filter(session__course__owner=user)
        return D2RResult.objects.filter(user=user)

    def perform_create(self, serializer):
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
        serializer.save(user=self.request.user)


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
