from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    Course,
    CourseLesson,
    CourseMaterial,
    CourseModule,
    Enrollment,
    QuizAttempt,
    Session,
    User,
)


def quiz_metadata(**overrides):
    metadata = {
        "schema_version": "1.0",
        "difficulty": "media",
        "passing_score": 70,
        "questions": [
            {
                "id": "q1",
                "question": "¿Cuál es el resultado de 2 + 2?",
                "options": ["3", "4", "5", "6"],
                "answer_index": 1,
                "explanation": "Dos más dos es cuatro.",
                "source_ref": "Lectura 1",
            },
            {
                "id": "q2",
                "question": "Selecciona una palabra reservada de Python.",
                "options": ["print", "while", "length", "main"],
                "answer": "while",
            },
        ],
    }
    metadata.update(overrides)
    return metadata


class SecureQuizImportTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username="quiz-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.other_teacher = User.objects.create_user(
            username="other-quiz-teacher", password="test-only", role=User.ROLE_TEACHER
        )
        self.student = User.objects.create_user(
            username="quiz-student", password="test-only", role=User.ROLE_STUDENT
        )
        self.course = Course.objects.create(title="Curso seguro", owner=self.teacher)
        self.module = CourseModule.objects.create(course=self.course, title="Módulo", order=1)
        self.lesson = CourseLesson.objects.create(module=self.module, title="Lección", order=1)
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            status=Enrollment.STATUS_ACTIVE,
        )
        self.session = Session.objects.create(
            course=self.course,
            student=self.student,
            created_by=self.student,
            started_at=timezone.now(),
        )

    def _create_quiz(self, metadata=None):
        return CourseMaterial.objects.create(
            lesson=self.lesson,
            material_type=CourseMaterial.TYPE_TEST,
            title="Prueba importada",
            metadata=metadata or quiz_metadata(),
        )

    def test_teacher_imports_and_normalizes_quiz_json(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.post(
            reverse("course-material-list"),
            {
                "lesson_id": self.lesson.id,
                "material_type": CourseMaterial.TYPE_TEST,
                "title": "Prueba importada",
                "url": "https://example.invalid/no-debe-persistirse",
                "metadata": quiz_metadata(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        material = CourseMaterial.objects.get(pk=response.data["id"])
        self.assertEqual(material.url, "")
        self.assertEqual(material.metadata["questions"][0]["answer_index"], 1)
        self.assertEqual(material.metadata["questions"][1]["answer_index"], 1)

    def test_student_payload_never_exposes_answers_or_explanations(self):
        quiz = self._create_quiz()
        self.client.force_authenticate(self.student)

        response = self.client.get(reverse("course-material-detail", args=[quiz.id]))

        self.assertEqual(response.status_code, 200)
        question = response.data["metadata"]["questions"][0]
        self.assertNotIn("answer", question)
        self.assertNotIn("answer_index", question)
        self.assertNotIn("explanation", question)
        self.assertNotIn("source_ref", question)

    def test_student_submission_is_graded_on_server(self):
        quiz = self._create_quiz()
        self.client.force_authenticate(self.student)

        response = self.client.post(
            reverse("course-material-submit", args=[quiz.id]),
            {
                "session_id": self.session.id,
                "answers": [1, 0],
                "score": 100,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["score"], 50)
        self.assertEqual(response.data["correct"], 1)
        attempt = QuizAttempt.objects.get(pk=response.data["attempt_id"])
        self.assertEqual(attempt.score, 50)
        self.assertEqual(attempt.material, quiz)

    def test_submission_requires_all_answers(self):
        quiz = self._create_quiz()
        self.client.force_authenticate(self.student)

        response = self.client.post(
            reverse("course-material-submit", args=[quiz.id]),
            {"session_id": self.session.id, "answers": [1]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(QuizAttempt.objects.count(), 0)

    def test_submission_rejects_quiz_from_another_course_session(self):
        other_course = Course.objects.create(title="Otro curso", owner=self.teacher)
        other_module = CourseModule.objects.create(course=other_course, title="Otro módulo", order=1)
        other_lesson = CourseLesson.objects.create(module=other_module, title="Otra lección", order=1)
        other_quiz = CourseMaterial.objects.create(
            lesson=other_lesson,
            material_type=CourseMaterial.TYPE_TEST,
            title="Prueba ajena",
            metadata=quiz_metadata(),
        )
        Enrollment.objects.create(
            user=self.student,
            course=other_course,
            status=Enrollment.STATUS_ACTIVE,
        )
        self.client.force_authenticate(self.student)

        response = self.client.post(
            reverse("course-material-submit", args=[other_quiz.id]),
            {"session_id": self.session.id, "answers": [1, 1]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(QuizAttempt.objects.count(), 0)

    def test_invalid_quiz_contract_is_rejected(self):
        invalid = quiz_metadata()
        invalid["questions"][0]["options"] = ["A", "A", "B", "C"]
        self.client.force_authenticate(self.teacher)

        response = self.client.post(
            reverse("course-material-list"),
            {
                "lesson_id": self.lesson.id,
                "material_type": CourseMaterial.TYPE_TEST,
                "title": "Prueba inválida",
                "metadata": invalid,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("metadata", response.data)

    def test_teacher_cannot_import_into_another_teachers_lesson(self):
        self.client.force_authenticate(self.other_teacher)

        response = self.client.post(
            reverse("course-material-list"),
            {
                "lesson_id": self.lesson.id,
                "material_type": CourseMaterial.TYPE_TEST,
                "title": "Prueba fuera de alcance",
                "metadata": quiz_metadata(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("lesson_id", response.data)

    def test_student_cannot_manage_materials(self):
        quiz = self._create_quiz()
        self.client.force_authenticate(self.student)

        create_response = self.client.post(
            reverse("course-material-list"),
            {
                "lesson_id": self.lesson.id,
                "material_type": CourseMaterial.TYPE_TEST,
                "title": "Prueba manipulada",
                "metadata": quiz_metadata(),
            },
            format="json",
        )
        update_response = self.client.patch(
            reverse("course-material-detail", args=[quiz.id]),
            {"title": "Manipulada"},
            format="json",
        )
        delete_response = self.client.delete(
            reverse("course-material-detail", args=[quiz.id])
        )

        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)
        self.assertEqual(delete_response.status_code, 403)
