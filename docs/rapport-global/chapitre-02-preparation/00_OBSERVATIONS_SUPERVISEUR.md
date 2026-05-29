# Observations superviseur — Chapitre 2 (Architecture des données)

## Observation

> *« Dans le chapitre 2, vous devez mentionner l'architecture de la donnée. Où sont stockées les données analytiques ? Parlez-vous de Data Warehouse, de Data Mart, d'ETL/ELT ? Même si vous utilisez PostgreSQL [ou MySQL], expliquez comment vous séparez l'OLTP (transactionnel) de l'OLAP (analytique). »*

---

## Réponse projet GlobalTradeX

| Question superviseur | Réponse GlobalTradeX |
|----------------------|----------------------|
| Où sont les données analytiques ? | **Couche OLAP applicative** : services `analytics.py` et `bi_delay_prediction.py` produisent des agrégats et scores **à la demande** ; pas de second entrepôt physique en v1 PFE. |
| Data Warehouse ? | **Entrepôt logique** : schéma MySQL OLTP source + **vues/agrégats calculés** exposés en JSON (`/api/analytics/*`). Évolution possible : entrepôt MySQL/PostgreSQL dédié ou vues matérialisées. |
| Data Mart ? | **Data Marts logiques par rôle** : filtrage du périmètre (importateur, exportateur, transitaire, admin) dans `_shipments_for_bi()` et endpoints analytics scopés. |
| ETL / ELT ? | Pattern **ELT on-demand** : **E**xtract (requêtes SQLAlchemy) → **L**oad (structures Python) → **T**ransform (agrégations, scoring BI) → réponse API. |
| OLTP vs OLAP ? | **Séparation logique stricte** : écritures CRUD uniquement via routers métier ; lectures analytiques uniquement via `/api/analytics` sans mélanger les transactions. |

---

## Texte court pour encadré rapport

> GlobalTradeX adopte une architecture **OLTP / OLAP** à séparation **logique** : la base **MySQL** héberge les données transactionnelles (expéditions, documents, utilisateurs). La couche **OLAP** est implémentée par des **services analytiques** FastAPI qui extraient, transforment et agrègent ces données (ELT à la demande) pour alimenter les cockpits KPI et la **BI prédictive**. Des **Data Marts** par rôle restreignent la visibilité des indicateurs. Un **Data Warehouse** physique pourra être introduit en évolution (vues matérialisées ou base analytique dédiée) lorsque le volume réseau l'exigera.

---

## Fichier détaillé

Voir [02_ARCHITECTURE_DES_DONNEES.md](./02_ARCHITECTURE_DES_DONNEES.md) — section à insérer telle quelle dans le rapport (§2.4 recommandé).

## Cohérence implémentation

| Composant | Chemin |
|-----------|--------|
| OLTP modèles | `backend/models/` |
| Router analytics OLAP | `backend/routers/analytics.py` |
| Moteur BI prédictif | `backend/services/bi_delay_prediction.py` |
| Données historiques seed | `backend/reset_and_seed_db.py` (GTX-HIST-*) |
| UI analytics | `frontend/components/analytics/`, `TradeAnalyticsPage` |

---

## Observation — Méthodologie (Kanban vs Scrum)

> *« Vous annoncez Kanban (§1.7) mais planifiez en sprints et releases. Kanban n'a pas de sprints figés ; Scrum oui. Le backlog ne doit pas se limiter à Élevée/Moyenne : utilisez MoSCoW. »*

### Réponse

| Point | Correction |
|-------|------------|
| Méthode | **Scrum** (§1.7 « Méthodologie Agile : Scrum ») — sprints, releases, cérémonies |
| Outil visuel | Trello (*To Do / In Progress / Done*) = support, **pas** la méthode |
| Priorisation | TABLE 2.1 : colonne **MoSCoW** (Must 35 / Should 12 / Could 6) |

Voir [05_PRIORISATION_MOSCOW.md](./05_PRIORISATION_MOSCOW.md) et [../chapitre-01-analyse/06_METHODOLOGIE_ET_CONCLUSION.md](../chapitre-01-analyse/06_METHODOLOGIE_ET_CONCLUSION.md).

---

## Observation — Patterns architecturaux (§2.5.2)

> *« Le sommaire coupe la définition du pattern. Nommez-le (MVC, Repository, CQRS…) et justifiez-le. »*

### Réponse

| Pattern | Justification courte |
|---------|---------------------|
| **MVC** | SPA Next.js + API FastAPI |
| **Repository** | SQLAlchemy / sessions |
| **CQRS léger** | Routers OLTP vs `/api/analytics` (OLAP) |
| **Service Layer** | `bi_delay_prediction`, `llm_service` |

Fichier complet §2.5.2 : [03_ARCHITECTURE_LOGICIELLE.md](./03_ARCHITECTURE_LOGICIELLE.md)

---

## Observation — Stack BI (§2.3.4)

> *« Spécialité BI : citez vos outils BI. Si Chart.js seulement, expliquez l'absence de Power BI / Superset / Metabase / DW. »*

### Réponse

- **Utilisé** : moteur Python (`analytics.py`, `bi_delay_prediction.py`), Chart.js, Leaflet, PredictiveBiPanel
- **Non retenu** : Power BI, Superset, Metabase (infra + découplage métier) ; DW physique (ELT on-demand PFE)

Fichiers : [06_STACK_BI_ET_JUSTIFICATION.md](./06_STACK_BI_ET_JUSTIFICATION.md), [TABLEAU 2.4](./technologies/TABLEAU_2_4_Stack_BI_GlobalTradeX.txt)

---

## Recommandations stratégiques PFE

Index : [../RECOMMANDATIONS_STRATEGIQUES_PFE.md](../RECOMMANDATIONS_STRATEGIQUES_PFE.md)

| # | Sujet | Fichier |
|---|-------|---------|
| 2 | MVP incrémental vs Sprint 1 « Gérer Compte » | [07_JUSTIFICATION_MVP_INCREMENTAL.md](./07_JUSTIFICATION_MVP_INCREMENTAL.md) |
| 3 | Flux BI dans diagrammes UML | [08_FLUX_DONNEES_BI_DIAGRAMMES.md](./08_FLUX_DONNEES_BI_DIAGRAMMES.md) |
| 4 | Préparation soutenance BI | [../annexes/PREPARATION_SOUTENANCE_BI.md](../annexes/PREPARATION_SOUTENANCE_BI.md) |
