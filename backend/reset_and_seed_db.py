"""
Réinitialise toute la base (suppression des données) puis injecte un jeu de test complet.

Usage (depuis backend/) :
  python reset_and_seed_db.py
  python reset_and_seed_db.py --keep-uploads   # ne supprime pas les fichiers hors seed/

Prérequis : schéma à jour (`python init_db.py` ou `alembic upgrade head`).
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import time
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

from sqlalchemy import delete, inspect, select, text

from database import SessionLocal, engine
from models import (
    AssistantAvatar,
    AssistantConfig,
    AssistantMessageRecord,
    AssistantSessionRecord,
    CargoType,
    Document,
    Message,
    MessageThread,
    Notification,
    NotificationType,
    Product,
    Shipment,
    ShipmentProduct,
    ShipmentStatus,
    ThreadParticipant,
    TradeDocumentType,
    TransportMode,
    User,
    UserRole,
)
from auth.hashing import hash_password
from seed_db import (
    BACKEND_ROOT,
    GTX_TUNISOLIVE_REF,
    SCENARIO_ACCOUNTS,
    UPLOAD_SEED_DIR,
    _ensure_seed_pdf,
)

# Coordonnées Sfax → Hambourg (expédition phare + suivi GPS)
SFAX_LAT, SFAX_LNG = 34.7406, 10.7603
HAMBURG_LAT, HAMBURG_LNG = 53.5511, 9.9937

# Ordre de suppression (enfants → parents)
_WIPE_TABLES = (
    ("assistant_messages", AssistantMessageRecord),
    ("assistant_sessions", AssistantSessionRecord),
    ("assistant_avatars", AssistantAvatar),
    ("assistant_config", AssistantConfig),
    ("messages", Message),
    ("thread_participants", ThreadParticipant),
    ("notifications", Notification),
    ("documents", Document),
    ("shipment_products", ShipmentProduct),
    ("message_threads", MessageThread),
    ("shipments", Shipment),
    ("products", Product),
    ("users", User),
)


class TerminalProgress:
    """Barre de progression ASCII pour le terminal (sans dépendance externe)."""

    def __init__(self, total: int, title: str = "GlobalTradeX") -> None:
        self.total = max(1, total)
        self.title = title
        self.current = 0
        self._started = time.perf_counter()
        self._last_len = 0

    def step(self, label: str) -> None:
        self.current += 1
        pct = min(100.0, (self.current / self.total) * 100.0)
        filled = int(40 * self.current / self.total)
        bar = "=" * filled + "-" * (40 - filled)
        elapsed = time.perf_counter() - self._started
        eta = (elapsed / self.current) * (self.total - self.current) if self.current else 0.0
        line = (
            f"\r{self.title} [{bar}] {pct:5.1f}% "
            f"({self.current}/{self.total}) {elapsed:5.1f}s ETA {eta:5.1f}s — {label[:52]}"
        )
        pad = max(0, self._last_len - len(line))
        self._last_len = len(line)
        sys.stdout.write(line + " " * pad)
        sys.stdout.flush()

    def finish(self, message: str = "Terminé") -> None:
        elapsed = time.perf_counter() - self._started
        line = f"\r{self.title} [{'=' * 40}] 100.0% ({self.total}/{self.total}) {elapsed:5.1f}s — {message}"
        pad = max(0, self._last_len - len(line))
        sys.stdout.write(line + " " * pad + "\n")
        sys.stdout.flush()


def _user_by_email(db, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def _create_scenario_users(db) -> None:
    for spec in SCENARIO_ACCOUNTS:
        db.add(
            User(
                email=spec["email"],
                full_name=spec["full_name"],
                password_hash=hash_password(spec["password"]),
                role=spec["role"],
                phone=spec.get("phone"),
                email_verified=True,
                is_active=True,
            )
        )
    db.flush()


def wipe_all_data(db, progress: TerminalProgress, *, keep_uploads: bool) -> None:
    dialect = engine.dialect.name

    if dialect == "mysql":
        progress.step("MySQL : désactivation contrôles FK")
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for table_name, model in _WIPE_TABLES:
            progress.step(f"TRUNCATE {table_name}")
            db.execute(text(f"TRUNCATE TABLE `{table_name}`"))
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    else:
        for table_name, model in _WIPE_TABLES:
            progress.step(f"DELETE {table_name}")
            db.execute(delete(model))
    db.commit()

    if not keep_uploads:
        progress.step("Nettoyage dossier uploads/")
        uploads_root = BACKEND_ROOT / "uploads"
        if uploads_root.exists():
            for child in uploads_root.iterdir():
                if child.name == "seed":
                    for f in child.glob("*"):
                        if f.is_file():
                            f.unlink()
                    continue
                if child.is_file():
                    child.unlink()
                elif child.is_dir():
                    shutil.rmtree(child, ignore_errors=True)
        UPLOAD_SEED_DIR.mkdir(parents=True, exist_ok=True)


def seed_gtx_shipment_full(db, progress: TerminalProgress) -> Shipment | None:
    progress.step("Expédition GTX, produits, documents")
    klaus = _user_by_email(db, "klaus.weber@scenario.globaltradex.com")
    fatima = _user_by_email(db, "fatima.benali@scenario.globaltradex.com")
    karim = _user_by_email(db, "karim.mansour@scenario.globaltradex.com")
    if not klaus or not fatima:
        return None

    olive = Product(
        user_id=fatima.id,
        name="Extra Virgin Olive Oil",
        hs_code="1509.10",
        description="Catalogue TunisOlive — origine Tunisie, préférentiel UE.",
        unit_price=Decimal("8.50"),
        quantity=5000,
        unit="kg",
        origin_country="Tunisia",
    )
    db.add(olive)
    db.flush()

    honey = Product(
        user_id=fatima.id,
        name="Organic Wildflower Honey",
        hs_code="0409.00",
        description="Second produit catalogue pour tests expédition.",
        unit_price=Decimal("12.00"),
        quantity=800,
        unit="kg",
        origin_country="Tunisia",
    )
    db.add(honey)
    db.flush()

    now = datetime.now(timezone.utc)
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
        origin_lat=SFAX_LAT,
        origin_lng=SFAX_LNG,
        dest_lat=HAMBURG_LAT,
        dest_lng=HAMBURG_LNG,
        current_lat=SFAX_LAT + (HAMBURG_LAT - SFAX_LAT) * 0.35,
        current_lng=SFAX_LNG + (HAMBURG_LNG - SFAX_LNG) * 0.35,
        tracking_status="in_transit",
        tracking_progress=0.35,
        simulation_state="idle",
        estimated_delivery_at=now + timedelta(hours=48),
        location_history=[
            {"lat": round(SFAX_LAT, 6), "lng": round(SFAX_LNG, 6), "ts": now.isoformat()},
            {
                "lat": round(SFAX_LAT + (HAMBURG_LAT - SFAX_LAT) * 0.35, 6),
                "lng": round(SFAX_LNG + (HAMBURG_LNG - SFAX_LNG) * 0.35, 6),
                "ts": (now + timedelta(hours=12)).isoformat(),
            },
        ],
        notes=(
            "Scénario soutenance : FreshMart / TunisOlive. "
            "customs_hold + certificat d'origine à valider par le courtier."
        ),
    )
    db.add(gtx)
    db.flush()
    db.add(ShipmentProduct(shipment_id=gtx.id, product_id=olive.id, quantity=5000))

    coo_ai = {
        "verification_status": "flagged",
        "valid": False,
        "issues": ["missing_chamber_of_commerce_stamp"],
        "summary": (
            "Le certificat d'origine pourrait ne pas comporter le tampon "
            "de la Chambre de commerce (droits préférentiels 0 %)."
        ),
    }
    doc_specs = [
        ("seed_gtx42_commercial_invoice.pdf", "Commercial_Invoice_FreshMart_GmbH.pdf", TradeDocumentType.commercial_invoice, fatima.id, True, None),
        ("seed_gtx42_packing_list.pdf", "Packing_List_Extra_Virgin_Olive_Oil.pdf", TradeDocumentType.packing_list, fatima.id, True, None),
        ("seed_gtx42_certificate_of_origin.pdf", "Certificate_of_Origin_Made_in_Tunisia.pdf", TradeDocumentType.certificate_of_origin, fatima.id, False, coo_ai),
    ]
    if karim:
        doc_specs.append(
            ("seed_gtx42_bill_of_lading.pdf", "Bill_of_Lading_Tunis_Star.pdf", TradeDocumentType.bill_of_lading, karim.id, False, None),
        )

    for filename, original_name, file_type, uploaded_by, verified, ai_result in doc_specs:
        rel = _ensure_seed_pdf(filename)
        p = BACKEND_ROOT / rel
        db.add(
            Document(
                shipment_id=gtx.id,
                uploaded_by=uploaded_by,
                filename=filename,
                original_name=original_name,
                file_type=file_type,
                file_size=p.stat().st_size if p.exists() else 128,
                file_path=rel,
                is_verified=verified,
                ai_result=ai_result,
            )
        )

    for ns in (
        (klaus, "Blocage douane - GTX-20240315-00042", "Expédition en customs_hold à Hambourg.", NotificationType.warning),
        (fatima, "Export en attente douane", f"{GTX_TUNISOLIVE_REF} retenue — pièces exportateur.", NotificationType.warning),
    ):
        if ns[0]:
            db.add(
                Notification(
                    user_id=ns[0].id,
                    title=ns[1],
                    message=ns[2],
                    notification_type=ns[3],
                    shipment_id=gtx.id,
                    is_read=False,
                )
            )
    db.flush()
    return gtx


def seed_extra_shipments(db, progress: TerminalProgress) -> None:
    progress.step("Expéditions supplémentaires (statuts variés)")
    klaus = _user_by_email(db, "klaus.weber@scenario.globaltradex.com")
    fatima = _user_by_email(db, "fatima.benali@scenario.globaltradex.com")
    karim = _user_by_email(db, "karim.mansour@scenario.globaltradex.com")
    if not klaus:
        return

    now = datetime.now(timezone.utc)
    specs = [
        {
            "reference": "GTX-TEST-PENDING-001",
            "status": ShipmentStatus.pending,
            "origin": "Tunis, Tunisia",
            "destination": "Rotterdam, Netherlands",
            "origin_lat": 36.8065,
            "origin_lng": 10.1815,
            "dest_lat": 51.9244,
            "dest_lng": 4.4777,
            "tracking_status": "pending",
            "tracking_progress": 0.0,
            "simulation_state": "idle",
        },
        {
            "reference": "GTX-TEST-TRANSIT-002",
            "status": ShipmentStatus.in_transit,
            "origin": "Algiers, Algeria",
            "destination": "Paris, France",
            "origin_lat": 36.7538,
            "origin_lng": 3.0588,
            "dest_lat": 48.8566,
            "dest_lng": 2.3522,
            "tracking_status": "in_transit",
            "tracking_progress": 0.52,
            "simulation_state": "idle",
            "current_lat": 42.5,
            "current_lng": 2.8,
        },
        {
            "reference": "GTX-TEST-DELIVERED-003",
            "status": ShipmentStatus.delivered,
            "origin": "Istanbul, Turkey",
            "destination": "Marseille, France",
            "origin_lat": 41.0082,
            "origin_lng": 28.9784,
            "dest_lat": 43.2965,
            "dest_lng": 5.3698,
            "tracking_status": "delivered",
            "tracking_progress": 1.0,
            "simulation_state": "idle",
            "current_lat": 43.2965,
            "current_lng": 5.3698,
        },
    ]
    for sp in specs:
        cur_lat = sp.get("current_lat", sp["origin_lat"])
        cur_lng = sp.get("current_lng", sp["origin_lng"])
        sh = Shipment(
            owner_id=klaus.id,
            exporter_user_id=fatima.id if fatima else None,
            forwarder_user_id=karim.id if karim else None,
            reference=sp["reference"],
            origin=sp["origin"],
            destination=sp["destination"],
            cargo_type=CargoType.general,
            transport_mode=TransportMode.sea,
            status=sp["status"],
            estimated_value=Decimal("12000.00"),
            currency="USD",
            origin_lat=sp["origin_lat"],
            origin_lng=sp["origin_lng"],
            dest_lat=sp["dest_lat"],
            dest_lng=sp["dest_lng"],
            current_lat=cur_lat,
            current_lng=cur_lng,
            tracking_status=sp["tracking_status"],
            tracking_progress=sp["tracking_progress"],
            simulation_state=sp["simulation_state"],
            estimated_delivery_at=now + timedelta(hours=72),
            location_history=[
                {"lat": round(sp["origin_lat"], 6), "lng": round(sp["origin_lng"], 6), "ts": now.isoformat()},
                {"lat": round(cur_lat, 6), "lng": round(cur_lng, 6), "ts": (now + timedelta(hours=6)).isoformat()},
            ],
        )
        db.add(sh)

    history_specs = [
        ("GTX-HIST-2025-01", ShipmentStatus.delivered, "Tunis, Tunisia", "Marseille, France", 12),
        ("GTX-HIST-2025-02", ShipmentStatus.delivered, "Sfax, Tunisia", "Genoa, Italy", 16),
        ("GTX-HIST-2025-03", ShipmentStatus.delayed, "Algiers, Algeria", "Hamburg, Germany", 28),
        ("GTX-HIST-2025-04", ShipmentStatus.delivered, "Casablanca, Morocco", "Barcelona, Spain", 11),
        ("GTX-HIST-2025-05", ShipmentStatus.customs_hold, "Tunis, Tunisia", "Le Havre, France", 22),
        ("GTX-HIST-2025-06", ShipmentStatus.delivered, "Istanbul, Turkey", "Rotterdam, Netherlands", 14),
    ]
    for ref, st, origin, dest, transit_days in history_specs:
        created = now - timedelta(days=transit_days + 5)
        db.add(
            Shipment(
                owner_id=klaus.id,
                exporter_user_id=fatima.id if fatima else None,
                forwarder_user_id=karim.id if karim else None,
                reference=ref,
                origin=origin,
                destination=dest,
                cargo_type=CargoType.general,
                transport_mode=TransportMode.sea,
                status=st,
                estimated_value=Decimal("18000.00"),
                currency="USD",
                created_at=created,
                updated_at=created + timedelta(days=transit_days),
            )
        )


def seed_messages_and_threads(db, progress: TerminalProgress, gtx: Shipment | None) -> None:
    progress.step("Fils de discussion + messages")
    klaus = _user_by_email(db, "klaus.weber@scenario.globaltradex.com")
    fatima = _user_by_email(db, "fatima.benali@scenario.globaltradex.com")
    karim = _user_by_email(db, "karim.mansour@scenario.globaltradex.com")
    amira = _user_by_email(db, "amira.benbrahim@scenario.globaltradex.com")
    if not all([klaus, fatima, karim]):
        return

    pairs: list[tuple] = [
        (klaus, fatima, "Facture commerciale — FreshMart", gtx.id if gtx else None),
        (klaus, karim, "Booking départ Hambourg", None),
        (karim, amira, "Pré-dépôt douane conteneur", None),
    ]
    if amira and gtx:
        pairs.append((klaus, amira, f"Documents UE — {gtx.reference}", gtx.id))

    for a, b, subject, shipment_id in pairs:
        if not a or not b:
            continue
        thread = MessageThread(subject=subject, shipment_id=shipment_id)
        db.add(thread)
        db.flush()
        db.add(ThreadParticipant(thread_id=thread.id, user_id=a.id))
        db.add(ThreadParticipant(thread_id=thread.id, user_id=b.id))
        db.add(
            Message(
                thread_id=thread.id,
                sender_id=a.id,
                body=f"Bonjour {b.full_name.split()[0]} — suivi : {subject}.",
            )
        )
        db.add(
            Message(
                thread_id=thread.id,
                sender_id=b.id,
                body="Bien reçu, je traite et je reviens vers vous aujourd'hui.",
            )
        )
        db.add(
            Notification(
                user_id=b.id,
                title="Nouveau message",
                message=f"{a.full_name} : {subject[:80]}",
                notification_type=NotificationType.info,
                shipment_id=shipment_id,
                is_read=False,
            )
        )


def seed_assistant_config(db, progress: TerminalProgress) -> None:
    progress.step("Configuration assistant (défaut)")
    if db.get(AssistantConfig, 1) is None:
        db.add(
            AssistantConfig(
                id=1,
                heygen_avatar_id="",
                heygen_voice_id="",
                greeting_message="Bonjour, je suis l'assistant GlobalTradeX. Comment puis-je vous aider ?",
                is_enabled=True,
            )
        )


def print_accounts(frontend_base: str) -> None:
    print()
    print("=" * 88)
    print("COMPTES DE TEST — mot de passe ci-dessous")
    print("=" * 88)
    col_role, col_email, col_pw = 14, 42, 12
    print(f"{'Rôle':<{col_role}}{'E-mail':<{col_email}}{'Mot de passe':<{col_pw}}Tableau de bord")
    print("-" * 88)
    for spec in SCENARIO_ACCOUNTS:
        url = f"{frontend_base}{spec['dashboard_path']}"
        print(
            f"{spec['role'].value:<{col_role}}"
            f"{spec['email']:<{col_email}}"
            f"{spec['password']:<{col_pw}}"
            f"{url}"
        )
    print("=" * 88)
    print(f"Expédition phare : {GTX_TUNISOLIVE_REF} (GPS + documents courtier)")
    print("Expéditions test  : GTX-TEST-PENDING-001, GTX-TEST-TRANSIT-002, GTX-TEST-DELIVERED-003")
    print(f"Frontend : {frontend_base}")
    print()


def _total_steps(*, keep_uploads: bool, dialect: str) -> int:
    n = 1  # vérification schéma
    if dialect == "mysql":
        n += 1  # FOREIGN_KEY_CHECKS
    n += len(_WIPE_TABLES)
    if not keep_uploads:
        n += 1
    n += 6  # utilisateurs, GTX, expéditions test, messages, assistant, commit
    return n


def run(*, keep_uploads: bool) -> None:
    insp = inspect(engine)
    missing = [t for t, _ in _WIPE_TABLES if not insp.has_table(t)]
    if missing:
        print(f"[erreur] Tables manquantes : {', '.join(missing)}")
        print("Exécutez d'abord : python init_db.py")
        sys.exit(1)

    dialect = engine.dialect.name
    progress = TerminalProgress(_total_steps(keep_uploads=keep_uploads, dialect=dialect), title="Reset+Seed")
    db = SessionLocal()
    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    try:
        progress.step("Vérification schéma")
        wipe_all_data(db, progress, keep_uploads=keep_uploads)
        progress.step("Utilisateurs scénario")
        _create_scenario_users(db)
        gtx = seed_gtx_shipment_full(db, progress)
        seed_extra_shipments(db, progress)
        seed_messages_and_threads(db, progress, gtx)
        seed_assistant_config(db, progress)
        db.commit()
        progress.step("Commit final")
        progress.finish("Base réinitialisée et données de test injectées")
        print_accounts(frontend_base)
    except Exception as exc:
        db.rollback()
        print(f"\n[erreur] Échec : {exc}")
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Vider la base et injecter les données de test GlobalTradeX.")
    parser.add_argument(
        "--keep-uploads",
        action="store_true",
        help="Conserver les fichiers uploadés (hors nettoyage ciblé seed/).",
    )
    args = parser.parse_args()
    print("ATTENTION : toutes les données applicatives vont être supprimées.")
    print(f"Base : {engine.url.render_as_string(hide_password=True)}\n")
    run(keep_uploads=args.keep_uploads)


if __name__ == "__main__":
    main()
