from app.api.routers.admin import router as admin_router
from app.api.routers.auth import router as auth_router
from app.api.routers.catalog import router as catalog_router
from app.api.routers.health import router as health_router
from app.api.routers.orders import router as orders_router
from app.api.routers.users import router as users_router

__all__ = [
    "health_router",
    "catalog_router",
    "auth_router",
    "users_router",
    "orders_router",
    "admin_router",
]
