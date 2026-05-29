"""Populate DB with scenario data (sans purge). Run from backend/: python seed_db.py

Pour tout effacer puis réinjecter avec barre de progression : python reset_and_seed_db.py
"""

import os
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import delete, select

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

# TunisOlive (Fatima) → FreshMart (Klaus), MedTrans (Karim), courtier Amira, admin.
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
        "email": "admin@scenario.globaltradex.com",
        "password": "Admin123!",
        "role": UserRole.admin,
        "full_name": "Sami Trabelsi",
        "phone": None,
        "dashboard_path": "/dashboard/admin",
    },
]

ALLOWED_EMAILS = frozenset(spec["email"] for spec in SCENARIO_ACCOUNTS)

# Legacy accounts removed on each seed run
_MINI_PDF = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


def _ensure_seed_pdf(relative_name: str) -> str:
    UPLOAD_SEED_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_SEED_DIR / relative_name
    if not path.exists():
        path.write_bytes(_MINI_PDF)
    return str(path.relative_to(BACKEND_ROOT)).replace("\\", "/")


def purge_extraneous_users(db) -> None:
    """Keep only SCENARIO_ACCOUNTS; remove demo/legacy users and their cascaded data."""
    print("--- Purge comptes hors scénario ---")
    users = list(db.scalars(select(User)).all())
    remove_ids = [u.id for u in users if u.email not in ALLOWED_EMAILS]
    if not remove_ids:
        print("  [skip] Aucun compte hors scénario à supprimer.")
    else:
        db.execute(delete(Message).where(Message.sender_id.in_(remove_ids)))
        db.execute(delete(ThreadParticipant).where(ThreadParticipant.user_id.in_(remove_ids)))
        db.commit()
        for user in users:
            if user.id not in remove_ids:
                continue
            db.delete(user)
            print(f"  [removed] {user.email} (id={user.id})")
        db.commit()
        print(f"  [done] {len(remove_ids)} compte(s) supprimé(s).")

    # Expéditions démo orphelines (références DEMO-*)
    demo_refs = (
        "DEMO-IMP-PENDING",
        "DEMO-IMP-TRANSIT",
        "DEMO-IMP-CUSTOMS",
        "DEMO-IMP-DELIVERED",
    )
    for ref in demo_refs:
        sh = db.scalar(select(Shipment).where(Shipment.reference == ref))
        if sh:
            db.delete(sh)
            print(f"  [removed] Shipment {ref}")
    db.commit()


def ensure_scenario_users(db) -> None:
    print("--- Utilisateurs scénario ---")
    for spec in SCENARIO_ACCOUNTS:
        user = db.scalar(select(User).where(User.email == spec["email"]))
        if user:
            user.full_name = spec["full_name"]
            user.role = spec["role"]
            user.phone = spec.get("phone")
            user.is_active = True
            user.email_verified = True
            if spec.get("password"):
                user.password_hash = hash_password(spec["password"])
            print(f"  [updated] {spec['email']} ({spec['role'].value})")
        else:
            user = User(
                email=spec["email"],
                full_name=spec["full_name"],
                password_hash=hash_password(spec["password"]),
                role=spec["role"],
                phone=spec.get("phone"),
                email_verified=True,
            )
            db.add(user)
            print(f"  [created] {spec['email']} ({spec['role'].value})")
    db.commit()


def seed_scenario_messages(db) -> None:
    """Fil de discussion entre les rôles du scénario."""
    klaus = db.scalar(select(User).where(User.email == "klaus.weber@scenario.globaltradex.com"))
    fatima = db.scalar(select(User).where(User.email == "fatima.benali@scenario.globaltradex.com"))
    karim = db.scalar(select(User).where(User.email == "karim.mansour@scenario.globaltradex.com"))
    amira = db.scalar(select(User).where(User.email == "amira.benbrahim@scenario.globaltradex.com"))
    if not all([klaus, fatima, karim]):
        print("  [skip] Messages — utilisateurs scénario manquants.")
        return

    pairs = [
        (klaus, fatima, "Facture commerciale — commande FreshMart"),
        (klaus, karim, "Départ Hambourg — mise à jour booking"),
        (karim, amira, "Pré-dépôt douane — conteneur entrant"),
    ]
    if amira:
        pairs.append((klaus, amira, "Documents d'entrée UE — GTX-20240315-00042"))

    print("--- Messages ---")
    for a, b, subject in pairs:
        existing = db.scalar(
            select(MessageThread.id)
            .join(ThreadParticipant, ThreadParticipant.thread_id == MessageThread.id)
            .where(MessageThread.subject == subject)
            .limit(1)
        )
        if existing:
            print(f"  [skip] Fil existant: {subject}")
            continue
        thread = MessageThread(subject=subject)
        db.add(thread)
        db.flush()
        db.add(ThreadParticipant(thread_id=thread.id, user_id=a.id))
        db.add(ThreadParticipant(thread_id=thread.id, user_id=b.id))
        db.add(
            Message(
                thread_id=thread.id,
                sender_id=a.id,
                body=f"Bonjour {b.full_name.split()[0]} — suivi concernant {subject.lower()}.",
            )
        )
        db.add(
            Message(
                thread_id=thread.id,
                sender_id=b.id,
                body="Bien reçu. Je reviens vers vous avec la prochaine étape aujourd'hui.",
            )
        )
        db.commit()
        print(f"  [created] {a.email} ↔ {b.email}")


