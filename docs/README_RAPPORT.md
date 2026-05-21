# Organisation du rapport PFE — GlobalTradeX

Ce dépôt documente le rapport en s’appuyant sur la structure du projet de référence (SmartChain), réorganisée par **releases → sprints → livrables**.

## Méthode de travail (ordre recommandé)

1. **Backlog produit global** — `rapport-global/backlog-produit/` (TABLEAU 2.1, 2.2)
2. **Chapitre 1** — analyse & besoins fonctionnels par acteur
3. **Chapitre 2 — Sprint 0 (préparation)** — technologies, diagramme de cas d’utilisation **global**, architecture
4. **Pour chaque sprint (1 → 6)** — dans l’ordre :
   - `backlog/` — TABLEAU 3.x Backlog du sprint
   - `diagramme-cas-utilisation/` — cas choisis (style SmartChain : hub jaune + extend rose). Index releases 2–3 : `releases/DIAGRAMMES_CAS_UTILISATION.md`
   - `description-textuelle-cas-utilisation/` — fiches textuelles des cas choisis
   - `diagramme-sequence/` — séquences des parties choisies
   - `diagramme-classes/` — diagramme de classes **cumulé** (PNG/PUML). Description textuelle tables/liens : `releases/DIAGRAMME_CLASSES_TEXTUEL_INDEX.md`
5. Passer au sprint suivant uniquement lorsque le sprint courant est documenté.

## Arborescence

```
docs/
├── README_RAPPORT.md                    ← ce fichier
├── reference/                           ← PDF modèle SmartChain (ne pas modifier)
├── rapport-global/
│   ├── backlog-produit/                 ← TABLEAU 2.1, 2.2 (toutes releases)
│   ├── chapitre-01-analyse/
│   │   └── besoins-fonctionnels/        ← TABLEAU 1.3 – 1.7
│   ├── chapitre-02-preparation/         ← Sprint 0
│   │   ├── technologies/
│   │   ├── diagramme-cas-utilisation-global/
│   │   └── diagramme-classes-global/    ← conceptuel + *physique cumulé final* (Sprint 6)
│   └── annexes/
├── releases/
│   ├── release-01/
│   │   ├── README.md
│   │   ├── sprint-01-gerer-compte/
│   │   └── sprint-02-expeditions-produits/
│   ├── release-02/
│   │   ├── sprint-03-documents-douane/
│   │   └── sprint-04-notifications-messagerie/
│   └── release-03/
│       ├── sprint-05-analytics-cartographie-assistant/
│       └── sprint-06-administration-soutenance/
└── _archives/                           ← anciens emplacements / doublons
```

Chaque dossier `sprint-XX-*` contient :

- `backlog/`
- `diagramme-cas-utilisation/`
- `description-textuelle-cas-utilisation/`
- `diagramme-sequence/`

Diagramme de classes **cumulé par release** (pas par sprint) :

- `releases/release-01/diagramme-classes/`
- `releases/release-02/diagramme-classes/`
- `releases/release-03/diagramme-classes/` (final)

## Releases et sprints

| Release   | Sprint | Nom                                      | Durée   |
|-----------|--------|------------------------------------------|---------|
| Release 1 | 1      | Gérer Compte                             | 12 j    |
| Release 1 | 2      | Gérer Expéditions & Produits             | 14 j    |
| Release 2 | 3      | Gérer Documents & Douane (IA)            | 12 j    |
| Release 2 | 4      | Notifications & Messagerie               | 8 j     |
| Release 3 | 5      | Analytics, Cartographie & Assistant      | 12 j    |
| Release 3 | 6      | Administration & Scénario soutenance     | 7 j     |

## Diagrammes de classes par sprint

Index : `releases/DIAGRAMME_CLASSES_CUMUL.md` — 3 diagrammes cumulés par release (`.puml` + `.png`). Final = Release 3, copié dans `diagramme-classes-global/`.
