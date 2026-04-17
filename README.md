# Pizza Order (Frontend + Backend)

## Requirements
- Node.js 18+
- Python 3.12+
- PostgreSQL (local) or Docker

## First-time setup
### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m app.services.pricing seed
```

### Frontend
```powershell
cd ..
npm install
```

## Run backend
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

## Run frontend
```powershell
npm run dev
```

## Run frontend + backend together (PowerShell)
From project root:
```powershell
Start-Process powershell -ArgumentList '-NoExit','-Command','cd backend; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload'
Start-Process powershell -ArgumentList '-NoExit','-Command','cd .; npm run dev'
```

## URLs
- Frontend: http://localhost:5173
- Backend Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/v1/health

## Stage 3 features
- Promo codes with server-side validation and admin management
- Order preview with scheduled delivery support
- Reviews for completed orders inside the account page

## Admin login
- Login: `pavelkimov@gmail.com`
- Password: `123456`
Use `/api/v1/auth/login` with body:
```json
{
  "email": "pavelkimov@gmail.com",
  "password": "123456"
}
```
