# VisionClass - Documentacion del Proyecto

VisionClass es una plataforma web de atencion inteligente con frontend en Next.js, backend en Django/DRF y servicio ML en FastAPI (MediaPipe + heuristicas). La plataforma incluye paneles de estudiante, profesor y administrador, y un test D2R para calibracion atencional.

## Arquitectura

- Frontend: Next.js (app router), Tailwind/React.
- Backend: Django + DRF + JWT (SimpleJWT).
- ML: FastAPI + MediaPipe + heuristicas de atencion por frame (opcional CNN-LSTM via ONNX).
- Base de datos: PostgreSQL (Docker).
- Orquestacion: Docker Compose.

## Requisitos

- Docker y Docker Compose.
- Opcional: Node.js y Python si se desea correr fuera de contenedores.

## Puesta en marcha rapida (Docker)

```bash
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py create_default_admin
```

Servicios por defecto:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- ML: http://localhost:9000
- DB: localhost:5432

## Desarrollo local (sin Docker)

Backend:

```bash
cd backend
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

ML:

```bash
cd ml
pip install -r requirements.txt
python ml_service.py
```

## Variables de entorno

Nota: evita commitear secretos. Usa `.env` locales.

Backend (Django):

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`
- `SITE_ID`
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL`
- `GOOGLE_API_KEY` (generacion de tests IA)
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_BASE_URL`, `MAILGUN_FROM_EMAIL`

Frontend (Next.js):

