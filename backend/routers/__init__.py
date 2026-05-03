from fastapi import APIRouter

from routers import admin, ai, analytics, calculator, documents, notifications, products, shipments, tracking, users

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(tracking.router, prefix="/shipments", tags=["tracking"])
api_router.include_router(tracking.demo_router, tags=["tracking"])
api_router.include_router(shipments.router, prefix="/shipments", tags=["shipments"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(calculator.router, prefix="/calculator", tags=["calculator"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])

__all__ = ["api_router"]
