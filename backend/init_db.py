"""Create database tables. Run from backend/: python init_db.py

Then: python seed_db.py

Uses DATABASE_URL from .env (see .env.example).

Empty database: builds the full schema from SQLAlchemy models, then `alembic stamp head`
(the checked-in migrations are incremental changes for existing MySQL installs; they do
not create the base tables from scratch, so `alembic upgrade head` alone fails on SQLite).

Existing database (all core tables present): runs `alembic upgrade head` as usual.

Incomplete SQLite (e.g. only `users` exists): uses create_all + stamp — do not run raw
`alembic upgrade` on an empty file; the first migration expects tables to exist.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from sqlalchemy import inspect

import models  # noqa: F401 — register all ORM tables on Base.metadata
from database import Base, engine

BACKEND_ROOT = Path(__file__).resolve().parent

# All ORM tables; if any is missing we bootstrap with create_all + stamp (not Alembic upgrade).
_CORE_TABLES = (
    "users",
    "products",
    "shipments",
    "documents",
    "notifications",
    "shipment_products",
)


def _needs_bootstrap() -> bool:
    insp = inspect(engine)
    return any(not insp.has_table(name) for name in _CORE_TABLES)


def main() -> None:
    kwargs = {"cwd": str(BACKEND_ROOT)}
    if _needs_bootstrap():
        Base.metadata.create_all(bind=engine)
        subprocess.check_call(
            [sys.executable, "-m", "alembic", "stamp", "head"],
            **kwargs,
        )
        print("Created tables from models; Alembic stamped at head.")
    else:
        subprocess.check_call(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            **kwargs,
        )
        print("Migrations applied.")
    print("Next: python seed_db.py")


if __name__ == "__main__":
    main()
