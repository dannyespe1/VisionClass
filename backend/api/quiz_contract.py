from __future__ import annotations

from typing import Any


QUIZ_SCHEMA_VERSION = "1.0"
MAX_QUESTIONS = 20
QUESTION_MAX_LENGTH = 1000
OPTION_MAX_LENGTH = 500
EXPLANATION_MAX_LENGTH = 2000
SOURCE_REF_MAX_LENGTH = 255
ALLOWED_DIFFICULTIES = {"baja", "media", "alta"}


class QuizContractError(ValueError):
    pass


def _clean_text(value: Any, field: str, max_length: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise QuizContractError(f"{field} es obligatorio.")
    cleaned = value.strip()
    if len(cleaned) > max_length:
        raise QuizContractError(f"{field} supera el máximo de {max_length} caracteres.")
    return cleaned


def _optional_text(value: Any, field: str, max_length: int) -> str:
    if value in (None, ""):
        return ""
    if not isinstance(value, str):
        raise QuizContractError(f"{field} debe ser texto.")
    cleaned = value.strip()
    if len(cleaned) > max_length:
        raise QuizContractError(f"{field} supera el máximo de {max_length} caracteres.")
    return cleaned


def _answer_index(question: dict[str, Any], options: list[str], index: int) -> int:
    raw_index = question.get("answer_index")
    if isinstance(raw_index, bool):
        raw_index = None
    if isinstance(raw_index, int):
        if 0 <= raw_index < len(options):
            return raw_index
        raise QuizContractError(f"questions[{index}].answer_index debe estar entre 0 y 3.")

    answer = question.get("answer", question.get("correct_answer"))
    if not isinstance(answer, str) or not answer.strip():
        raise QuizContractError(
            f"questions[{index}] debe incluir answer_index o una respuesta correcta."
        )
    normalized_answer = answer.strip().casefold()
    for option_index, option in enumerate(options):
        if option.casefold() == normalized_answer:
            return option_index
    raise QuizContractError(
        f"questions[{index}].answer debe coincidir con una de sus opciones."
    )


def normalize_quiz_metadata(raw_metadata: Any) -> dict[str, Any]:
    if not isinstance(raw_metadata, dict):
        raise QuizContractError("metadata debe ser un objeto JSON.")

    schema_version = str(raw_metadata.get("schema_version") or QUIZ_SCHEMA_VERSION).strip()
    if schema_version != QUIZ_SCHEMA_VERSION:
        raise QuizContractError(
            f"schema_version no compatible. Se requiere {QUIZ_SCHEMA_VERSION}."
        )

    raw_questions = raw_metadata.get("questions")
    if not isinstance(raw_questions, list) or not raw_questions:
        raise QuizContractError("questions debe contener al menos una pregunta.")
    if len(raw_questions) > MAX_QUESTIONS:
        raise QuizContractError(f"questions no puede superar {MAX_QUESTIONS} elementos.")

    default_difficulty = str(raw_metadata.get("difficulty") or "media").strip().lower()
    if default_difficulty not in ALLOWED_DIFFICULTIES:
        raise QuizContractError("difficulty debe ser baja, media o alta.")

    passing_score = raw_metadata.get("passing_score", 70)
    if isinstance(passing_score, bool):
        raise QuizContractError("passing_score debe ser un número entre 0 y 100.")
    try:
        passing_score = int(passing_score)
    except (TypeError, ValueError) as exc:
        raise QuizContractError("passing_score debe ser un número entre 0 y 100.") from exc
    if not 0 <= passing_score <= 100:
        raise QuizContractError("passing_score debe estar entre 0 y 100.")

    normalized_questions: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, raw_question in enumerate(raw_questions):
        if not isinstance(raw_question, dict):
            raise QuizContractError(f"questions[{index}] debe ser un objeto.")

        question_id = str(raw_question.get("id") or f"q{index + 1}").strip()
        if not question_id or len(question_id) > 64:
            raise QuizContractError(f"questions[{index}].id no es válido.")
        if question_id in seen_ids:
            raise QuizContractError(f"El id de pregunta {question_id} está repetido.")
        seen_ids.add(question_id)

        prompt = _clean_text(
            raw_question.get("question"),
            f"questions[{index}].question",
            QUESTION_MAX_LENGTH,
        )
        raw_options = raw_question.get("options")
        if not isinstance(raw_options, list) or len(raw_options) != 4:
            raise QuizContractError(f"questions[{index}].options debe contener 4 opciones.")
        options = [
            _clean_text(option, f"questions[{index}].options[{option_index}]", OPTION_MAX_LENGTH)
            for option_index, option in enumerate(raw_options)
        ]
        if len({option.casefold() for option in options}) != len(options):
            raise QuizContractError(f"questions[{index}].options contiene opciones repetidas.")

        correct_index = _answer_index(raw_question, options, index)
        difficulty = str(raw_question.get("difficulty") or default_difficulty).strip().lower()
        if difficulty not in ALLOWED_DIFFICULTIES:
            raise QuizContractError(
                f"questions[{index}].difficulty debe ser baja, media o alta."
            )

        normalized_question: dict[str, Any] = {
            "id": question_id,
            "question": prompt,
            "options": options,
            "answer_index": correct_index,
            # Se conserva para compatibilidad con pruebas generadas anteriormente.
            "answer": options[correct_index],
            "difficulty": difficulty,
        }
        explanation = _optional_text(
            raw_question.get("explanation"),
            f"questions[{index}].explanation",
            EXPLANATION_MAX_LENGTH,
        )
        source_ref = _optional_text(
            raw_question.get("source_ref"),
            f"questions[{index}].source_ref",
            SOURCE_REF_MAX_LENGTH,
        )
        if explanation:
            normalized_question["explanation"] = explanation
        if source_ref:
            normalized_question["source_ref"] = source_ref
        normalized_questions.append(normalized_question)

    return {
        "schema_version": QUIZ_SCHEMA_VERSION,
        "difficulty": default_difficulty,
        "passing_score": passing_score,
        "questions": normalized_questions,
    }


def public_quiz_metadata(raw_metadata: Any) -> dict[str, Any]:
    normalized = normalize_quiz_metadata(raw_metadata)
    public_questions = []
    for question in normalized["questions"]:
        public_questions.append(
            {
                "id": question["id"],
                "question": question["question"],
                "options": question["options"],
                "difficulty": question["difficulty"],
            }
        )
    return {
        "schema_version": normalized["schema_version"],
        "difficulty": normalized["difficulty"],
        "passing_score": normalized["passing_score"],
        "questions": public_questions,
    }


def grade_quiz(raw_metadata: Any, answers: Any) -> dict[str, int | bool]:
    normalized = normalize_quiz_metadata(raw_metadata)
    questions = normalized["questions"]
    if not isinstance(answers, list) or len(answers) != len(questions):
        raise QuizContractError("Debe responder todas las preguntas antes de enviar.")

    correct = 0
    for index, (question, answer) in enumerate(zip(questions, answers)):
        if isinstance(answer, bool) or not isinstance(answer, int):
            raise QuizContractError(f"answers[{index}] debe ser el índice de una opción.")
        if answer < 0 or answer >= len(question["options"]):
            raise QuizContractError(f"answers[{index}] está fuera de rango.")
        if answer == question["answer_index"]:
            correct += 1

    total = len(questions)
    score = round((correct / total) * 100) if total else 0
    passing_score = normalized["passing_score"]
    return {
        "score": score,
        "correct": correct,
        "total": total,
        "passing_score": passing_score,
        "passed": score >= passing_score,
    }
