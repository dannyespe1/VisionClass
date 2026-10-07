# Importación de pruebas JSON v1

VisionClass permite crear una prueba fuera de la plataforma e importarla desde el panel docente. El archivo se valida en el backend y las respuestas correctas nunca se entregan al estudiante. La calificación se calcula exclusivamente en el servidor.

## Contrato

```json
{
  "schema_version": "1.0",
  "title": "Prueba del módulo 1",
  "description": "Evaluación de reforzamiento",
  "difficulty": "media",
  "passing_score": 70,
  "questions": [
    {
      "id": "q1",
      "question": "¿Cuál es el resultado de 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "answer_index": 1,
      "difficulty": "baja",
      "explanation": "Dos más dos es cuatro.",
      "source_ref": "Lectura 1"
    }
  ]
}
```

Reglas principales:

- `schema_version` debe ser `1.0`.
- Se admiten entre 1 y 20 preguntas.
- Cada pregunta debe incluir exactamente cuatro opciones distintas.
- `answer_index` usa índices de 0 a 3. Por compatibilidad también se acepta `answer` con el texto exacto de una opción.
- `difficulty` admite `baja`, `media` o `alta`.
- `passing_score` debe estar entre 0 y 100.
- El archivo no puede superar 256 KB en el navegador; el backend vuelve a validar todo el contenido.

## Flujo y seguridad

1. El docente descarga la plantilla o selecciona un JSON desde **Materiales**.
2. El backend normaliza y guarda el contrato dentro del material de tipo `test`.
3. La API elimina `answer`, `answer_index`, `explanation` y `source_ref` de la respuesta destinada al estudiante.
4. El estudiante envía únicamente `session_id` y los índices seleccionados a `POST /api/course-materials/{id}/submit/`.
5. El backend valida identidad, matrícula, sesión y pertenencia de la prueba al curso, calcula la nota y crea `QuizAttempt`.
6. `POST /api/quiz-attempts/` permanece deshabilitado para impedir notas suministradas por el cliente. Los intentos históricos siguen disponibles por lectura para reportes.

## Compatibilidad y rollback

Las pruebas antiguas que contienen `answer` continúan siendo válidas. No se añade una migración de base de datos: el contrato usa el campo JSON existente y la relación `QuizAttempt.material` existente.

Para rollback, se puede revertir este cambio de aplicación sin transformar registros. Antes de hacerlo debe verificarse que el frontend restaurado conozca el formato histórico y debe mantenerse bloqueada cualquier ruta que acepte una nota calculada por el cliente.
