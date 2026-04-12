from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_role
from database import get_db
from models.product import Product
from models.user import User, UserRole
from schemas.product import ProductCreate, ProductListResponse, ProductResponse, ProductUpdate

router = APIRouter()

_product_authors = Depends(require_role(["exportateur", "admin"]))
_product_managers = Depends(require_role(["exportateur", "admin"]))


def _is_admin(user: User) -> bool:
    return user.role == UserRole.admin


def _product_filters(
    current: User,
    search: str | None,
) -> list:
    conds = []
    if not _is_admin(current):
        conds.append(Product.user_id == current.id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        conds.append(
            or_(
                Product.name.ilike(term),
                Product.hs_code.ilike(term),
                Product.origin_country.ilike(term),
            )
        )
    return conds


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current: User = _product_authors,
) -> Product:
    p = Product(user_id=current.id, **payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("", response_model=ProductListResponse)
def list_products(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
    search: str | None = Query(None, description="Filter by product name"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
) -> ProductListResponse:
    conds = _product_filters(current, search)
    count_q = select(func.count()).select_from(Product)
    q = select(Product)
    if conds:
        count_q = count_q.where(and_(*conds))
        q = q.where(and_(*conds))

    total = db.scalar(count_q) or 0
    offset = (page - 1) * limit
    rows = db.scalars(
        q.order_by(Product.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return ProductListResponse(
        items=list(rows),
        total=int(total),
        page=page,
        limit=limit,
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Product:
    p = db.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if not _is_admin(current) and p.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this product")
    return p


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current: User = _product_managers,
) -> Product:
    p = db.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if not _is_admin(current) and p.user_id != current.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to update this product",
        )
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current: User = _product_managers,
) -> None:
    p = db.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if not _is_admin(current) and p.user_id != current.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this product",
        )
    db.delete(p)
    db.commit()
