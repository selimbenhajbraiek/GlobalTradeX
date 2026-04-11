"""Populate MySQL (or configured DB) with demo data. Run from backend/: python seed_db.py"""

import os
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from auth.hashing import hash_password
from database import SessionLocal
from models import (
    CargoType,
    Document,
    DocumentFileType,
    Notification,
    NotificationType,
    Product,
    Shipment,
    ShipmentStatus,
    TransportMode,
    User,
    UserRole,
)

BACKEND_ROOT = Path(__file__).resolve().parent
UPLOAD_SEED_DIR = BACKEND_ROOT / "uploads" / "seed"

# Demo login summary (printed at end)
DEMO_ACCOUNTS = [
    {
        "email": "admin@globaltradex.com",
        "password": "Admin123!",
        "role": UserRole.admin,
        "full_name": "Demo Admin",
        "dashboard_path": "/dashboard/admin",
    },
    {
        "email": "importer@globaltradex.com",
        "password": "Test123!",
        "role": UserRole.importateur,
        "full_name": "Demo Importer",
        "dashboard_path": "/dashboard/importateur",
    },
    {
        "email": "exporter@globaltradex.com",
        "password": "Test123!",
        "role": UserRole.exportateur,
        "full_name": "Demo Exporter",
        "dashboard_path": "/dashboard/exportateur",
    },
    {
        "email": "forwarder@globaltradex.com",
        "password": "Test123!",
        "role": UserRole.transitaire,
        "full_name": "Demo Forwarder",
        "dashboard_path": "/dashboard/transitaire",
    },
    {
        "email": "broker@globaltradex.com",
        "password": "Test123!",
        "role": UserRole.courtier,
        "full_name": "Demo Customs Broker",
        "dashboard_path": "/dashboard/courtier",
    },
]

SHIPMENT_SPECS = [
    {
        "reference": "DEMO-IMP-PENDING",
        "status": ShipmentStatus.pending,
        "origin": "Shanghai, CN",
        "destination": "Le Havre, FR",
    },
    {
        "reference": "DEMO-IMP-TRANSIT",
        "status": ShipmentStatus.in_transit,
        "origin": "Busan, KR",
        "destination": "Rotterdam, NL",
    },
    {
        "reference": "DEMO-IMP-CUSTOMS",
        "status": ShipmentStatus.customs_hold,
        "origin": "Singapore, SG",
        "destination": "Marseille, FR",
    },
    {
        "reference": "DEMO-IMP-DELIVERED",
        "status": ShipmentStatus.delivered,
        "origin": "Los Angeles, US",
        "destination": "Hamburg, DE",
    },
]

PRODUCT_SPECS = [
    {
        "name": "Electronics — LED display modules",
        "hs_code": "8531.20",
        "description": "Demo product — Electronics category",
        "unit_price": Decimal("1249.00"),
        "quantity": 48,
        "origin_country": "CN",
    },
    {
        "name": "Textiles — organic cotton fabric rolls",
        "hs_code": "5208.52",
        "description": "Demo product — Textiles category",
        "unit_price": Decimal("18.40"),
        "quantity": 2000,
        "origin_country": "IN",
    },
    {
        "name": "Machinery — industrial pump assembly",
        "hs_code": "8413.70",
        "description": "Demo product — Machinery category",
        "unit_price": Decimal("8750.00"),
        "quantity": 6,
        "origin_country": "DE",
    },
]


