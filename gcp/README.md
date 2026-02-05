# Despliegue en Google Cloud (Cloud Run)

## 1) Servicios necesarios
- **Cloud Run** (3 servicios): `backend`, `frontend`, `ml`
- **Cloud SQL Postgres** (1 instancia)
- **Artifact Registry** (1 repositorio Docker)
- **Secret Manager** (para claves y credenciales)

## 2) Preparar Artifact Registry
```bash
gcloud artifacts repositories create visionclass \
  --repository-format=docker \
  --location=us-central1
```

## 3) Build de imágenes
```bash
gcloud builds submit --config cloudbuild.yaml
```

## 4) Crear Cloud SQL (Postgres)
```bash
gcloud sql instances create visionclass-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create vision_system --instance=visionclass-db

gcloud sql users set-password vision_user \
  --instance=visionclass-db \
  --password=TU_PASSWORD
```

## 5) Crear secretos (Secret Manager)
```bash
echo -n "DJANGO_SECRET_KEY" | gcloud secrets create DJANGO_SECRET_KEY --data-file=-
echo -n "GOOGLE_OAUTH_CLIENT_ID" | gcloud secrets create GOOGLE_OAUTH_CLIENT_ID --data-file=-
echo -n "GOOGLE_OAUTH_CLIENT_SECRET" | gcloud secrets create GOOGLE_OAUTH_CLIENT_SECRET --data-file=-
echo -n "MAILGUN_API_KEY" | gcloud secrets create MAILGUN_API_KEY --data-file=-
echo -n "BACKEND_TOKEN" | gcloud secrets create BACKEND_TOKEN --data-file=-
```

## 6) Deploy Cloud Run
### Backend
```bash
gcloud run deploy visionclass-backend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/visionclass/backend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances $PROJECT_ID:us-central1:visionclass-db \
  --set-env-vars DATABASE_URL=postgres://vision_user:TU_PASSWORD@/vision_system?host=/cloudsql/$PROJECT_ID:us-central1:visionclass-db \
  --set-env-vars DEBUG=False,ALLOWED_HOSTS=visionclass-backend-URL \
  --set-secrets SECRET_KEY=DJANGO_SECRET_KEY:latest,GOOGLE_OAUTH_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID:latest,GOOGLE_OAUTH_CLIENT_SECRET=GOOGLE_OAUTH_CLIENT_SECRET:latest,MAILGUN_API_KEY=MAILGUN_API_KEY:latest
```

### ML Service
```bash
gcloud run deploy visionclass-ml \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/visionclass/ml:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars BACKEND_URL=https://visionclass-backend-URL \
  --set-secrets BACKEND_TOKEN=BACKEND_TOKEN:latest
```

### Frontend
```bash
gcloud run deploy visionclass-frontend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/visionclass/frontend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_BACKEND_URL=https://visionclass-backend-URL,NEXT_PUBLIC_ML_URL=https://visionclass-ml-URL,ML_SERVICE_URL=https://visionclass-ml-URL,BACKEND_URL=https://visionclass-backend-URL
```

## 7) Migraciones
```bash
gcloud run jobs create visionclass-migrate \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/visionclass/backend:latest \
  --region us-central1 \
  --command "python" --args "manage.py","migrate" \
  --set-env-vars DATABASE_URL=postgres://vision_user:TU_PASSWORD@/vision_system?host=/cloudsql/$PROJECT_ID:us-central1:visionclass-db

gcloud run jobs execute visionclass-migrate --region us-central1
```

## 8) Notas
- Sustituye `visionclass-backend-URL` y `visionclass-ml-URL` con los dominios reales de Cloud Run.
- Para CORS/CSRF en backend, agrega:
  - `CORS_ALLOWED_ORIGINS=https://visionclass-frontend-URL`
  - `CSRF_TRUSTED_ORIGINS=https://visionclass-frontend-URL`

