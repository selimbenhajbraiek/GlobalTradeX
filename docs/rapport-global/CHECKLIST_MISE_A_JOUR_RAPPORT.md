# Checklist — Mise à jour rapport PFE GlobalTradeX

> **Usage** : cocher chaque case après avoir collé le contenu dans Word.  
> Remplir la colonne **Page Word** au fur et à mesure.  
> Chemin source : `docs/rapport-global/`

**Légende** : ⭐ = section critique superviseur (BI / Data)

---

## Progression globale

| Bloc | Étapes | Cochées |
|------|--------|---------|
| A — Introduction générale | 1 | ☐ / 1 |
| B — Chapitre 1 | 2 → 17 | ☐ / 16 |
| C — Chapitre 2 | 18 → 28 | ☐ / 11 |
| D — Annexes & soutenance | 29 → 31 | ☐ / 3 |
| **Total** | **31** | **☐ / 31** |

---

## A — Introduction générale (avant Chapitre 1)

| ☐ | # | Section rapport | Page Word | Fichier source | Action |
|---|-----|-----------------|-----------|----------------|--------|
| ☐ | 1 | Introduction générale | _____ | `chapitre-01-analyse/00_INTRODUCTION_GENERALE_DATA_BI.md` | Remplacer l'intro : angle Data & BI, silos, DSS |

---

## B — Chapitre 1 — Analyse des besoins

### B1 — Contexte

| ☐ | # | Section rapport | Page Word | Fichier source | Action |
|---|-----|-----------------|-----------|----------------|--------|
| ☐ | 2 | §1.1 Contexte / intro Ch.1 | _____ | `chapitre-01-analyse/01_POSITIONNEMENT_DATA_DRIVEN.md` | Insérer paragraphe Data-Driven |
| ☐ | 3 | §1.3.1 & §1.3.2 Étude existant | _____ | `chapitre-01-analyse/07_ETUDE_EXISTANT_1_3.md` | Flexport, Freightos, SAP GTS + analyse critique |
| ☐ | 4 | TABLE 1.0 Comparatif | _____ | `chapitre-01-analyse/besoins-fonctionnels/TABLEAU_1_0_Comparatif_concurrents.txt` | Coller tableau comparatif 6 critères |

### B2 — Besoins fonctionnels généraux

| ☐ | # | Section rapport | Page Word | Fichier source | Action |
|---|-----|-----------------|-----------|----------------|--------|
| ☐ | 5 | §1.6.1 Intro besoins généraux | _____ | `chapitre-01-analyse/04_SECTION_1_6_1_BESOINS_GENERAUX.md` | 7 besoins + renvoi §1.6.3 |
| ☐ | 6 | TABLE 1.x — Administrateur | _____ | `besoins-fonctionnels/TABLEAU_1_7_Besoins_fonctionnels_Administrateur.txt` | Remplacer tableau (KPIs, langage métier) |
| ☐ | 7 | TABLE 1.x — Exportateur | _____ | `besoins-fonctionnels/TABLEAU_1_4_Besoins_fonctionnels_Exportateur.txt` | Idem |
| ☐ | 8 | TABLE 1.x — Importateur | _____ | `besoins-fonctionnels/TABLEAU_1_3_Besoins_fonctionnels_Importateur.txt` | Idem |
| ☐ | 9 | TABLE 1.x — Transitaire | _____ | `besoins-fonctionnels/TABLEAU_1_5_Besoins_fonctionnels_Transitaire.txt` | Idem + BI prédictive |
| ☐ | 10 | TABLE 1.x — Courtier | _____ | `besoins-fonctionnels/TABLEAU_1_6_Besoins_fonctionnels_Courtier.txt` | Idem + analyse IA doc |
| ☐ | 11 | TABLE 1.x — Développeur | _____ | `besoins-fonctionnels/TABLEAU_1_8_Besoins_fonctionnels_Developpeur.txt` | Sans JWT / endpoints |
| ☐ | 12 | TABLE 1.x — Chatbot TradeFlow | _____ | `besoins-fonctionnels/TABLEAU_1_9_Besoins_fonctionnels_Chatbot.txt` | Idem |

### B3 — BI, KPIs, NFR, méthodologie