def _ensure_placeholder_files() -> tuple[str, str]:
    """Create tiny placeholder files under uploads/seed; return relative paths from backend root."""
    UPLOAD_SEED_DIR.mkdir(parents=True, exist_ok=True)
    placeholders = (
        ("placeholder_commercial_invoice.pdf", b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
        ("placeholder_packing_list.pdf", b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
    )
    rel_paths = []
    for name, content in placeholders:
        path = UPLOAD_SEED_DIR / name
        if not path.exists():
            path.write_bytes(content)
        rel = str(path.relative_to(BACKEND_ROOT)).replace("\\", "/")
        rel_paths.append(rel)
    return tuple(rel_paths)


def seed() -> None:
    """Requires schema from Alembic: run `alembic upgrade head` before seeding."""
    db = SessionLocal()
    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    try:
        print("--- Users ---")
        for spec in DEMO_ACCOUNTS:
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
            print(f"  [created] User id={user.id} email={user.email} role={user.role.value}")

        importer = db.scalar(select(User).where(User.email == "importer@globaltradex.com"))
        exporter = db.scalar(select(User).where(User.email == "exporter@globaltradex.com"))

        print("--- Shipments (importer) ---")
        transit_shipment = None
        if importer is None:
            print("  [skip] No importer@globaltradex.com user; cannot seed shipments.")
        else:
            for spec in SHIPMENT_SPECS:
                if db.scalar(select(Shipment.id).where(Shipment.reference == spec["reference"])):
                    print(f"  [skip] Shipment reference exists: {spec['reference']}")
                    continue
                sh = Shipment(
                    owner_id=importer.id,
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

            transit_shipment = db.scalar(
                select(Shipment).where(Shipment.reference == "DEMO-IMP-TRANSIT")
            )

        print("--- Documents (in_transit shipment) ---")
        if importer is None or transit_shipment is None:
            print("  [skip] Need importer and DEMO-IMP-TRANSIT shipment.")
        else:
            path_a, path_b = _ensure_placeholder_files()
            doc_specs = [
                {
                    "filename": "seed_demo_transit_1.pdf",
                    "original_name": "placeholder_commercial_invoice.pdf",
                    "file_path": path_a,
                },
                {
                    "filename": "seed_demo_transit_2.pdf",
                    "original_name": "placeholder_packing_list.pdf",
                    "file_path": path_b,
                },
            ]
            for ds in doc_specs:
                exists = db.scalar(
                    select(Document.id).where(
                        Document.shipment_id == transit_shipment.id,
                        Document.original_name == ds["original_name"],
                    )
                )
                if exists:
                    print(f"  [skip] Document exists: {ds['original_name']}")
                    continue
                p = BACKEND_ROOT / ds["file_path"]
                size = p.stat().st_size if p.exists() else 0
                doc = Document(
                    shipment_id=transit_shipment.id,
                    uploaded_by=importer.id,
                    filename=ds["filename"],
                    original_name=ds["original_name"],
                    file_type=DocumentFileType.pdf,
                    file_size=size,
                    file_path=ds["file_path"],
                    is_verified=False,
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
                print(f"  [created] Document id={doc.id} original_name={doc.original_name!r}")

        print("--- Products (exporter) ---")
        if exporter is None:
            print("  [skip] No exporter@globaltradex.com user; cannot seed products.")
        else:
            for spec in PRODUCT_SPECS:
                exists = db.scalar(
                    select(Product.id).where(
                        Product.user_id == exporter.id,
                        Product.hs_code == spec["hs_code"],
                    )
                )
                if exists:
                    print(
                        f"  [skip] Product already exists for exporter: hs_code={spec['hs_code']}"
                    )
                    continue
                p = Product(
                    user_id=exporter.id,
                    name=spec["name"],
                    hs_code=spec["hs_code"],
                    description=spec["description"],
                    unit_price=spec["unit_price"],
                    quantity=spec["quantity"],
                    unit="pcs",
                    origin_country=spec["origin_country"],
                )
                db.add(p)
                db.commit()
                db.refresh(p)
                print(
                    f"  [created] Product id={p.id} name={p.name!r} hs_code={p.hs_code} "
                    f"qty={p.quantity}"
                )

        print("--- Notifications (importer) ---")
        if importer is None:
            print("  [skip] No importer user.")
        else:
            # Resolve shipment ids for linking (may be pre-existing)
            def sid(ref: str) -> int | None:
                sh = db.scalar(select(Shipment).where(Shipment.reference == ref))
                return sh.id if sh else None

            notification_specs = [
                {
                    "title": "[Demo] Shipment pending",
                    "message": "Your shipment DEMO-IMP-PENDING is awaiting carrier assignment.",
                    "notification_type": NotificationType.info,
                    "shipment_ref": "DEMO-IMP-PENDING",
                },
                {
                    "title": "[Demo] In transit",
                    "message": "DEMO-IMP-TRANSIT has departed origin and is en route.",
                    "notification_type": NotificationType.success,
                    "shipment_ref": "DEMO-IMP-TRANSIT",
                },
                {
                    "title": "[Demo] Customs hold",
                    "message": "DEMO-IMP-CUSTOMS is held for customs inspection — additional docs may be required.",
                    "notification_type": NotificationType.warning,
                    "shipment_ref": "DEMO-IMP-CUSTOMS",
                },
                {
                    "title": "[Demo] Delivered",
                    "message": "DEMO-IMP-DELIVERED has been delivered to destination.",
                    "notification_type": NotificationType.success,
                    "shipment_ref": "DEMO-IMP-DELIVERED",
                },
                {
                    "title": "[Demo] Account reminder",
                    "message": "Complete your company profile to speed up customs clearance on future shipments.",
                    "notification_type": NotificationType.error,
                    "shipment_ref": None,
                },
            ]

            for ns in notification_specs:
                if db.scalar(
                    select(Notification.id).where(
                        Notification.user_id == importer.id,
                        Notification.title == ns["title"],
                    )
                ):
                    print(f"  [skip] Notification exists: {ns['title']}")
                    continue
                ship_id = sid(ns["shipment_ref"]) if ns["shipment_ref"] else None
                n = Notification(
                    user_id=importer.id,
                    title=ns["title"],
                    message=ns["message"],
                    notification_type=ns["notification_type"],
                    shipment_id=ship_id,
                    is_read=False,
                )
                db.add(n)
                db.commit()
                db.refresh(n)
                print(f"  [created] Notification id={n.id} type={n.notification_type.value}")

        print()
        print("=" * 88)
        print("DEMO ACCOUNTS — copy for walkthrough")
        print("=" * 88)
        col_role = 14
        col_email = 28
        col_pw = 12
        header = (
            f"{'Role':<{col_role}}"
            f"{'Email':<{col_email}}"
            f"{'Password':<{col_pw}}"
            f"Dashboard URL"
        )
        print(header)
        print("-" * 88)
        for spec in DEMO_ACCOUNTS:
            role_label = spec["role"].value
            url = f"{frontend_base}{spec['dashboard_path']}"
            print(
                f"{role_label:<{col_role}}"
                f"{spec['email']:<{col_email}}"
                f"{spec['password']:<{col_pw}}"
                f"{url}"
            )
        print("=" * 88)
        print(f"(Set FRONTEND_URL to override base URL; default {frontend_base})")
        print()

    except Exception as e:
        db.rollback()
        print(f"\n[error] Seed failed, transaction rolled back: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
