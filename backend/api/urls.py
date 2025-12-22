from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'course-modules', views.CourseModuleViewSet, basename='course-module')
router.register(r'course-lessons', views.CourseLessonViewSet, basename='course-lesson')
router.register(r'course-materials', views.CourseMaterialViewSet, basename='course-material')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'sessions', views.SessionViewSet, basename='session')
router.register(r'attention-events', views.AttentionEventViewSet, basename='attention-event')
router.register(r'content-views', views.ContentViewSet, basename='content-view')
router.register(r'd2r-results', views.D2RResultViewSet, basename='d2r-result')
router.register(r'quiz-attempts', views.QuizAttemptViewSet, basename='quiz-attempt')
router.register(r'd2r-schedules', views.D2RScheduleViewSet, basename='d2r-schedule')
router.register(r'student-reports', views.StudentReportViewSet, basename='student-report')
router.register(r'admin/users', views.AdminUserViewSet, basename='admin-user')
router.register(r'admin/courses', views.AdminCourseViewSet, basename='admin-course')
router.register(r'admin/research-permissions', views.AdminResearchPermissionViewSet, basename='admin-research')
router.register(r'admin/privacy-policies', views.AdminPrivacyPolicyViewSet, basename='admin-privacy')


urlpatterns = [
    path('auth/token/', views.EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/google/', views.GoogleLogin.as_view(), name='google_login'),
    path('', include(router.urls)),
    path('me/', views.MeView.as_view(), name='me'),
    path('student-metrics/', views.StudentMetricsView.as_view(), name='student_metrics'),
    path('exports/student-report/', views.StudentReportExportView.as_view(), name='student_report'),
    path('recommendations/difficulty/', views.RecommendDifficultyView.as_view(), name='recommend_difficulty'),
    path('ai/generate-test/', views.GenerateTestView.as_view(), name='generate_test'),
    path('notifications/test-email/', views.SendTestEmailView.as_view(), name='send_test_email'),
    path('admin/overview/', views.AdminOverviewView.as_view(), name='admin_overview'),
    path('admin/analytics/', views.AdminAnalyticsView.as_view(), name='admin_analytics'),
]