- `NEXT_PUBLIC_BACKEND_URL` (default: http://localhost:8000)
- `NEXT_PUBLIC_ML_URL` (default: http://localhost:9000)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`

ML (FastAPI):

- `BACKEND_URL` (default: http://backend:8000)
- `BACKEND_TOKEN` (JWT para postear eventos)
- `SEQUENCE_LENGTH` (default: 16)
- `MODEL_PATH` (default: checkpoints/cnn_lstm.onnx)
- `MODEL_IMG_SIZE` (default: 224)
- `CORS_ORIGINS`
- `SAVE_FRAMES` (0/1)
- `FRAMES_DIR` (default: data/frames)
- `TRAIN_ON_START` (0/1, si es 1 intenta entrenar al iniciar)
- `TRAINING_SCRIPT` (default: train_model.py)
- `TRAIN_DATASET` (default: data/frames_dataset.parquet)
- `TRAIN_EPOCHS`, `TRAIN_BATCH_SIZE`, `TRAIN_LR`

## Autenticacion y roles

Roles disponibles en backend: `student`, `teacher`, `admin`.
El login se realiza via JWT (email) o Google OAuth.

Endpoints de autenticacion:

- `POST /api/auth/token/` (login con email/username)
- `POST /api/auth/token/refresh/`
- `POST /api/auth/google/`
- `GET /api/me/` (perfil y rol)

## Rutas principales (frontend)

- `/` landing
- `/login`
- `/student`
- `/instructor`
- `/admin`
- `/d2r` (test D2R)
- `/privacidad`, `/terminos`, `/seguridad`, `/documentacion`

## Test D2R

- 14 fases, 15s por fase (configurable en `frontend/app/d2r/page.tsx`).
- 47 celdas fijas por fase (definido en `frontend/app/d2r/test-widget.tsx`).
- Se marcan solo las "d" con exactamente dos rayitas (arriba, abajo o divididas).
- Usa camara para estimar atencion (sin guardar video). Los frames se envian a `/api/attention-proxy`.
- Los resultados se guardan en `D2RResult` y alimentan metricas del estudiante.

## Backend: endpoints core

Recursos principales (DRF):

- `GET/POST /api/users/`
- `GET/POST /api/courses/`
- `GET/POST /api/course-modules/`
- `GET/POST /api/course-lessons/`
- `GET/POST /api/course-materials/` y `GET /api/course-materials/{id}/download/`
- `GET/POST /api/enrollments/`
- `GET/POST /api/sessions/`
- `GET/POST /api/attention-events/`
- `GET/POST /api/content-views/`
- `GET/POST /api/d2r-results/`
- `GET/POST /api/quiz-attempts/`
- `GET/POST /api/d2r-schedules/`
- `GET/POST /api/student-reports/`
- `GET /api/student-metrics/`
- `GET /api/exports/student-report/?export=pdf|csv|xlsx`
- `POST /api/recommendations/difficulty/`
- `POST /api/ai/generate-test/`
- `POST /api/notifications/test-email/`

## Backend: endpoints admin

- `GET /api/admin/overview/`
- `GET/POST /api/admin/users/`
- `PATCH/DELETE /api/admin/users/{id}/`
- `GET/POST /api/admin/courses/`
- `PATCH/DELETE /api/admin/courses/{id}/`
- `GET /api/admin/analytics/`
- `GET/POST/PATCH /api/admin/privacy-policies/`
- `GET/POST/PATCH /api/admin/research-permissions/`

Notas:

- `admin/users` devuelve: `id, name, email, role, status, courses`.
- `admin/courses` devuelve: `id, title, category, instructor, students, status`.
- `admin/analytics` agrega metricas por categoria (usada como "facultad").
- `privacy-policies` y `research-permissions` se guardan en BD.

## Backend: permisos

Endpoints admin requieren usuario con `role=admin` o `is_staff/is_superuser`.

## Migraciones

Cada cambio de modelos requiere migracion:

```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

## Troubleshooting

- Si el admin no abre panel: verificar rol y permisos en `/api/me/`.
- Si el test D2R no inicia: revisar permisos de camara y disponibilidad de `/api/attention-proxy`.
- Si faltan politicas de privacidad: el endpoint de analytics crea defaults si no existen.

## Entrenamiento de modelo (opcional)

1. Activar captura de frames:
   - `SAVE_FRAMES=1` y `FRAMES_DIR=/app/data/frames`
2. Exportar dataset en backend:
   - `python manage.py export_d2r_frames_dataset --out data/frames_dataset.parquet`
3. Entrenar en ML:
   - `python train_model.py` (genera ONNX en `MODEL_PATH`)

## Despliegue en Render

1. Backend:
   - Configurar variables de entorno (ver `backend/.env.example`).
   - Ejecutar migraciones y `collectstatic`.
2. ML:
   - Configurar `BACKEND_URL`, `BACKEND_TOKEN`, `MODEL_PATH`.
3. Frontend:
   - Configurar `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_ML_URL`, `ML_SERVICE_URL`.

## Configuracion de OAuth en Render

Para habilitar Google OAuth en Render, sigue estos pasos:

### 1. Crear proyecto en Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto
3. Habilitar "Google+ API"
4. Crear credenciales OAuth 2.0:
   - Pantalla de consentimiento: Completar con nombre de app (VisionClass)
   - Crear credencial tipo "OAuth 2.0 Client ID" para aplicacion web
   - Authorized redirect URIs:
     - `https://visionclass-frontend.onrender.com/login`
     - `http://localhost:3000/login` (para desarrollo local)

### 2. Configurar variables en Render

En el dashboard de Render, agregar las siguientes variables de entorno:

**Backend (visionclass-backend):**

- `GOOGLE_OAUTH_CLIENT_ID`: El Client ID de Google Cloud
- `GOOGLE_OAUTH_CLIENT_SECRET`: El Client Secret de Google Cloud
- `GOOGLE_OAUTH_CALLBACK_URL`: `https://visionclass-frontend.onrender.com/login`

**Frontend (visionclass-frontend):**

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: El Client ID de Google Cloud (mismo que backend)
- `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`: `https://visionclass-frontend.onrender.com/login`

### 3. Redeploy

1. Hacer push de los cambios (incluyendo `render.yaml`)
2. Render detectara automaticamente y desplegara con las nuevas variables
3. Probar el flujo de login en https://visionclass-frontend.onrender.com/login

### Desarrollo Local con OAuth

Para probar OAuth localmente:

**Backend (.env):**

```
GOOGLE_OAUTH_CLIENT_ID=<from_google_cloud>
GOOGLE_OAUTH_CLIENT_SECRET=<from_google_cloud>
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:3000/login
```

**Frontend (.env.local):**

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<from_google_cloud>
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/login
```

## Token de servicio ML

Para generar un usuario de servicio y JWT:

```bash
python manage.py create_ml_service_user
```

Puedes definir:

- `ML_SERVICE_EMAIL`
- `ML_SERVICE_PASSWORD`
- `ML_SERVICE_ROLE` (default: admin)
