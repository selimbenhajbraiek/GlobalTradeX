# Chapitre 1 — Référence rapport PFE (GlobalTradeX)

Ce dossier centralise **tout le contenu du Chapitre 1** (analyse des besoins) tel qu'il apparaît dans le rapport Word/PDF, **enrichi** pour intégrer :

1. L'approche **Data-Driven** (données logistiques → connaissance décisionnelle).
2. Les **KPIs métiers** explicites (remplacement des formulations vagues « consulter cockpit »).
3. Les **retours superviseur** sur la BI prédictive et l'IA documentaire (alignés sur l'implémentation plateforme).

## Recommandations stratégiques superviseur

Index global : [../RECOMMANDATIONS_STRATEGIQUES_PFE.md](../RECOMMANDATIONS_STRATEGIQUES_PFE.md)

| # | Sujet | Fichier |
|---|-------|---------|
| 1 | Introduction générale angle Data & BI (DSS) | [00_INTRODUCTION_GENERALE_DATA_BI.md](./00_INTRODUCTION_GENERALE_DATA_BI.md) |

## Fichiers de référence

| Fichier | Rôle |
|---------|------|
| [00_INTRODUCTION_GENERALE_DATA_BI.md](./00_INTRODUCTION_GENERALE_DATA_BI.md) | **Introduction générale** rapport — silos de données, DSS |
| [01_POSITIONNEMENT_DATA_DRIVEN.md](./01_POSITIONNEMENT_DATA_DRIVEN.md) | Texte d'introduction / repositionnement BI pour §1.1 et §1.6 |
| [02_OBSERVATIONS_SUPERVISEUR.md](./02_OBSERVATIONS_SUPERVISEUR.md) | Retours encadrement + lien avec le code livré |
| [03_KPI_METIERS_CATALOGUE.md](./03_KPI_METIERS_CATALOGUE.md) | Définitions des 4 KPIs + mapping par acteur |
| [04_SECTION_1_6_1_BESOINS_GENERAUX.md](./04_SECTION_1_6_1_BESOINS_GENERAUX.md) | Liste des 7 besoins fonctionnels généraux |
| [07_ETUDE_EXISTANT_1_3.md](./07_ETUDE_EXISTANT_1_3.md) | **§1.3** — Flexport, Freightos, SAP GTS + TABLE 1.0 |
| [09_STRATEGIE_BI_CHAPITRE_1.md](./09_STRATEGIE_BI_CHAPITRE_1.md) | **§1.6.3** — KPIs, décisions automatisées, lien Ch. 2 |
| [08_REGLES_REDACTION_CAHIER_DES_CHARGES.md](./08_REGLES_REDACTION_CAHIER_DES_CHARGES.md) | Langage métier vs technique (§1.6.1) |
| [besoins-fonctionnels/TABLEAU_1_0_Comparatif_concurrents.txt](./besoins-fonctionnels/TABLEAU_1_0_Comparatif_concurrents.txt) | Tableau comparatif Word |
| [05_BESOINS_NON_FONCTIONNELS.md](./05_BESOINS_NON_FONCTIONNELS.md) | §1.6.2 — NFR **mesurables** (99,9 %, 3 s, 1 M lignes, volumes) |
| [06_METHODOLOGIE_ET_CONCLUSION.md](./06_METHODOLOGIE_ET_CONCLUSION.md) | §1.7 Scrum + MoSCoW + §1.8 conclusion révisée |
| [besoins-fonctionnels/](./besoins-fonctionnels/) | Tableaux par acteur (texte prêt à coller dans Word) |

## Correspondance numérotation rapport ↔ fichiers

| Tableau rapport (captures) | Fichier dans ce dossier |
|----------------------------|-------------------------|
| TABLE 1.1 — Administrateur (auth, profil) | Intégré dans `TABLEAU_1_7_Besoins_fonctionnels_Administrateur.txt` |
| TABLE 1.2 — Exportateur | `TABLEAU_1_4_Besoins_fonctionnels_Exportateur.txt` |
| TABLE 1.3 — Importateur | `TABLEAU_1_3_Besoins_fonctionnels_Importateur.txt` |
| TABLE 1.4 — Transitaire | `TABLEAU_1_5_Besoins_fonctionnels_Transitaire.txt` |
| TABLE 1.5 — Courtier en douane | `TABLEAU_1_6_Besoins_fonctionnels_Courtier.txt` |
| TABLE 1.6 — Développeur | `TABLEAU_1_8_Besoins_fonctionnels_Developpeur.txt` |
| TABLE 1.7 — Chatbot (TradeFlow) | `TABLEAU_1_9_Besoins_fonctionnels_Chatbot.txt` |
| Suite administrateur (vue globale, analytics…) | `TABLEAU_1_7_Besoins_fonctionnels_Administrateur.txt` |

## Implémentation plateforme (pour cohérence rapport ↔ démo)

| Besoin Chapitre 1 | Module / endpoint |
|-------------------|-------------------|
| KPIs & analytics globale | `GET /api/analytics/*`, `TradeAnalyticsPage` |
| BI prédictif retards | `GET /api/analytics/predictive-bi`, `PredictiveBiPanel`, `/dashboard/transitaire/predictive` |
| Vérification document IA | `POST /api/documents/{id}/ai-verify` (Gemini) |
| Assistant TradeFlow | `/api/assistant/*`, `/api/ai/chat` (Gemini) |
| Coût estimé vs réel | Calculateur + champs `estimated_*` / `actual_*` sur expédition |

## Usage (4 étapes superviseur)

| Étape | Action | Fichier |
|-------|--------|---------|
| **1** | Étude de l'existant + TABLE 1.0 | `07_ETUDE_EXISTANT_1_3.md`, `TABLEAU_1_0_Comparatif_concurrents.txt` |
| **2** | Stratégie BI + architecture Data Ch. 2 | `09_STRATEGIE_BI_CHAPITRE_1.md`, `../chapitre-02-preparation/02_ARCHITECTURE_DES_DONNEES.md` |
| **3** | NFR mesurables | `05_BESOINS_NON_FONCTIONNELS.md` |
| **4** | Tableaux acteurs sans détails techniques | `besoins-fonctionnels/TABLEAU_1_*.txt` |

1. Copier `00_INTRODUCTION_GENERALE_DATA_BI.md` dans l'**Introduction générale** (avant Ch. 1).
2. Insérer `09_STRATEGIE_BI_CHAPITRE_1.md` en **§1.6.3**.
3. Coller les tableaux acteurs depuis `besoins-fonctionnels/`.
4. Insérer `02_ARCHITECTURE_DES_DONNEES.md` en **§2.4** (Chapitre 2).

## Chapitre suivant

Architecture des données (OLTP / OLAP, ETL/ELT) : [chapitre-02-preparation](../chapitre-02-preparation/README.md)
