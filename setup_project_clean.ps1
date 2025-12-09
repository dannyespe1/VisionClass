# ==============================================
# SETUP AUTOMATICO DEL SISTEMA WEB VISION
# Autor: Danny Chicaiza (actualizado)
# ==============================================

Write-Host "=== INICIANDO CONFIGURACION DEL ENTORNO ==="

# 1. Verificar herramientas basicas
$tools = @("python", "node", "npm", "git", "docker", "docker-compose")
foreach ($t in $tools) {
    if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: $t no esta instalado o no esta en PATH."
        exit 1
    }
}
Write-Host "Herramientas basicas detectadas correctamente."

$root = Get-Location

# 2. Validar estructura existente
$folders = @("backend", "frontend", "ml", "data")
foreach ($f in $folders) {
    if (-not (Test-Path "$root\$f")) {
        Write-Host "ADVERTENCIA: Falta la carpeta $f. Clona el repo completo antes de continuar."
    }
}

# 3. Backend: preparar .env si no existe
$backendEnv = "$root\backend\.env"
if (-not (Test-Path $backendEnv)) {
@'
DEBUG=True
SECRET_KEY=django-insecure-key
DB_NAME=vision_system
DB_USER=vision_user
DB_PASSWORD=12345
DB_HOST=db
DB_PORT=5432
ALLOWED_HOSTS=*
ACCESS_TOKEN_MINUTES=10080
REFRESH_TOKEN_DAYS=30
'@ | Set-Content $backendEnv
    Write-Host "backend/.env creado con valores por defecto."
} else {
    Write-Host "backend/.env ya existe, no se modifica."
}

# 4. Recordatorio de dependencias locales
Write-Host "Instalando dependencias localmente no es requerido; se usan contenedores."
Write-Host "Si deseas local: backend -> pip install -r requirements.txt; frontend -> npm install"

# 5. Docker compose listo
$compose = "$root\docker-compose.yml"
if (-not (Test-Path $compose)) {
    Write-Host "ADVERTENCIA: No se encontro docker-compose.yml. Asegura que el repo esta completo."
} else {
    Write-Host "docker-compose.yml detectado. Usa:"
    Write-Host "  docker compose up -d --build"
}

Write-Host ""
Write-Host "========================================"
Write-Host "CONFIGURACION COMPLETA DEL ENTORNO"
Write-Host "========================================"
Write-Host ""
Write-Host "Para iniciar el sistema:"
Write-Host "  docker compose up -d --build"
Write-Host ""
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:8000"
Write-Host "ML API:   http://localhost:9000"
Write-Host ""
