# Observations superviseur — BI & IA (Chapitre 1)

Document de référence pour intégrer les **retours d’encadrement** dans le rapport et la soutenance.

---

## 1. Observation initiale (rapport / soutenance)

> *« Vous avez bien une IA documentaire (analyse des pièces), mais il manque une dimension **Business Intelligence** : exploiter l’**historique des transitaires** et des données d’expédition pour **prédire les retards**, pas seulement décrire le présent. »*

### Réponse projet (GlobalTradeX)

| Attendu superviseur | Réalisation |
|---------------------|-------------|
| BI au-delà de la simple digitalisation | Approche **Data-Driven** : données → KPIs → prédiction |
| Historique transitaire | Colonne `shipments.forwarder_user_id`, assignation auto lors des mises à jour statut |
| Prédiction des retards | Service `bi_delay_prediction.py`, score explicable par corridor / transitaire / signaux opérationnels |
| Restitution décisionnelle | `GET /api/analytics/predictive-bi` + panneaux UI admin et transitaire |
| Synthèse lisible pour le métier | Synthèse exécutive IA (**Gemini 2.5 Flash**) avec repli sur règles métier si clé API absente |

### Formulation pour le rapport (encadré recommandé)

> *« Suite aux observations de l’encadrement, GlobalTradeX intègre une couche **BI prédictive** : pour chaque expédition active, le système calcule une **probabilité de retard** à partir de l’historique des **transitaires**, des **corridors** (origine, destination, mode) et de signaux opérationnels (statut `customs_hold`, documents non vérifiés, progression GPS). Une **synthèse Gemini** transforme ces indicateurs en recommandations pour l’administrateur et le transitaire, complétant l’IA **documentaire** déjà en place. »*

---

## 2. Renforcement KPIs métiers (deuxième retour)

> *« Les besoins fonctionnels parlent de “consulter cockpit” sans préciser **quels indicateurs**. Il faut des **KPIs métiers** : retard à l’arrivée, temps de dédouanement, conformité documentaire, écart de coût. »*

### Réponse projet

Les tableaux du Chapitre 1 ont été révisés (voir [03_KPI_METIERS_CATALOGUE.md](./03_KPI_METIERS_CATALOGUE.md)) :

- Chaque ligne **« Consulter cockpit … »** est remplacée ou complétée par la **liste explicite des KPIs** affichés ou calculés.
- L’administrateur et le transitaire accèdent en plus au module **BI prédictif** (probabilité de retard, performance transitaire, risque par corridor).

---

## 3. Double couche IA (à mentionner au Chapitre 1 ou 2)

| Couche | Rôle | Technologie actuelle |
|--------|------|----------------------|
| **IA documentaire** | Détection d’anomalies, champs manquants, type de pièce | Gemini (API compatible OpenAI) — `LLMService.analyze_customs_document` |
| **IA prédictive BI** | Scoring retard + synthèse exécutive | Moteur statistique explicable + Gemini pour la narrative |
| **IA conversationnelle** | Assistant TradeFlow, chat importateur, routes fret | Gemini — `LLMService.chat` |

> **Note rapport :** remplacer toute mention **OpenAI** par **Google Gemini 2.5 Flash** (gratuit / quota développeur) sauf services tiers (HeyGen vidéo, ElevenLabs voix).

---

## 4. Points de démonstration soutenance

1. **Courtier** — file de revue → **Vérifier document (IA)** → Approuver / Refuser (KPI conformité).
2. **Transitaire** — cockpit fret → **BI prédictif** (`/dashboard/transitaire/predictive`).
3. **Admin** — analytics globale + section BI prédictif sur `TradeAnalyticsPage`.
4. **Importateur** — cockpit avec dossiers en douane ; calculateur (coût estimé).

Jeu de données : `python init_db.py` puis `python reset_and_seed_db.py` (historique `GTX-HIST-*`, transitaire Karim Mansour).

---

## 5. Recommandations stratégiques PFE (synthèse)

| # | Recommandation | Fichier |
|---|----------------|---------|
| 1 | Introduction générale angle **Data & BI** (DSS, silos de données) | [00_INTRODUCTION_GENERALE_DATA_BI.md](./00_INTRODUCTION_GENERALE_DATA_BI.md) |
| 2 | Priorisation backlog / MVP incrémental | [../chapitre-02-preparation/07_JUSTIFICATION_MVP_INCREMENTAL.md](../chapitre-02-preparation/07_JUSTIFICATION_MVP_INCREMENTAL.md) |
| 3 | Diagrammes ↔ flux BI (document → KPI) | [../chapitre-02-preparation/08_FLUX_DONNEES_BI_DIAGRAMMES.md](../chapitre-02-preparation/08_FLUX_DONNEES_BI_DIAGRAMMES.md) |
| 4 | Soutenance : « Où est la BI ? » | [../annexes/PREPARATION_SOUTENANCE_BI.md](../annexes/PREPARATION_SOUTENANCE_BI.md) |

Index global : [../RECOMMANDATIONS_STRATEGIQUES_PFE.md](../RECOMMANDATIONS_STRATEGIQUES_PFE.md)

---

## 6. Étude de l'existant (§1.3.1 & §1.3.2)

> *« Travail pauvre et générique — citez au moins 3 concurrents réels et un tableau comparatif. »*

### Réponse

- Concurrents : **Flexport**, **Freightos**, **SAP Global Trade Services**
- Tableau comparatif : [07_ETUDE_EXISTANT_1_3.md](./07_ETUDE_EXISTANT_1_3.md) + [TABLEAU_1_0_Comparatif_concurrents.txt](./besoins-fonctionnels/TABLEAU_1_0_Comparatif_concurrents.txt)
- Critères : Suivi GPS, Intelligence douanière, BI/Analytics, Prix, Collaboration multi-acteurs

---

## 7. Rédaction fonctionnelle (§1.6.1)

> *« Descriptions trop techniques (JWT, endpoints). Le métier se fiche du JWT. »*

### Réponse

- Tableaux acteurs révisés : langage **métier** (« tableau de bord sécurisé », « après authentification »)
- Règles : [08_REGLES_REDACTION_CAHIER_DES_CHARGES.md](./08_REGLES_REDACTION_CAHIER_DES_CHARGES.md)
- JWT, API, schéma BDD → **Chapitres 2 et 3**

---

## 8. Besoins non fonctionnels mesurables (§1.6.2)

> *« Performance vague — donnez des chiffres (3 s, 99,9 %). »*

### Réponse

- [05_BESOINS_NON_FONCTIONNELS.md](./05_BESOINS_NON_FONCTIONNELS.md) réécrit avec seuils :
  - Disponibilité **99,9 %**
  - Tableaux de bord analytiques **≤ 3 s** (cible 1 M lignes)
  - Login **≤ 2 s**, listes **≤ 1 s**, IA document **≤ 15 s**

---

## 9. Références techniques (annexe développeur)

- Doc implémentation : [docs/releases/BI_PREDICTIF_RETARDS.md](../../releases/BI_PREDICTIF_RETARDS.md)
- Code : `backend/services/bi_delay_prediction.py`, `backend/routers/analytics.py`
- UI : `frontend/components/analytics/PredictiveBiPanel.jsx`
