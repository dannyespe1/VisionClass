from django.urls import reverse
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
        self.pdf = CourseMaterial.objects.create(
            lesson=self.lesson,
            material_type=CourseMaterial.TYPE_PDF,
            title="Lectura",
        )
        self.session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
        )
        self.client.force_authenticate(self.student)

    def test_attempt_returns_material_module_context(self):
        response = self.client.post(
            reverse("quiz-attempt-list"),
            {
                "session_id": self.session.id,
                "material_id": self.quiz.id,
                "difficulty": "normal",
                "score": 85,
                "reason": self.quiz.title,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["material"]["id"], self.quiz.id)
        self.assertEqual(response.data["material"]["lesson"]["module"]["id"], self.module.id)

    def test_attempt_rejects_non_quiz_material(self):
        response = self.client.post(
            reverse("quiz-attempt-list"),
            {"session_id": self.session.id, "material_id": self.pdf.id, "score": 80},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("material_id", response.data)

    def test_attempt_rejects_quiz_from_another_course(self):
        other_course = Course.objects.create(title="Otro curso", owner=self.teacher)
        other_module = CourseModule.objects.create(course=other_course, title="Otro módulo", order=1)
        other_lesson = CourseLesson.objects.create(module=other_module, title="Otra lección", order=1)
        other_quiz = CourseMaterial.objects.create(
            lesson=other_lesson,
            material_type=CourseMaterial.TYPE_TEST,
            title="Quiz ajeno",
        )

        response = self.client.post(
            reverse("quiz-attempt-list"),
            {"session_id": self.session.id, "material_id": other_quiz.id, "score": 80},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("material_id", response.data)

    def test_legacy_attempt_without_material_remains_compatible(self):
        response = self.client.post(
            reverse("quiz-attempt-list"),
            {"session_id": self.session.id, "score": 75, "reason": "Evaluación anterior"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["material"])

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
        )
        QuizAttempt.objects.create(session=other_session, user=other_student, score=100)

        self.client.force_authenticate(self.teacher)
        response = self.client.get(reverse("quiz-attempt-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["session"]["course"]["id"], self.course.id)
