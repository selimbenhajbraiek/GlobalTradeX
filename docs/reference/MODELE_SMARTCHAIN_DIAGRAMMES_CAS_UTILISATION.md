# Référence — Diagrammes de cas d'utilisation (modèle SmartChain)

Ce document synthétise le style des diagrammes U.C. de l'ancienne plateforme **SmartChain** (captures rapport PFE) pour reproduire la même logique sur **GlobalTradeX**.

## Structure type d'une figure sprint

| Élément | Convention SmartChain | Application GlobalTradeX |
|---------|----------------------|-------------------------|
| Titre figure | `FIGURE X.Y – Sprint N – Diagramme de cas d'utilisation « Nom CU »` | Reprendre dans `TABLEAU_Diagramme_CU_*.txt` |
| Étiquette cadre | `U.C: [Nom fonctionnalité]` en haut à gauche du rectangle système | Ex. `U.C: Gérer Documents` |
| Acteur principal | Stick figure à gauche, hors frontière | Importateur, Exportateur, Courtier, Transitaire, Admin |
| Hiérarchie acteurs | Généralisation `Développeur <|-- Adhérent` | `Utilisateur <|-- Importateur` (voir diagramme global) |
| Cas principaux | Ovale **jaune** — navigation, liste, hub « Gérer X » | `skinparam usecase<<Primary>> #FFF9C4` |
| Cas secondaires | Ovale **rose** — détail, action optionnelle | `skinparam usecase<<Secondary>> #FFCDD2` |
| `<<extend>>` | Flèche pointillée **de l'extension vers la base** | Action optionnelle depuis un écran (ex. Supprimer depuis liste) |
| `<<include>>` | Flèche pointillée **obligatoire** (sous-processus) | Ex. S'authentifier, Connecter OpenAI, Vérifier gas fees |
| Systèmes externes | Rectangle coloré à droite | **OpenAI**, **MailerSend**, **MySQL**, **HeyGen** |
| Frontière | Grand rectangle « système » | `rectangle "GlobalTradeX" { ... }` |

## Patrons récurrents (SmartChain → GlobalTradeX)

### 1. Hub « Gérer X »
- Un cas jaune central **Gérer [Objet]** relié à l'acteur.
- Les actions (Créer, Consulter liste, Modifier) en **extend** depuis le hub ou depuis une liste.

### 2. Liste → Détail → Action
- **Consulter liste** (jaune) → **Consulter détail** (rose) en `<<extend>>`.
- Depuis le détail : **Modifier**, **Supprimer**, **Signaler** en `<<extend>>`.

### 3. Administration / modération
- **Administrateur** → **Consulter liste signalés** → **Supprimer** en extend.
- GlobalTradeX : **Courtier** → file documents → **Vérifier IA** → **Valider / Rejeter**.

### 4. Intégration technique (Sprint 5 type NFT)
- Cas métier **include** des sous-cas techniques.
- Système externe relié au sous-cas (Blockchain → **OpenAI** / API tracking).

## Fichiers par sprint GlobalTradeX

| Sprint | Dossier | Diagrammes |
|--------|---------|------------|
| 3 | `sprint-03-documents-douane/diagramme-cas-utilisation/` | Vue sprint + 3 CU (3.10–3.12) |
| 4 | `sprint-04-notifications-messagerie/...` | Vue sprint + 3 CU (3.14–3.16) |
| 5 | `sprint-05-analytics-cartographie-assistant/...` | Vue sprint + 3 CU (3.18–3.20) |
| 6 | `sprint-06-administration-soutenance/...` | Vue sprint + 3 CU (3.22–3.24) |

Release 1 (sprints 1–2) : diagrammes déjà réalisés par l'étudiant — ne pas dupliquer ici.

## Syntaxe PlantUML (eviter les erreurs)

**Ne pas** ecrire sur une seule ligne :
```plantuml
skinparam usecase { BackgroundColor #FFF9C4 BorderColor #F9A825 FontSize 10 }
```

**Utiliser** plusieurs lignes :
```plantuml
skinparam usecase {
  BackgroundColor #FFFDE7
  BorderColor #F9A825
  FontSize 11
}
```

Autres regles :
- Eviter `label` a l'interieur de `rectangle { }` (non supporte partout).
- Preferer `<<option>>` pour les sous-cas (rose) au lieu de `<<Secondary>>`.
- Numeroter les etapes (1, 2, 3…) et ajouter des `note` + `legend` pour le rapport PFE.

## Génération PNG

```powershell
$jar = "docs\tools\plantuml.jar"
$dir = "docs\releases\release-02\sprint-03-documents-douane\diagramme-cas-utilisation"
Get-ChildItem $dir -Filter "*.puml" | ForEach-Object {
  java -jar $jar -tpng -o "`"$dir`"" "`"$($_.FullName)`""
}
```
