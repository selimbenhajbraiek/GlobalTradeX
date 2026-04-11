from fastapi import APIRouter

from routers import ai, analytics, calculator, documents, products, shipments, users

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(shipments.router, prefix="/shipments", tags=["shipments"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(calculator.router, prefix="/calculator", tags=["calculator"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])

__all__ = ["api_router"]
