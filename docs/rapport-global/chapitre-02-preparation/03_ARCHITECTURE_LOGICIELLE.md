# §2.5.2 — Design patterns (texte complet rapport)

> **Retour encadrement** : nommer explicitement le(s) pattern(s), les justifier, ne pas couper la définition dans le sommaire.

GlobalTradeX combine **quatre patterns** complémentaires, adaptés à une plateforme web **OLTP + BI embarquée** :

---

## Pattern 1 — MVC (Model – View – Controller)

**Définition** : séparation entre données (Modèle), interface (Vue) et orchestration des requêtes (Contrôleur).

| Rôle MVC | Implémentation GlobalTradeX |
|----------|----------------------------|
| **Model** | Modèles SQLAlchemy (`User`, `Shipment`, `Document`…) — `backend/models/` |
| **View** | Composants React / pages Next.js — cockpits, tableaux, graphiques Chart.js |
| **Controller** | Routers FastAPI — `backend/routers/*.py` : reçoivent HTTP, valident (Pydantic), délèguent aux services |

**Justification** : le PFE implique une **SPA** (Next.js) découplée d'une **API REST** (FastAPI). MVC (variante **API + front**) est le standard industriel pour maintenir des écrans par rôle sans mélanger logique métier et rendu HTML/JSON.

---

## Pattern 2 — Repository (accès aux données)

**Définition** : abstraction de la persistance — la logique métier ne manipule pas le SQL brut mais des **entités** via une couche d'accès.

| Élément | GlobalTradeX |
|---------|--------------|
| **Repository implicite** | SQLAlchemy 2 + `Session` injectée (`get_db`) |
| **Requêtes typées** | `select(Shipment)`, `joinedload`, filtres par rôle |
| **Localisation** | Routers et services (`analytics.py`, `bi_delay_prediction.py`) |

**Justification** : centraliser l'accès MySQL évite la duplication des requêtes et facilite les migrations Alembic. Pour un PFE solo/petite équipe, l'ORM **joue le rôle de Repository** sans couche `Repository` Java explicite — compromis pragmatique documenté.

---

## Pattern 3 — CQRS (séparation lecture / écriture) — *variante légère*

**Définition** : **Command Query Responsibility Segregation** — les opérations qui **modifient** l'état (Command) sont séparées des opérations qui **lisent** pour l'analyse (Query).

| Côté CQRS | GlobalTradeX | Exemples |
|-----------|--------------|----------|
| **Command (écriture)** | Routers OLTP | `POST /shipments`, `PATCH` statut, upload document, validation courtier |
| **Query transactionnelle** | Lectures unitaires OLTP | `GET /shipments/{id}` — fiche dossier |
| **Query analytique (OLAP)** | Router + services dédiés | `GET /api/analytics/*`, `GET /api/analytics/predictive-bi` |

**Justification BI** : la BI prédictive (`DelayPredictionEngine`) effectue des **scans historiques** et des agrégations coûteuses. Les isoler dans `analytics.py` / `bi_delay_prediction.py` :

- évite de surcharger les endpoints CRUD ;
- respecte la **séparation OLTP / OLAP** (cf. §2.4) ;
- préfigure un **read model** distinct si un entrepôt physique est ajouté plus tard.

> **Formulation rapport** : *« Nous appliquons une **variante CQRS** : écritures métier via commandes REST transactionnelles ; lectures analytiques via un modèle de lecture calculé (ELT à la demande), sans partager les mêmes handlers que le CRUD. »*

---

## Pattern 4 — Service Layer (couche services)

**Définition** : logique métier complexe extraite des contrôleurs vers des **services** réutilisables.

| Service | Rôle |
|---------|------|
| `bi_delay_prediction.py` | Moteur BI prédictif (scoring explicable) |
| `llm_service.py` | IA documentaire et synthèse exécutive |
| `email_service.py` | Notifications SMTP |
| `assistant/service.py` | Assistant TradeFlow |

**Justification** : les routers restent fins (HTTP ↔ validation ↔ délégation) ; les algorithmes BI et IA sont **testables** et **documentables** indépendamment — essentiel pour une spécialité BI.

---

## Synthèse §2.5.2 (paragraphe copier-coller)

> GlobalTradeX s'appuie sur une architecture **three-tier** structurée par le pattern **MVC** (modèles SQLAlchemy, vues React/Next.js, contrôleurs FastAPI). L'accès aux données suit le pattern **Repository** via SQLAlchemy et les sessions injectées. Pour répondre aux exigences **BI** du projet, une **variante CQRS** sépare les **commandes** transactionnelles (CRUD expéditions, documents) des **requêtes analytiques** (endpoints `/api/analytics`, moteur prédictif). Enfin, une **couche de services** encapsule la BI prédictive, l'IA et les notifications. Ce choix justifie la séparation OLTP/OLAP et la maintenabilité du code en contexte PFE.

---

## Schéma patterns (Figure recommandée)

```
[ Vue React ] ──HTTP──▶ [ Controller FastAPI ]
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            [ Commands OLTP ]    [ Queries OLAP ]
            routers métier       analytics.py
                    │                   │
                    └─────────┬─────────┘
                              ▼
                    [ Repository / ORM ]
                              │
                              ▼
                         [ MySQL OLTP ]
```

---

## Références code

| Pattern | Fichiers |
|---------|----------|
| MVC Controller | `backend/routers/shipments.py`, `analytics.py` |
| MVC Model | `backend/models/shipment.py` |
| MVC View | `frontend/components/roles/*Cockpit.jsx` |
| CQRS Query BI | `backend/services/bi_delay_prediction.py` |
| Service Layer | `backend/services/` |
