# -*- coding: utf-8 -*-
"""Génère PNG/PDF/SVG du diagramme de cas d'utilisation GlobalTradeX."""
from __future__ import annotations

import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUML = ROOT / "docs" / "diagrams" / "GlobalTradeX_use_case.puml"
OUT_DIR = ROOT / "docs" / "diagrams"
JAR = ROOT / "tools" / "plantuml.jar"
PLANTUML_URL = "https://github.com/plantuml/plantuml/releases/download/v1.2024.7/plantuml-1.2024.7.jar"


def ensure_jar() -> Path:
    if JAR.is_file():
        return JAR
    JAR.parent.mkdir(parents=True, exist_ok=True)
    print(f"Téléchargement PlantUML → {JAR}")
    urllib.request.urlretrieve(PLANTUML_URL, JAR)
    return JAR


def render() -> None:
    if not PUML.is_file():
        raise SystemExit(f"Fichier introuvable : {PUML}")
    jar = ensure_jar()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cmd = [
        "java",
        "-jar",
        str(jar),
        "-tpng",
        "-tsvg",
        "-o",
        str(OUT_DIR),
        str(PUML),
    ]
    print(" ", " ".join(cmd))
    subprocess.run(cmd, check=True)
    base = OUT_DIR / "GlobalTradeX_UseCase_Global"
    for ext in ("png", "pdf", "svg"):
        p = base.with_suffix(f".{ext}")
        if p.is_file():
            print(f"  OK {p}")
    png = base.with_suffix(".png")
    report_copy = ROOT / "docs" / "GlobalTradeX_use_case_diagram.png"
    if png.is_file():
        report_copy.write_bytes(png.read_bytes())
        print(f"  Copie rapport : {report_copy}")


if __name__ == "__main__":
    try:
        render()
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