def seed_gtx_shipment(db) -> None:
    print("--- Scénario TunisOlive → FreshMart ---")
    klaus = db.scalar(select(User).where(User.email == "klaus.weber@scenario.globaltradex.com"))
    fatima = db.scalar(select(User).where(User.email == "fatima.benali@scenario.globaltradex.com"))
    karim = db.scalar(select(User).where(User.email == "karim.mansour@scenario.globaltradex.com"))

    if not klaus or not fatima:
        print("  [skip] Klaus ou Fatima manquant — expédition GTX non créée.")
        return

    olive = db.scalar(
        select(Product).where(Product.user_id == fatima.id, Product.hs_code == "1509.10")
    )
    if olive is None:
        olive = Product(
            user_id=fatima.id,
            name="Extra Virgin Olive Oil",
            hs_code="1509.10",
            description="Catalogue — TunisOlive SARL (origine Tunisie, préférentiel UE).",
            unit_price=Decimal("8.50"),
            quantity=5000,
            unit="kg",
            origin_country="Tunisia",
        )
        db.add(olive)
        db.commit()
        db.refresh(olive)
        print(f"  [created] Produit {olive.name!r}")
    else:
        print(f"  [skip] Produit huile d'olive id={olive.id}")

    coo_ai = {
        "verification_status": "flagged",
        "issues": ["missing_chamber_of_commerce_stamp"],
        "summary": (
            "Contrôle automatique : le certificat d'origine tunisien pourrait ne pas comporter "
            "le tampon requis de la Chambre de commerce (droits préférentiels 0 %)."
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
        print(f"  [skip] Expédition existante {GTX_TUNISOLIVE_REF}")
        if gtx.owner_id != klaus.id:
            gtx.owner_id = klaus.id
        if gtx.exporter_user_id != fatima.id:
            gtx.exporter_user_id = fatima.id
        db.commit()
    else:
        gtx = Shipment(
            owner_id=klaus.id,
            exporter_user_id=fatima.id,
            forwarder_user_id=karim.id if karim else None,
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
                "Importateur : FreshMart GmbH (Hambourg). Exportateur : TunisOlive SARL. "
                "Transporteur : Hapag-Lloyd. Blocage douane Hambourg — certification bio en revue. "
                "Certificat d'origine signalé : tampon Chambre de commerce possiblement manquant."
            ),
        )
        db.add(gtx)
        db.commit()
        db.refresh(gtx)
        print(f"  [created] Expédition {gtx.reference} ({gtx.status.value})")

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
        print("  [created] Ligne expédition — 5000 kg huile d'olive")

    for dr in doc_rows:
        if db.scalar(
            select(Document.id).where(
                Document.shipment_id == gtx.id,
                Document.original_name == dr["original_name"],
            )
        ):
            print(f"  [skip] Document {dr['original_name']}")
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
        print(f"  [created] Document {dr['file_type'].value}")

    gtx_id = gtx.id
    notif_specs = [
        {
            "user": klaus,
            "title": "Blocage douane - GTX-20240315-00042",
            "message": (
                "Votre expédition d'huile d'olive TunisOlive (Sfax → Hambourg) est en "
                "customs_hold à Hambourg. Revue des documents bio en cours."
            ),
            "notification_type": NotificationType.warning,
        },
        {
            "user": fatima,
            "title": "Export en attente douane - FreshMart",
            "message": (
                f"L'expédition {GTX_TUNISOLIVE_REF} pour FreshMart GmbH est retenue à la douane "
                "allemande. Coordonnez-vous avec le courtier si des pièces exportateur sont demandées."
            ),
            "notification_type": NotificationType.warning,
        },
    ]
    print("--- Notifications scénario ---")
    for ns in notif_specs:
        u = ns["user"]
        if db.scalar(
            select(Notification.id).where(
                Notification.user_id == u.id,
                Notification.title == ns["title"],
            )
        ):
            print(f"  [skip] Notification {ns['title']}")
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
        print(f"  [created] Notification pour {u.email}")


def seed() -> None:
    """Requires schema from Alembic: run `alembic upgrade head` before seeding."""
    db = SessionLocal()
    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    try:
        print("(Exécuter `alembic upgrade head` avant le seed si la base est neuve.)")
        purge_extraneous_users(db)
        ensure_scenario_users(db)
        seed_gtx_shipment(db)
        seed_scenario_messages(db)

        print()
        print("=" * 88)
        print("COMPTES SCÉNARIO — soutenance / démo")
        print("=" * 88)
        col_role = 14
        col_email = 42
        col_pw = 12
        header = (
            f"{'Rôle':<{col_role}}"
            f"{'E-mail':<{col_email}}"
            f"{'Mot de passe':<{col_pw}}"
            f"URL tableau de bord"
        )
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
        print(f"Expédition phare : {GTX_TUNISOLIVE_REF}")
        print(f"(FRONTEND_URL={frontend_base})")
        print()

    except Exception as e:
        db.rollback()
        print(f"\n[error] Échec du seed, rollback : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
