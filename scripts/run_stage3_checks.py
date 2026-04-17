from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"


def build_report() -> dict:
    import sys

    os.chdir(BACKEND_DIR)
    sys.path.insert(0, str(BACKEND_DIR))

    from app.main import app

    with TestClient(app) as client:
        def login(email: str, password: str) -> str:
            response = client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
            )
            response.raise_for_status()
            return response.json()["access_token"]

        user_token = login("peter@mail.ru", "123456")
        admin_token = login("pavelkimov@gmail.com", "123456")
        headers_user = {"Authorization": f"Bearer {user_token}"}
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        scheduled_for = (datetime.now(UTC) + timedelta(hours=2)).isoformat()
        preview_payload = {
            "bonus_spent": 20,
            "promo_code": "WELCOME10",
            "scheduled_for": scheduled_for,
            "items": [
                {
                    "pizza_id": "pepperoni",
                    "size_id": "m",
                    "toppings": ["extra_cheese"],
                    "qty": 1,
                },
                {
                    "pizza_id": "margherita",
                    "size_id": "s",
                    "toppings": [],
                    "qty": 1,
                },
            ],
        }

        active_promos = client.get("/api/v1/promocodes/active").json()
        bonuses = client.get("/api/v1/me/bonuses", headers=headers_user).json()
        preview_ok = client.post(
            "/api/v1/orders/preview",
            json=preview_payload,
            headers=headers_user,
        )
        preview_bad = client.post(
            "/api/v1/orders/preview",
            json={**preview_payload, "promo_code": "BADCODE", "bonus_spent": 0},
            headers=headers_user,
        )
        preview_early_schedule = client.post(
            "/api/v1/orders/preview",
            json={
                **preview_payload,
                "promo_code": None,
                "bonus_spent": 0,
                "scheduled_for": (datetime.now(UTC) + timedelta(minutes=10)).isoformat(),
            },
            headers=headers_user,
        )
        preview_bonus_overflow = client.post(
            "/api/v1/orders/preview",
            json={**preview_payload, "promo_code": None, "bonus_spent": 5000},
            headers=headers_user,
        )

        create_payload = {
            "customer": {"name": "Peter", "phone": "+79990000001"},
            "delivery": {"address": "Moscow, Tverskaya 1", "comment": "Stage 3 test"},
            "payment_method": "card",
            "bonus_spent": 20,
            "promo_code": "WELCOME10",
            "scheduled_for": scheduled_for,
            "items": preview_payload["items"],
        }
        created = client.post("/api/v1/orders", json=create_payload, headers=headers_user)
        created.raise_for_status()
        created_data = created.json()
        order_id = created_data["order_id"]
        public_token = created_data["public_token"]

        review_before_done = client.post(
            f"/api/v1/me/orders/{order_id}/review",
            json={"rating": 4, "comment": "Пока еще рано для отзыва"},
            headers=headers_user,
        )

        status_updated = client.patch(
            f"/api/v1/admin/orders/{order_id}/status",
            json={"status": "done"},
            headers=headers_admin,
        )
        status_updated.raise_for_status()

        review_saved = client.post(
            f"/api/v1/me/orders/{order_id}/review",
            json={"rating": 5, "comment": "Отзыв этапа 3: быстро и удобно"},
            headers=headers_user,
        )
        review_saved.raise_for_status()

        my_order = client.get(f"/api/v1/me/orders/{order_id}", headers=headers_user)
        my_order.raise_for_status()
        admin_reviews = client.get("/api/v1/admin/reviews", headers=headers_admin)
        admin_reviews.raise_for_status()
        public_order = client.get(f"/api/v1/orders/{order_id}?public_token={public_token}")
        public_order.raise_for_status()

        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "active_promos_count": len(active_promos),
            "active_promos": active_promos,
            "bonuses": bonuses,
            "preview_ok_status": preview_ok.status_code,
            "preview_ok": preview_ok.json(),
            "preview_bad_status": preview_bad.status_code,
            "preview_bad": preview_bad.json(),
            "preview_early_schedule_status": preview_early_schedule.status_code,
            "preview_early_schedule": preview_early_schedule.json(),
            "preview_bonus_overflow_status": preview_bonus_overflow.status_code,
            "preview_bonus_overflow": preview_bonus_overflow.json(),
            "created_order": created_data,
            "review_before_done_status": review_before_done.status_code,
            "review_before_done": review_before_done.json(),
            "status_updated": status_updated.json(),
            "review_saved": review_saved.json(),
            "my_order": my_order.json(),
            "admin_reviews_count": len(admin_reviews.json()),
            "admin_reviews_last": admin_reviews.json()[0] if admin_reviews.json() else None,
            "public_order": public_order.json(),
        }


def main() -> None:
    report = build_report()
    output_path = ROOT_DIR / "stage3_check_results.json"
    output_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(output_path)


if __name__ == "__main__":
    main()
