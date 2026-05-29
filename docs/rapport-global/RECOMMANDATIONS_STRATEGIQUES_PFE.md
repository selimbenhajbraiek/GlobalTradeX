# Recommandations stratégiques PFE — GlobalTradeX

Document de référence pour le **rapport** et la **soutenance**. Phrases courtes, vocabulaire simple.

| # | Recommandation | Fichier détaillé |
|---|----------------|------------------|
| 1 | Introduction angle Data & BI (DSS) | [chapitre-01-analyse/00_INTRODUCTION_GENERALE_DATA_BI.md](./chapitre-01-analyse/00_INTRODUCTION_GENERALE_DATA_BI.md) |
| 2 | Priorisation backlog & MVP incrémental | [chapitre-02-preparation/07_JUSTIFICATION_MVP_INCREMENTAL.md](./chapitre-02-preparation/07_JUSTIFICATION_MVP_INCREMENTAL.md) |
| 3 | Diagrammes ↔ flux BI | [chapitre-02-preparation/08_FLUX_DONNEES_BI_DIAGRAMMES.md](./chapitre-02-preparation/08_FLUX_DONNEES_BI_DIAGRAMMES.md) |
| 4 | Préparation soutenance « Où est la BI ? » | [annexes/PREPARATION_SOUTENANCE_BI.md](./annexes/PREPARATION_SOUTENANCE_BI.md) |

---

## Synthèse en une page

**1. Problème réel**  
Le commerce international ne manque pas seulement d’outils numériques. Il manque surtout d’**exploitation des données** : informations éparpillées (silos), peu de KPIs, peu de prédiction.

**2. Solution**  
**GlobalTradeX** est un **système d’aide à la décision (DSS)** : il collecte les données opérationnelles, calcule des indicateurs et propose une BI prédictive.

**3. Livraison Agile**  
On construit d’abord une **base sécurisée** (comptes, rôles), puis les **données métier** (expéditions, documents), puis la **couche BI** (dashboards, retards). Chaque sprint ajoute de la valeur testable.

**4. De la donnée brute au KPI**  
Exemple : un document téléversé → analyse IA → validation courtier → agrégation → **taux de conformité** affiché sur le dashboard.

**5. Réponse au jury**  
La BI = **modélisation des KPIs + agrégations + BI prédictive**. L’assistant IA = **Advanced Analytics** (couche complémentaire).

---

## Où modifier le rapport Word

| Section rapport | Action |
|-----------------|--------|
| §1.3 Étude existant | `07_ETUDE_EXISTANT_1_3.md` + TABLE 1.0 |
| §1.6.3 Stratégie BI | `09_STRATEGIE_BI_CHAPITRE_1.md` |
| §1.6.2 NFR mesurables | `05_BESOINS_NON_FONCTIONNELS.md` |
| §1.6.1 Tableaux acteurs | `besoins-fonctionnels/TABLEAU_1_*.txt` (langage métier) |
| §2.4 Architecture Data | `02_ARCHITECTURE_DES_DONNEES.md` |
