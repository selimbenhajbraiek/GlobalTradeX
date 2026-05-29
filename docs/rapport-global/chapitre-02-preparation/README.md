# Chapitre 2 — Référence rapport PFE (GlobalTradeX)

**Sprint 0 : Phase de préparation** — index des livrables textuels pour le rapport Word/LaTeX.

## Contenu du chapitre (captures rapport)

| Section | Fichier de référence |
|---------|---------------------|
| §2.1 Introduction | [01_INTRODUCTION_ET_SCRUM.md](./01_INTRODUCTION_ET_SCRUM.md) |
| §2.2 Pilotage Scrum + backlog | [01_INTRODUCTION_ET_SCRUM.md](./01_INTRODUCTION_ET_SCRUM.md) + [backlog/](./backlog/) |
| Priorisation MoSCoW | [05_PRIORISATION_MOSCOW.md](./05_PRIORISATION_MOSCOW.md) |
| §2.3 Planification sprints | [backlog/TABLEAU_2_2_Planification_sprints.txt](./backlog/TABLEAU_2_2_Planification_sprints.txt) |
| **§2.4 Architecture des données** ⭐ | [02_ARCHITECTURE_DES_DONNEES.md](./02_ARCHITECTURE_DES_DONNEES.md) |
| §2.5 Style architectural (MVC, CQRS…) | [03_ARCHITECTURE_LOGICIELLE.md](./03_ARCHITECTURE_LOGICIELLE.md) — **§2.5.2 complet** |
| §2.3.4 Stack BI | [06_STACK_BI_ET_JUSTIFICATION.md](./06_STACK_BI_ET_JUSTIFICATION.md) |
| §2.5 Technologies | [technologies/SECTION_2_3_Technologies_GlobalTradeX.txt](./technologies/SECTION_2_3_Technologies_GlobalTradeX.txt) |
| TABLE 2.4 Stack BI | [technologies/TABLEAU_2_4_Stack_BI_GlobalTradeX.txt](./technologies/TABLEAU_2_4_Stack_BI_GlobalTradeX.txt) |
| §2.7 Diagrammes UML | [diagramme-cas-utilisation-global/](./diagramme-cas-utilisation-global/) |
| §2.8 Conclusion | [04_CONCLUSION_CHAPITRE_2.md](./04_CONCLUSION_CHAPITRE_2.md) |
| Retour superviseur | [00_OBSERVATIONS_SUPERVISEUR.md](./00_OBSERVATIONS_SUPERVISEUR.md) |
| **MVP & priorisation backlog** | [07_JUSTIFICATION_MVP_INCREMENTAL.md](./07_JUSTIFICATION_MVP_INCREMENTAL.md) |
| **Flux BI ↔ diagrammes** | [08_FLUX_DONNEES_BI_DIAGRAMMES.md](./08_FLUX_DONNEES_BI_DIAGRAMMES.md) |
| **Soutenance BI** | [../annexes/PREPARATION_SOUTENANCE_BI.md](../annexes/PREPARATION_SOUTENANCE_BI.md) |
| Index recommandations | [../RECOMMANDATIONS_STRATEGIQUES_PFE.md](../RECOMMANDATIONS_STRATEGIQUES_PFE.md) |

## Corrections par rapport aux captures Word

Le brouillon Word mentionne parfois **Node.js / Express / MongoDB**. La stack **réelle** du dépôt est :

| Couche | Technologie réelle |
|--------|-------------------|
| Back-end | **FastAPI** (Python), Uvicorn |
| Front-end | **Next.js 14**, React, Tailwind |
| Base OLTP | **MySQL** (XAMPP) ou SQLite en dev |
| OLAP | Services Python (`analytics.py`, `bi_delay_prediction.py`) |
| IA | **Gemini 2.5 Flash** |

Utiliser les fichiers de ce dossier pour corriger le rapport avant impression.

## Lien Chapitre 1 ↔ Chapitre 2

- Chapitre 1 : besoins **Data-Driven** et KPIs métiers → [chapitre-01-analyse](../chapitre-01-analyse/)
- Chapitre 2 : **où et comment** ces KPIs sont calculés (OLTP / OLAP / ELT) → `02_ARCHITECTURE_DES_DONNEES.md`

## Tableaux backlog

- [TABLEAU 2.1 — Backlog complet](./backlog/TABLEAU_2_1_Backlog_GlobalTradeX.txt) (14 modules, user stories 1.1 → 14.1)
- [TABLEAU 2.2 — Planification sprints](./backlog/TABLEAU_2_2_Planification_sprints.txt)

## Usage

1. Insérer **§2.4 Architecture des données** depuis `02_ARCHITECTURE_DES_DONNEES.md` (observation superviseur).
2. Remplacer stack Node/MongoDB par `technologies/SECTION_2_3_Technologies_GlobalTradeX.txt`.
3. Copier backlog et sprints dans Word (tableaux 2.1 et 2.2).
