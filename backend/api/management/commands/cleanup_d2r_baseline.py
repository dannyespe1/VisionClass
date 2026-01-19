from django.core.management.base import BaseCommand

from api.models import Course, Enrollment, Session, AttentionEvent, CourseModule, CourseLesson, CourseMaterial


class Command(BaseCommand):
    help = "Elimina cursos Baseline D2R y todos sus datos relacionados."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Solo muestra el conteo sin borrar.")

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        courses = Course.objects.filter(title__iexact="baseline d2r")
        course_ids = list(courses.values_list("id", flat=True))
        if not course_ids:
            self.stdout.write("No hay cursos Baseline D2R para eliminar.")
            return

        counts = {
            "courses": courses.count(),
            "modules": CourseModule.objects.filter(course_id__in=course_ids).count(),
            "lessons": CourseLesson.objects.filter(module__course_id__in=course_ids).count(),
            "materials": CourseMaterial.objects.filter(lesson__module__course_id__in=course_ids).count(),
            "enrollments": Enrollment.objects.filter(course_id__in=course_ids).count(),
            "sessions": Session.objects.filter(course_id__in=course_ids).count(),
            "attention_events": AttentionEvent.objects.filter(session__course_id__in=course_ids).count(),
        }

        if dry_run:
            summary = ", ".join([f"{key}={value}" for key, value in counts.items()])
            self.stdout.write(f"Se eliminarian: {summary}")
            return

        AttentionEvent.objects.filter(session__course_id__in=course_ids).delete()
        Session.objects.filter(course_id__in=course_ids).delete()
        Enrollment.objects.filter(course_id__in=course_ids).delete()
        CourseMaterial.objects.filter(lesson__module__course_id__in=course_ids).delete()
        CourseLesson.objects.filter(module__course_id__in=course_ids).delete()
        CourseModule.objects.filter(course_id__in=course_ids).delete()
        courses.delete()
        summary = ", ".join([f"{key}={value}" for key, value in counts.items()])
        self.stdout.write(f"Eliminado: {summary}")
