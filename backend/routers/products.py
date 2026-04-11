from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from auth.dependencies import get_current_user
from models.product import Product
from models.user import User
from schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter()


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Product:
    p = Product(user_id=current.id, **payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Product]:
    return list(db.scalars(select(Product).where(Product.user_id == current.id)).all())


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Product:
    p = db.get(Product, product_id)
    if not p or p.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return p


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Product:
    p = db.get(Product, product_id)
    if not p or p.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    p = db.get(Product, product_id)
    if not p or p.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(p)
    db.commit()
