$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$pythonPath = Join-Path $backendPath ".venv\\Scripts\\python.exe"

if (!(Test-Path $pythonPath)) {
  Write-Host "Не найден backend/.venv. Сначала выполните настройку backend." -ForegroundColor Red
  Write-Host "cd backend; python -m venv .venv; .\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt"
  exit 1
}

Set-Location $backendPath
& $pythonPath -m uvicorn app.main:app --reload
