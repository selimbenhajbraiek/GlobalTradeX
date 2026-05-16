"""Populate MySQL (or configured DB) with demo data. Run from backend/: python seed_db.py"""

import os
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from auth.hashing import hash_password
from database import SessionLocal
from models import (
    CargoType,
    Document,
    Message,
    MessageThread,
    TradeDocumentType,
    Notification,
    NotificationType,
    Product,
    Shipment,
    ShipmentProduct,
    ShipmentStatus,
    ThreadParticipant,
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

# End-to-end walkthrough: TunisOlive (Fatima) → FreshMart (Klaus), MedTrans (Karim), broker, admin.
GTX_TUNISOLIVE_REF = "GTX-20240315-00042"

SCENARIO_ACCOUNTS = [
    {
        "email": "klaus.weber@scenario.globaltradex.com",
        "password": "Test123!",
        "role": UserRole.importateur,
        "full_name": "Klaus Weber",
        "phone": "+4917011122233",
        "dashboard_path": "/dashboard/importateur",
    },
    {
        "email": "fatima.benali@scenario.globaltradex.com",
        "password": "Test123!",
        "role": UserRole.exportateur,
        "full_name": "Fatima Ben Ali",
        "phone": "+216711223344",
        "dashboard_path": "/dashboard/exportateur",
    },
    {
        "email": "karim.mansour@scenario.globaltradex.com",
        "password": "Test123!",
        "role": UserRole.transitaire,
        "full_name": "Karim Mansour",
        "phone": "+216722334455",
        "dashboard_path": "/dashboard/transitaire",
    },
    {
        "email": "amira.benbrahim@scenario.globaltradex.com",
        "password": "Test123!",
        "role": UserRole.courtier,
        "full_name": "Amira Ben Brahim",
        "phone": None,
        "dashboard_path": "/dashboard/courtier",
    },
    {
        "email": "sami.trabelsi@scenario.globaltradex.com",
        "password": "Admin123!",
        "role": UserRole.admin,
        "full_name": "Sami Trabelsi",
        "phone": None,
        "dashboard_path": "/dashboard/admin",
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


_MINI_PDF = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


def _ensure_seed_pdf(relative_name: str) -> str:
    """Return path relative to backend root for a tiny PDF under uploads/seed."""
    UPLOAD_SEED_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_SEED_DIR / relative_name
    if not path.exists():
        path.write_bytes(_MINI_PDF)
    return str(path.relative_to(BACKEND_ROOT)).replace("\\", "/")


def _ensure_placeholder_files() -> tuple[str, str]:
    """Create tiny placeholder files under uploads/seed; return relative paths from backend root."""
    return _ensure_seed_pdf("placeholder_commercial_invoice.pdf"), _ensure_seed_pdf(
        "placeholder_packing_list.pdf"
    )


def seed_demo_messages(db) -> None:
    """Direct message threads between demo trade roles."""
    importer = db.scalar(select(User).where(User.email == "importer@globaltradex.com"))
    exporter = db.scalar(select(User).where(User.email == "exporter@globaltradex.com"))
    forwarder = db.scalar(select(User).where(User.email == "forwarder@globaltradex.com"))
    broker = db.scalar(select(User).where(User.email == "broker@globaltradex.com"))
    if not all([importer, exporter, forwarder]):
        print("  [skip] Demo message threads — missing demo users.")
        return

    pairs = [
        (importer, exporter, "Commercial invoice for next PO"),
        (importer, forwarder, "Rotterdam departure — booking update"),
        (forwarder, broker, "Customs pre-file for inbound TEU"),
    ]
    if broker:
        pairs.append((importer, broker, "EU entry documentation"))

    for a, b, subject in pairs:
        thread = MessageThread(subject=subject)
        db.add(thread)
        db.flush()
        db.add(ThreadParticipant(thread_id=thread.id, user_id=a.id))
        db.add(ThreadParticipant(thread_id=thread.id, user_id=b.id))
        db.add(
            Message(
                thread_id=thread.id,
                sender_id=a.id,
                body=f"Hello {b.full_name.split()[0]} — following up on {subject.lower()}.",
            )
        )
        db.add(
            Message(
                thread_id=thread.id,
                sender_id=b.id,
                body="Acknowledged. I will review and respond with the next milestone today.",
            )
        )
        db.commit()
        print(f"  [created] Message thread: {a.email} ↔ {b.email}")


def seed() -> None:
    """Requires schema from Alembic: run `alembic upgrade head` before seeding."""
    db = SessionLocal()
    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    try:
        print("(Run `alembic upgrade head` first so the schema matches models, e.g. exporter_user_id.)")
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
                    file_type=TradeDocumentType.commercial_invoice,
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

        print("--- Scenario: TunisOlive to FreshMart (olive oil, Sfax - Hamburg) ---")
        for spec in SCENARIO_ACCOUNTS:
            if db.scalar(select(User.id).where(User.email == spec["email"])):
                print(f"  [skip] Scenario user exists: {spec['email']}")
                continue
            user = User(
                email=spec["email"],
                full_name=spec["full_name"],
                password_hash=hash_password(spec["password"]),
                role=spec["role"],
                phone=spec.get("phone"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"  [created] Scenario user id={user.id} email={user.email} role={user.role.value}")

        klaus = db.scalar(
            select(User).where(User.email == "klaus.weber@scenario.globaltradex.com")
        )
        fatima = db.scalar(
            select(User).where(User.email == "fatima.benali@scenario.globaltradex.com")
        )
        karim = db.scalar(
            select(User).where(User.email == "karim.mansour@scenario.globaltradex.com")
        )

        if not klaus or not fatima:
            print("  [skip] Scenario users Klaus/Fatima missing; cannot seed GTX shipment.")
        else:
            olive = db.scalar(
                select(Product).where(
                    Product.user_id == fatima.id,
                    Product.hs_code == "1509.10",
                )
            )
            if olive is None:
                olive = Product(
                    user_id=fatima.id,
                    name="Extra Virgin Olive Oil",
                    hs_code="1509.10",
                    description="Catalog item — TunisOlive SARL (Tunisia origin, EU preferential eligible).",
                    unit_price=Decimal("8.50"),
                    quantity=5000,
                    unit="kg",
                    origin_country="Tunisia",
                )
                db.add(olive)
                db.commit()
                db.refresh(olive)
                print(f"  [created] Scenario product id={olive.id} name={olive.name!r} hs={olive.hs_code}")
            else:
                print(f"  [skip] Scenario product already exists id={olive.id}")

            coo_ai = {
                "verification_status": "flagged",
                "issues": ["missing_chamber_of_commerce_stamp"],
                "summary": (
                    "Automated check: Tunisian Certificate of Origin may be missing "
                    "the required Chamber of Commerce stamp for preferential (0%) duty."
                ),
            }
            doc_rows: list[dict] = [
                {
                    "filename": "seed_gtx42_commercial_invoice.pdf",
                    "original_name": "Commercial_Invoice_FreshMart_GmbH.pdf",
                    "file_type": TradeDocumentType.commercial_invoice,
                    "uploaded_by": fatima.id,
                    "is_verified": True,
                    "ai_result": None,
                },
                {
                    "filename": "seed_gtx42_packing_list.pdf",
                    "original_name": "Packing_List_Extra_Virgin_Olive_Oil.pdf",
                    "file_type": TradeDocumentType.packing_list,
                    "uploaded_by": fatima.id,
                    "is_verified": True,
                    "ai_result": None,
                },
                {
                    "filename": "seed_gtx42_certificate_of_origin.pdf",
                    "original_name": "Certificate_of_Origin_Made_in_Tunisia.pdf",
                    "file_type": TradeDocumentType.certificate_of_origin,
                    "uploaded_by": fatima.id,
                    "is_verified": False,
                    "ai_result": coo_ai,
                },
            ]
            if karim:
                doc_rows.append(
                    {
                        "filename": "seed_gtx42_bill_of_lading.pdf",
                        "original_name": "Bill_of_Lading_Tunis_Star_HapagLloyd.pdf",
                        "file_type": TradeDocumentType.bill_of_lading,
                        "uploaded_by": karim.id,
                        "is_verified": False,
                        "ai_result": None,
                    }
                )

            gtx = db.scalar(select(Shipment).where(Shipment.reference == GTX_TUNISOLIVE_REF))
            if gtx is not None:
                print(f"  [skip] Scenario shipment exists: {GTX_TUNISOLIVE_REF}")
                if gtx.exporter_user_id != fatima.id:
                    gtx.exporter_user_id = fatima.id
                    db.commit()
                    print("  [updated] GTX shipment exporter_user_id -> Fatima")
            else:
                gtx = Shipment(
                    owner_id=klaus.id,
                    exporter_user_id=fatima.id,
                    reference=GTX_TUNISOLIVE_REF,
                    origin="Sfax, Tunisia",
                    destination="Hamburg, Germany",
                    cargo_type=CargoType.general,
                    transport_mode=TransportMode.sea,
                    status=ShipmentStatus.customs_hold,
                    weight_kg=Decimal("5000.00"),
                    volume_m3=Decimal("6.500"),
                    estimated_value=Decimal("42500.00"),
                    currency="USD",
                    freight_estimate_usd=Decimal("1800.00"),
                    departure_date=date(2024, 3, 18),
                    vessel_name="Tunis Star",
                    voyage_number="HLU-TN-2024-0318",
                    notes=(
                        "Importer: FreshMart GmbH (Hamburg). Exporter: TunisOlive SARL. "
                        "Carrier: Hapag-Lloyd (selected route). "
                        "Held at Hamburg for customs inspection — organic certification paperwork under review. "
                        "Certificate of Origin (Made in Tunisia / EU Association Agreement) flagged: "
                        "possible missing Chamber of Commerce stamp."
                    ),
                )
                db.add(gtx)
                db.commit()
                db.refresh(gtx)
                print(f"  [created] Scenario shipment id={gtx.id} ref={gtx.reference} status={gtx.status.value}")

            if not db.scalar(
                select(ShipmentProduct.id).where(
                    ShipmentProduct.shipment_id == gtx.id,
                    ShipmentProduct.product_id == olive.id,
                )
            ):
                db.add(
                    ShipmentProduct(
                        shipment_id=gtx.id,
                        product_id=olive.id,
                        quantity=5000,
                    )
                )
                db.commit()
                print("  [created] ShipmentProduct 5000 kg Extra Virgin Olive Oil")

            for dr in doc_rows:
                exists_doc = db.scalar(
                    select(Document.id).where(
                        Document.shipment_id == gtx.id,
                        Document.original_name == dr["original_name"],
                    )
                )
                if exists_doc:
                    print(f"  [skip] Document exists: {dr['original_name']}")
                    continue
                rel = _ensure_seed_pdf(dr["filename"])
                p = BACKEND_ROOT / rel
                size = p.stat().st_size if p.exists() else 0
                doc = Document(
                    shipment_id=gtx.id,
                    uploaded_by=dr["uploaded_by"],
                    filename=dr["filename"],
                    original_name=dr["original_name"],
                    file_type=dr["file_type"],
                    file_size=size,
                    file_path=rel,
                    is_verified=dr["is_verified"],
                    ai_result=dr["ai_result"],
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
                print(f"  [created] Document id={doc.id} type={dr['file_type'].value}")

            gtx_id = db.scalar(select(Shipment.id).where(Shipment.reference == GTX_TUNISOLIVE_REF))
            if gtx_id:
                notif_specs = [
                    {
                        "user": klaus,
                        "title": "Customs hold - GTX-20240315-00042",
                        "message": (
                            "Your olive oil shipment from TunisOlive (Sfax to Hamburg) is on customs hold "
                            "at Hamburg. Additional review of organic certification documents is in progress. "
                            "You will receive updates by email and SMS."
                        ),
                        "notification_type": NotificationType.warning,
                    },
                    {
                        "user": fatima,
                        "title": "Export on customs hold - FreshMart order",
                        "message": (
                            f"Shipment {GTX_TUNISOLIVE_REF} for FreshMart GmbH is held at German customs. "
                            "Please coordinate with your customs broker if additional exporter documents are requested."
                        ),
                        "notification_type": NotificationType.warning,
                    },
                ]
                for ns in notif_specs:
                    u = ns["user"]
                    if db.scalar(
                        select(Notification.id).where(
                            Notification.user_id == u.id,
                            Notification.title == ns["title"],
                        )
                    ):
                        print(f"  [skip] Scenario notification: {ns['title']}")
                        continue
                    db.add(
                        Notification(
                            user_id=u.id,
                            title=ns["title"],
                            message=ns["message"],
                            notification_type=ns["notification_type"],
                            shipment_id=gtx_id,
                            is_read=False,
                        )
                    )
                    db.commit()
                    print(f"  [created] Scenario notification for {u.email}")

        seed_demo_messages(db)

        print()
        print("=" * 88)
        print("DEMO ACCOUNTS - copy for walkthrough")
        print("=" * 88)
        col_role = 14
        col_email = 42
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
        print()
        print("=" * 88)
        print("SCENARIO ACCOUNTS - TunisOlive / FreshMart / MedTrans (same passwords as above)")
        print("=" * 88)
        print(header)
        print("-" * 88)
        for spec in SCENARIO_ACCOUNTS:
            role_label = spec["role"].value
            url = f"{frontend_base}{spec['dashboard_path']}"
            print(
                f"{role_label:<{col_role}}"
                f"{spec['email']:<{col_email}}"
                f"{spec['password']:<{col_pw}}"
                f"{url}"
            )
        print("=" * 88)
        print(f"Shipment reference: {GTX_TUNISOLIVE_REF} (importer-owned; Fatima linked as exporter for documents.)")
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
