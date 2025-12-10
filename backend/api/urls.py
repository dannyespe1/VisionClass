from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'sessions', views.SessionViewSet, basename='session')
router.register(r'attention-events', views.AttentionEventViewSet, basename='attention-event')
router.register(r'content-views', views.ContentViewSet, basename='content-view')
router.register(r'd2r-results', views.D2RResultViewSet, basename='d2r-result')
router.register(r'quiz-attempts', views.QuizAttemptViewSet, basename='quiz-attempt')


urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
    path('me/', views.MeView.as_view(), name='me'),
    path('recommendations/difficulty/', views.RecommendDifficultyView.as_view(), name='recommend_difficulty'),
    path('ai/generate-test/', views.GenerateTestView.as_view(), name='generate_test'),
]
