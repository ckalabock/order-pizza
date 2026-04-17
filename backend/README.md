# Pizza Backend (FastAPI + PostgreSQL)

## Setup
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m app.services.pricing seed
```

## Run backend
```powershell
uvicorn app.main:app --reload
```

## Run frontend + backend together (PowerShell)
From project root:
```powershell
Start-Process powershell -ArgumentList '-NoExit','-Command','cd backend; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload'
Start-Process powershell -ArgumentList '-NoExit','-Command','cd .; npm run dev'
```

## Main endpoints
- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `GET /api/v1/me/addresses`
- `POST /api/v1/me/addresses`
- `PATCH /api/v1/me/addresses/{address_id}`
- `DELETE /api/v1/me/addresses/{address_id}`
- `GET /api/v1/me/bonuses`
- `GET /api/v1/pizzas`
- `GET /api/v1/pizzas/{pizza_id}`
- `GET /api/v1/sizes`
- `GET /api/v1/toppings`
- `GET /api/v1/promocodes/active`
- `POST /api/v1/orders/preview`
- `POST /api/v1/orders`
- `GET /api/v1/orders/{order_id}?public_token=...`
- `GET /api/v1/me/orders`
- `GET /api/v1/me/orders/{order_id}`
- `POST /api/v1/me/orders/{order_id}/review`
- `GET /api/v1/admin/orders`
- `PATCH /api/v1/admin/orders/{order_id}/status`
- `GET /api/v1/admin/reviews`
- `GET /api/v1/admin/promocodes`
- `POST /api/v1/admin/promocodes`
- `PATCH /api/v1/admin/promocodes/{promo_id}`
- `DELETE /api/v1/admin/promocodes/{promo_id}`
- `GET /api/v1/admin/pizzas`
- `POST /api/v1/admin/pizzas`
- `PATCH /api/v1/admin/pizzas/{pizza_id}`
- `DELETE /api/v1/admin/pizzas/{pizza_id}` (soft delete: `available=false`)
- `GET /api/v1/admin/toppings`
- `POST /api/v1/admin/toppings`
- `PATCH /api/v1/admin/toppings/{topping_id}`
- `DELETE /api/v1/admin/toppings/{topping_id}` (soft delete: `available=false`)
- `GET /api/v1/admin/sizes`
- `POST /api/v1/admin/sizes`
- `PATCH /api/v1/admin/sizes/{size_id}`

## Admin login
- Login: `pavelkimov@gmail.com`
- Password: `123456`

Request body for login:
```json
{
  "email": "pavelkimov@gmail.com",
  "password": "123456"
}
```

Swagger: http://127.0.0.1:8000/docs

## Stage 3 features
- Promo codes with minimum-order validation
- Scheduled delivery with lead-time checks
- Reviews for completed orders

## Demo users (created by seed)
- `peter@mail.ru` / `123456`
- `vasya@mail.ru` / `123456`

