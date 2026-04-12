from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ShipmentProduct(Base):
    """Links shipments to catalog products with line quantities."""

    __tablename__ = "shipment_products"
    __table_args__ = (UniqueConstraint("shipment_id", "product_id", name="uq_shipment_product"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    shipment_id: Mapped[int] = mapped_column(
        ForeignKey("shipments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    shipment: Mapped["Shipment"] = relationship(back_populates="shipment_products")
    product: Mapped["Product"] = relationship(back_populates="shipment_products")
