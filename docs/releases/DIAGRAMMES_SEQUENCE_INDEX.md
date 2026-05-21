# Index — Diagrammes de séquence (Releases 1, 2 et 3)

Référence style SmartChain : `docs/reference/MODELE_SMARTCHAIN_DIAGRAMMES_SEQUENCE.md`

**2 opérations principales par sprint** — chaque opération a :
- `Diagramme_Sequence_*.puml` (PlantUML)
- `PROMPT_*.txt` (texte à coller sur un site externe)

## Release 1

| Sprint | Opération 1 | Opération 2 |
|--------|-------------|-------------|
| **1** — Gérer Compte | [S'inscrire](release-01/sprint-01-gerer-compte/diagramme-sequence/) | [S'authentifier](release-01/sprint-01-gerer-compte/diagramme-sequence/) |
| **2** — Expéditions & Produits | [Créer une expédition](release-01/sprint-02-expeditions-produits/diagramme-sequence/) | [Gérer catalogue produits](release-01/sprint-02-expeditions-produits/diagramme-sequence/) |

## Release 2

| Sprint | Opération 1 | Opération 2 |
|--------|-------------|-------------|
| **3** — Documents & Douane | [Téléverser un document](release-02/sprint-03-documents-douane/diagramme-sequence/) | [Vérifier document par IA](release-02/sprint-03-documents-douane/diagramme-sequence/) |
| **4** — Notifications & Messagerie | [Consulter notifications](release-02/sprint-04-notifications-messagerie/diagramme-sequence/) | [Messagerie sur expédition](release-02/sprint-04-notifications-messagerie/diagramme-sequence/) |

## Fichiers par dossier

```
diagramme-sequence/
  Diagramme_Sequence_<Nom>.puml
  Diagramme_Sequence_<Nom>.png    (apres generation PlantUML)
  PROMPT_<Nom>.txt                (prompt pour autre site)
```

## Générer les PNG

```powershell
$jar = "docs\tools\plantuml.jar"
$dir = "docs\releases\release-01\sprint-01-gerer-compte\diagramme-sequence"
Get-ChildItem $dir -Filter "*.puml" | ForEach-Object {
  java -jar $jar -tpng $_.FullName
}
```

## Release 3

| Sprint | Opération 1 | Opération 2 |
|--------|-------------|-------------|
| **5** — Analytics, Cartographie & Assistant | [Assistant TradeFlow](release-03/sprint-05-analytics-cartographie-assistant/diagramme-sequence/) | [Suivi GPS carte](release-03/sprint-05-analytics-cartographie-assistant/diagramme-sequence/) |
| **6** — Administration & Soutenance | [Gérer utilisateurs](release-03/sprint-06-administration-soutenance/diagramme-sequence/) | [Analytics réseau](release-03/sprint-06-administration-soutenance/diagramme-sequence/) |

*Sprint 5 : les 3 CU documentés sont Calculateur (3.18), GPS (3.19), Assistant (3.20) — les 2 diagrammes retenus couvrent **Assistant** et **Cartographie GPS** (piliers les plus visibles pour la soutenance). Un diagramme Calculateur peut être ajouté sur demande.*

## Sites recommandés pour les PROMPT

- https://www.mermaidchart.com/play (coller version Mermaid du prompt)
- https://www.plantuml.com/plantuml (coller le .puml)
- Eraser, Lucidchart, draw.io (coller le PROMPT_*.txt)
