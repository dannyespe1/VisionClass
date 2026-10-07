from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Course, CourseLesson, CourseMaterial, CourseModule, Enrollment, QuizAttempt, Session, User


class QuizAttemptMaterialTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username="grades-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.student = User.objects.create_user(
            username="grades-student", password="test-only", role=User.ROLE_STUDENT
        )
        self.course = Course.objects.create(title="Curso", owner=self.teacher)
        Enrollment.objects.create(user=self.student, course=self.course)
        self.module = CourseModule.objects.create(course=self.course, title="Módulo 1", order=1)
        self.lesson = CourseLesson.objects.create(module=self.module, title="Pruebas", order=1)
        self.quiz = CourseMaterial.objects.create(
            lesson=self.lesson,
            material_type=CourseMaterial.TYPE_TEST,
            title="Prueba 1",
        )
        self.session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )
        self.client.force_authenticate(self.student)

    def test_direct_attempt_creation_is_disabled(self):
        response = self.client.post(
            reverse("quiz-attempt-list"),
            {
                "session_id": self.session.id,
                "material_id": self.quiz.id,
                "score": 100,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 405)
        self.assertEqual(QuizAttempt.objects.count(), 0)

    def test_teacher_only_lists_attempts_from_owned_courses(self):
        QuizAttempt.objects.create(
            session=self.session,
            user=self.student,
            material=self.quiz,
            score=90,
        )
        other_teacher = User.objects.create_user(
            username="other-grades-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        other_student = User.objects.create_user(
            username="other-grades-student", password="test-only", role=User.ROLE_STUDENT
        )
        other_course = Course.objects.create(title="Curso ajeno", owner=other_teacher)
        other_session = Session.objects.create(
            course=other_course,
            student=other_student,
            created_by=other_student,
            started_at=timezone.now(),
        )
        QuizAttempt.objects.create(session=other_session, user=other_student, score=100)

        self.client.force_authenticate(self.teacher)
        response = self.client.get(reverse("quiz-attempt-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["session"]["course"]["id"], self.course.id)
