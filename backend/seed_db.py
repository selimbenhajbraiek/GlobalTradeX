"""Populate MySQL (or configured DB) with test data. Run from backend/: python seed_db.py"""

from decimal import Decimal

from sqlalchemy import select

from auth.hashing import hash_password
from database import Base, SessionLocal, engine
from models import (
    CargoType,
    Document,  # noqa: F401 — register documents table on Base.metadata
    Notification,  # noqa: F401 — register notifications table on Base.metadata
    Product,
    Shipment,
    ShipmentStatus,
    TransportMode,
    User,
    UserRole,
)


def seed() -> None:
    # Register all model tables on metadata
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user_specs = [
            {
                "email": "admin@test.com",
                "full_name": "Admin User",
                "password": "Admin123!",
                "role": UserRole.admin,
            },
            {
                "email": "import@test.com",
                "full_name": "Importateur Test",
                "password": "Test123!",
                "role": UserRole.importateur,
            },
            {
                "email": "export@test.com",
                "full_name": "Exportateur Test",
                "password": "Test123!",
                "role": UserRole.exportateur,
            },
            {
                "email": "transit@test.com",
                "full_name": "Transitaire Test",
                "password": "Test123!",
                "role": UserRole.transitaire,
            },
            {
                "email": "courtier@test.com",
                "full_name": "Courtier Test",
                "password": "Test123!",
                "role": UserRole.courtier,
            },
        ]

        print("--- Users ---")
        for spec in user_specs:
            if db.scalar(select(User.id).where(User.email == spec["email"])):
                print(f"  [skip] User already exists: {spec['email']}")
                continue
            user = User(
                email=spec["email"],
                full_name=spec["full_name"],
                password_hash=hash_password(spec["password"]),
                role=spec["role"],
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(
                f"  [created] User id={user.id} email={user.email} role={user.role.value}"
            )

        import_user = db.scalar(select(User).where(User.email == "import@test.com"))
        export_user = db.scalar(select(User).where(User.email == "export@test.com"))

        print("--- Shipments (importateur) ---")
        if import_user is None:
            print("  [skip] No import@test.com user; cannot seed shipments.")
        else:
            shipment_specs = [
                {
                    "reference": "SEED-IMP-PENDING",
                    "status": ShipmentStatus.pending,
                    "origin": "Shanghai, CN",
                    "destination": "Le Havre, FR",
                },
                {
                    "reference": "SEED-IMP-TRANSIT",
                    "status": ShipmentStatus.in_transit,
                    "origin": "Busan, KR",
                    "destination": "Rotterdam, NL",
                },
                {
                    "reference": "SEED-IMP-DELIVERED",
                    "status": ShipmentStatus.delivered,
                    "origin": "Los Angeles, US",
                    "destination": "Hamburg, DE",
                },
            ]
            for spec in shipment_specs:
                if db.scalar(select(Shipment.id).where(Shipment.reference == spec["reference"])):
                    print(f"  [skip] Shipment reference exists: {spec['reference']}")
                    continue
                sh = Shipment(
                    owner_id=import_user.id,
                    reference=spec["reference"],
                    origin=spec["origin"],
                    destination=spec["destination"],
                    cargo_type=CargoType.general,
                    transport_mode=TransportMode.sea,
                    status=spec["status"],
                    weight_kg=Decimal("500.00"),
                    volume_m3=Decimal("8.500"),
                    estimated_value=Decimal("45000.00"),
                )
                db.add(sh)
                db.commit()
                db.refresh(sh)
                print(
                    f"  [created] Shipment id={sh.id} ref={sh.reference} status={sh.status.value}"
                )

        print("--- Products (exportateur) ---")
        if export_user is None:
            print("  [skip] No export@test.com user; cannot seed products.")
        else:
            product_specs = [
                {
                    "name": "Laptops 15\"",
                    "hs_code": "8471.30",
                    "unit_price": Decimal("899.99"),
                    "quantity": 24,
                    "description": "Seed product A",
                },
                {
                    "name": "Ceramic tiles",
                    "hs_code": "6907.21",
                    "unit_price": Decimal("12.50"),
                    "quantity": 5000,
                    "description": "Seed product B",
                },
                {
                    "name": "Green tea packs",
                    "hs_code": "0902.10",
                    "unit_price": Decimal("8.75"),
                    "quantity": 1200,
                    "description": "Seed product C",
                },
            ]
            for spec in product_specs:
                exists = db.scalar(
                    select(Product.id).where(
                        Product.user_id == export_user.id,
                        Product.hs_code == spec["hs_code"],
                    )
                )
                if exists:
                    print(
                        f"  [skip] Product already exists for export user: hs_code={spec['hs_code']}"
                    )
                    continue
                p = Product(
                    user_id=export_user.id,
                    name=spec["name"],
                    hs_code=spec["hs_code"],
                    description=spec["description"],
                    unit_price=spec["unit_price"],
                    quantity=spec["quantity"],
                    unit="pcs",
                    origin_country="CN",
                )
                db.add(p)
                db.commit()
                db.refresh(p)
                print(
                    f"  [created] Product id={p.id} name={p.name!r} hs_code={p.hs_code} "
                    f"qty={p.quantity} unit_price={p.unit_price}"
                )

        print("\nDone. Document & Notification models are imported for table creation; no rows seeded for them.")

    except Exception as e:
        db.rollback()
        print(f"\n[error] Seed failed, transaction rolled back: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
