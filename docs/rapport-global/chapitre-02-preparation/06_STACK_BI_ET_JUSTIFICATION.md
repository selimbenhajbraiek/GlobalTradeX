# §2.3.4 — Stack BI & justification (spécialité BI)

> **Retour encadrement** : en spécialité BI, nommer clairement les **outils BI** utilisés ; expliquer l'absence de Power BI / Superset / Metabase et d'entrepôt physique si applicable.

---

## 1. Outils BI effectivement utilisés dans GlobalTradeX

GlobalTradeX n'intègre pas un logiciel BI « boîte » séparé : la **BI est embarquée** dans la plateforme (approche **custom analytics** + **visualisation web**).

### Couche 1 — Moteur analytique (back-end)

| Composant | Rôle BI | Technologie |
|-----------|---------|-------------|
| **Agrégations réseau** | KPIs globaux, tendances, volumes | `backend/routers/analytics.py` — SQLAlchemy + agrégats Python |
| **BI prédictive** | Score de retard, performance transitaire, risque corridor | `backend/services/bi_delay_prediction.py` — scoring explicable (statistique + lissage bayésien) |
| **Synthèse exécutive** | Narratif français pour décideurs | Gemini 2.5 Flash sur rapport JSON (`generate_ai_executive_summary`) |
| **Data Marts logiques** | Périmètre par rôle | Filtrage `_shipments_for_bi()` dans `analytics.py` |

### Couche 2 — Visualisation (front-end)

| Composant | Rôle BI | Technologie |
|-----------|---------|-------------|
| **Graphiques KPI** | Courbes, barres, aires dans cockpits | **Chart.js** + **react-chartjs-2** |
| **Cartes flux / GPS** | Visibilité géographique | **Leaflet** + react-leaflet ; cartes SVG réseau |
| **Panneau BI prédictif** | Scores, tableaux risque, synthèse IA | `PredictiveBiPanel.jsx` |
| **Page analytics admin** | Vue consolidée | `TradeAnalyticsPage.jsx` |
| **Composants éditoriaux** | Graphiques area custom | `AreaChartEditorial.jsx` |

### Couche 3 — Données

| Élément | Rôle |
|---------|------|
| **MySQL (OLTP)** | Source unique des faits (expéditions, documents, utilisateurs) |
| **ELT à la demande** | Pas de cube OLAP pré-calculé ; agrégats à la requête API |
| **Seed historique** | `reset_and_seed_db.py` — jeux `GTX-HIST-*` pour entraîner/démontrer la BI |

**Formulation rapport** :

> *« La stack BI de GlobalTradeX repose sur un **moteur analytique Python** (FastAPI + SQLAlchemy), un **module de BI prédictive** propriétaire (`bi_delay_prediction`) et une **couche de visualisation React** (Chart.js, Leaflet). Les indicateurs sont servis en JSON par `/api/analytics` et rendus dans les cockpits métier. »*

---

## 2. Pourquoi pas Power BI, Apache Superset ou Metabase ?

| Outil BI classique | Intérêt typique | Raison de non-adoption (PFE GlobalTradeX) |
|--------------------|-----------------|-------------------------------------------|
| **Microsoft Power BI** | Dashboards enterprise, connecteurs Microsoft | **Hors stack** du projet (FastAPI/Next.js/MySQL) ; licence ; dashboards **découplés** de l'application métier multi-rôles ; difficile d'intégrer workflow courtier + BI prédictive **dans le même parcours utilisateur** |
| **Apache Superset** | BI open source, SQL Lab, dashboards | Nécessite **déploiement serveur supplémentaire** + modélisation sémantique ; redondant avec une SPA déjà prévue ; équipe PFE limitée en temps (65 jours) |
| **Metabase** | Self-service BI simple | Idem : **second produit** à maintenir ; pas de couplage natif avec scoring prédictif custom et validation documentaire IA |
| **Entrepôt physique (DW)** | Performance analytics à grande échelle | Volume PFE modéré ; **ELT on-demand** suffisant ; entrepôt reporté en **évolution** (vues matérialisées, réplica read-only) — cf. §2.4 |

### Arguments positifs du choix retenu (à mettre en avant en soutenance)

1. **Intégration métier** — Les KPIs et la BI prédictive sont **dans le flux opérationnel** (cockpit transitaire, admin), pas dans un outil externe.
2. **Contrôle total du scoring** — Le moteur prédictif est **explicable** (pas boîte noire Power BI ML) — aligné avec l'encadrement PFE.
3. **Coût et simplicité déploiement** — Pas de licence BI ni de cluster Superset ; stack **open source** homogène.
4. **Spécialité BI démontrée** — Conception OLTP/OLAP, ELT, Data Marts, KPIs, prédiction : compétences BI **architecturales et algorithmiques**, pas seulement « clic dashboard ».
5. **Évolutivité** — Export JSON/API permettrait alimentation future de **Superset** ou **Power BI** en **couche de lecture** sans refonte OLTP.

---

## 3. Comparaison rapide (TABLE 2.4 — optionnel rapport)

| Critère | Power BI / Superset / Metabase | Stack GlobalTradeX |
|---------|-------------------------------|---------------------|
| Intégration multi-rôles in-app | Faible (iframe / lien) | **Native** |
| BI prédictive custom | Extensions complexes | **Moteur dédié Python** |
| Coût PFE | Licence / infra | **Faible** |
| Time-to-market | Configuration + ETL | **Code unique** |
| Gouvernance données | Forte (enterprise) | **ELT applicatif** (v1) |

---

## 4. TABLE 2.4 — Stack BI GlobalTradeX (texte tableau Word)

```
+----------------------------+--------------------------------------------------+
| Couche                     | Outil / composant                                |
+----------------------------+--------------------------------------------------+
| Source données             | MySQL (OLTP) — Alembic                           |
| Transformation / ELT         | Python — analytics.py, bi_delay_prediction.py    |
| Prédiction                 | DelayPredictionEngine (scoring explicable)         |
| Narration IA               | Gemini 2.5 Flash (synthèse exécutive)            |
| API BI                     | REST /api/analytics/*                            |
| Visualisation              | Chart.js, react-chartjs-2, Leaflet, React        |
| Présentation décisionnelle | PredictiveBiPanel, TradeAnalyticsPage, cockpits  |
+----------------------------+--------------------------------------------------+
```

---

## 5. Paragraphe conclusion technologies BI (copier-coller)

> En spécialité **Business Intelligence**, GlobalTradeX privilégie une **BI intégrée** plutôt qu'un outil tiers (Power BI, Superset, Metabase) : le **moteur analytique** et la **BI prédictive** sont implémentés en Python dans l'API, tandis que **Chart.js** et **Leaflet** assurent la visualisation dans l'interface Next.js. Ce choix permet une **expérience unifiée** pour les cinq rôles métier, un **scoring explicable** des retards et un **déploiement PFE** sans infrastructure BI supplémentaire. L'architecture OLTP/OLAP (§2.4) et la variante **CQRS** (§2.5.2) préparent une migration future vers un entrepôt de données ou un connecteur Superset/Power BI en **couche de lecture** si le volume réseau l'exige.

---

## Références implémentation

| Élément | Chemin |
|---------|--------|
| API analytics | `backend/routers/analytics.py` |
| BI prédictif | `backend/services/bi_delay_prediction.py` |
| UI BI | `frontend/components/analytics/PredictiveBiPanel.jsx` |
| Chart.js | `frontend/package.json` → `chart.js`, `react-chartjs-2` |
