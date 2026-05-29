# §2.1 Introduction & §2.2 Pilotage Scrum

## 2.1 Introduction (texte rapport)

Ce chapitre présente la **phase de préparation (Sprint 0)** du projet **GlobalTradeX**. Il permet de définir :

- l'organisation du travail selon **Scrum** (releases, sprints, cérémonies) ;
- les outils et **technologies** (FastAPI, Next.js, MySQL) ;
- l'**architecture des données** (OLTP / OLAP) ;
- le **Product Backlog** priorisé **MoSCoW** (TABLE 2.1) et la planification (TABLE 2.2) ;
- les diagrammes UML d'introduction.

---

## 2.2 Pilotage du projet avec Scrum

### Product Backlog et priorisation

Une **exigence** est un besoin que le système doit satisfaire. Les fonctionnalités sont regroupées en **user stories** (TABLE 2.1) et priorisées avec **MoSCoW** :

- **Must** — indispensable (parcours soutenance) ;
- **Should** — important (collaboration, UX) ;
- **Could** — optionnel ;
- **Won't** — hors périmètre v1 (cf. [05_PRIORISATION_MOSCOW.md](./05_PRIORISATION_MOSCOW.md)).

> **Note méthodologique** : les sprints et releases impliquent **Scrum**, non Kanban pur. Un tableau Trello (*To Do / In Progress / Done*) sert d'**outil visuel** de suivi au quotidien, complémentaire aux cérémonies Scrum.

### Planification par releases et sprints

Le projet est découpé en **3 releases** et **6 sprints** (TABLE 2.2), durée totale indicative **65 jours**. Chaque sprint produit un **incrément** testable.

| Release | Sprints | Focus |
|---------|---------|-------|
| Release 1 | 1–2 | OLTP cœur : comptes, expéditions, produits |
| Release 2 | 3–4 | Documents, IA Gemini, notifications, messagerie |
| Release 3 | 5–6 | OLAP : analytics, BI prédictive, cockpits KPI, admin |

### Cérémonies (rappel Chapitre 1 §1.7)

| Cérémonie | Moment |
|-----------|--------|
| **Sprint Planning** | Sélection des stories Must/Should du sprint |
| **Daily Scrum** | Synchronisation quotidienne (~15 min) |
| **Sprint Review** | Démo de l'incrément à l'encadrant |
| **Sprint Retrospective** | Amélioration continue du processus |

### Lien architecture données ↔ sprints

| Sprint | Couche données |
|--------|----------------|
| 1–2 | Schéma **OLTP** MySQL |
| 3–4 | Enrichissement transactionnel (documents, messages) |
| 5–6 | Couche **OLAP** (analytics, BI prédictive, seed `GTX-HIST-*`) |

---

## Fichiers backlog

- [TABLEAU 2.1 — Backlog MoSCoW](./backlog/TABLEAU_2_1_Backlog_GlobalTradeX.txt)
- [TABLEAU 2.2 — Planification sprints](./backlog/TABLEAU_2_2_Planification_sprints.txt)
- [05_PRIORISATION_MOSCOW.md](./05_PRIORISATION_MOSCOW.md)