| ☐ | # | Section rapport | Page Word | Fichier source | Action |
|---|-----|-----------------|-----------|----------------|--------|
| ☐ | 13 | Annexe ou §1.6 (optionnel) | _____ | `chapitre-01-analyse/03_KPI_METIERS_CATALOGUE.md` | Détail 4 KPIs + formules |
| ☐ | 14 | **§1.6.3 Stratégie BI** ⭐ | _____ | `chapitre-01-analyse/09_STRATEGIE_BI_CHAPITRE_1.md` | **Nouvelle section** : KPIs + décisions auto |
| ☐ | 15 | **§1.6.2 NFR mesurables** ⭐ | _____ | `chapitre-01-analyse/05_BESOINS_NON_FONCTIONNELS.md` | 99,9 %, 3 s, 1 M lignes, volumes |
| ☐ | 16 | §1.7 Méthodologie Scrum | _____ | `chapitre-01-analyse/06_METHODOLOGIE_ET_CONCLUSION.md` | Remplacer Kanban par Scrum + MoSCoW |
| ☐ | 17 | §1.8 Conclusion Ch. 1 | _____ | `chapitre-01-analyse/06_METHODOLOGIE_ET_CONCLUSION.md` | Paragraphe conclusion révisé |

---

## C — Chapitre 2 — Préparation / Conception

### C1 — Scrum & backlog

| ☐ | # | Section rapport | Page Word | Fichier source | Action |
|---|-----|-----------------|-----------|----------------|--------|
| ☐ | 18 | §2.1 Introduction Ch.2 | _____ | `chapitre-02-preparation/01_INTRODUCTION_ET_SCRUM.md` | Sprint 0, objectifs préparation |
| ☐ | 19 | §2.2 Pilotage Scrum | _____ | `chapitre-02-preparation/01_INTRODUCTION_ET_SCRUM.md` | Cérémonies, rôles, releases |
| ☐ | 20 | §2.2 MoSCoW (texte) | _____ | `chapitre-02-preparation/05_PRIORISATION_MOSCOW.md` | Must / Should / Could |
| ☐ | 21 | §2.2 ou §2.3 Justification MVP | _____ | `chapitre-02-preparation/07_JUSTIFICATION_MVP_INCREMENTAL.md` | Pourquoi Sprint 1 = comptes, MVP BI Sprint 5 |
| ☐ | 22 | **TABLE 2.1 Backlog** ⭐ | _____ | `chapitre-02-preparation/backlog/TABLEAU_2_1_Backlog_GlobalTradeX.txt` | Colonne MoSCoW (Must 35 / Should 12 / Could 6) |
| ☐ | 23 | **TABLE 2.2 Sprints** | _____ | `chapitre-02-preparation/backlog/TABLEAU_2_2_Planification_sprints.txt` | Planification 6 sprints + releases |

### C2 — Technologies & architecture

| ☐ | # | Section rapport | Page Word | Fichier source | Action |
|---|-----|-----------------|-----------|----------------|--------|
| ☐ | 24 | §2.3 Technologies | _____ | `chapitre-02-preparation/technologies/SECTION_2_3_Technologies_GlobalTradeX.txt` | **Corriger** : FastAPI + MySQL (pas Node/Mongo) |
| ☐ | 25 | **§2.3.4 Stack BI** ⭐ | _____ | `chapitre-02-preparation/06_STACK_BI_ET_JUSTIFICATION.md` | Chart.js, moteur Python, pourquoi pas Power BI |
| ☐ | 26 | TABLE 2.4 Stack BI | _____ | `chapitre-02-preparation/technologies/TABLEAU_2_4_Stack_BI_GlobalTradeX.txt` | Tableau stack BI |
| ☐ | 27 | **§2.4 Architecture Data** ⭐ | _____ | `chapitre-02-preparation/02_ARCHITECTURE_DES_DONNEES.md` | OLTP / OLAP / ELT / Data Marts / DW logique |
| ☐ | 28 | §2.5.2 Patterns | _____ | `chapitre-02-preparation/03_ARCHITECTURE_LOGICIELLE.md` | MVC, Repository, CQRS, Service Layer |
| ☐ | 29 | §2.6 ou diagrammes — flux BI | _____ | `chapitre-02-preparation/08_FLUX_DONNEES_BI_DIAGRAMMES.md` | Document → taux conformité (figure mermaid) |
| ☐ | 30 | §2.7 Diagrammes UML | _____ | `diagramme-cas-utilisation-global/` + `diagramme-classes-global/` | Vérifier / enrichir flux analytiques |
| ☐ | 31 | §2.8 Conclusion Ch. 2 | _____ | `chapitre-02-preparation/04_CONCLUSION_CHAPITRE_2.md` | Conclusion révisée |

---

## D — Annexes & soutenance (hors corps principal)

| ☐ | # | Section rapport | Page Word | Fichier source | Action |
|---|-----|-----------------|-----------|----------------|--------|
| ☐ | 32 | Annexe soutenance | _____ | `annexes/PREPARATION_SOUTENANCE_BI.md` | « Où est la BI ? », Q&R jury, checklist démo |
| ☐ | 33 | Annexe scénario démo | _____ | `annexes/GRADUATION_PRESENTATION_SCENARIO.md` | Comptes scénario, parcours 5 min |
| ☐ | 34 | Index recommandations | _____ | `RECOMMANDATIONS_STRATEGIQUES_PFE.md` | Synthèse 4 recommandations superviseur |

---

## E — Vérifications finales (avant impression)

| ☐ | Contrôle | OK |
|---|----------|-----|
| ☐ | Plus de **Kanban** au §1.7 — uniquement **Scrum** | ☐ |
| ☐ | Plus de **Node.js / MongoDB** au §2.3 — **FastAPI / MySQL** | ☐ |
| ☐ | Plus de **OpenAI** — **Gemini 2.5 Flash** partout | ☐ |
| ☐ | Tableaux acteurs **sans JWT, SMTP, /api/** | ☐ |
| ☐ | §1.6.3 Stratégie BI **présent** | ☐ |
| ☐ | §2.4 OLTP/OLAP **présent** | ☐ |
| ☐ | TABLE 2.1 avec colonne **MoSCoW** | ☐ |
| ☐ | TABLE 1.0 comparatif **Flexport / Freightos / SAP GTS** | ☐ |
| ☐ | NFR avec chiffres : **99,9 %**, **≤ 3 s**, **1 M lignes** | ☐ |
| ☐ | Numérotation tableaux cohérente avec ton sommaire Word | ☐ |
| ☐ | Relecture orthographe + mise en page tableaux Word | ☐ |

---

## F — Correspondance numérotation (si ton Word diffère)

| Tableau dans Word (capture) | Fichier dépôt |
|-----------------------------|---------------|
| TABLE 1.1 Admin (auth) | `TABLEAU_1_7_Administrateur.txt` |
| TABLE 1.2 Exportateur | `TABLEAU_1_4_Exportateur.txt` |
| TABLE 1.3 Importateur | `TABLEAU_1_3_Importateur.txt` |
| TABLE 1.4 Transitaire | `TABLEAU_1_5_Transitaire.txt` |
| TABLE 1.5 Courtier | `TABLEAU_1_6_Courtier.txt` |
| TABLE 1.6 Développeur | `TABLEAU_1_8_Developpeur.txt` |
| TABLE 1.7 Chatbot | `TABLEAU_1_9_Chatbot.txt` |
| TABLE 1.0 Comparatif | `TABLEAU_1_0_Comparatif_concurrents.txt` |

---

## G — Ordre de travail recommandé (résumé 1 ligne)

```
Intro → Contexte → §1.3 + TABLE 1.0 → §1.6.1 + 7 tableaux acteurs
→ §1.6.3 BI ⭐ → §1.6.2 NFR → §1.7–1.8
→ §2.1–2.2 Scrum → MoSCoW + MVP → TABLE 2.1 + 2.2
→ §2.3 Tech → §2.3.4 BI → TABLE 2.4 → §2.4 Data ⭐ → §2.5.2 → flux BI → UML → §2.8
→ Annexes soutenance
```

---

## H — Notes personnelles

| Date | Étape en cours | Page | Remarque |
|------|----------------|------|----------|
| _____ | _____ | _____ | _____ |
| _____ | _____ | _____ | _____ |
| _____ | _____ | _____ | _____ |

---

*Généré le 19/05/2026 — GlobalTradeX PFE*
