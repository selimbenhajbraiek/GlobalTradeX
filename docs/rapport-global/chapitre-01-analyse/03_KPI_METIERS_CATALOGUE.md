# Catalogue des KPIs métiers — GlobalTradeX

Référence unique pour remplacer les formulations vagues « indicateurs du cockpit » dans le Chapitre 1.

---

## KPI 1 — Taux de retard à l'arrivée

| Attribut | Détail |
|----------|--------|
| **Définition** | Part des expéditions dont la date d’arrivée réelle (ou statut `delayed` / `customs_hold` prolongé) dépasse l’ETA annoncée ou le délai médian du corridor. |
| **Formule (conceptuelle)** | `(nombre de dossiers en retard) / (nombre de dossiers terminés ou actifs avec ETA)` × 100 |
| **Source données** | `shipments.status`, `estimated_arrival`, `arrival_date`, historique par corridor |
| **BI prédictif** | Probabilité de retard **future** par dossier actif (`risk_score`, `risk_level`) |
| **Acteurs** | Admin (global), Transitaire (réseau + ses dossiers), Importateur / Exportateur (périmètre propre) |

---

## KPI 2 — Temps moyen de dédouanement

| Attribut | Détail |
|----------|--------|
| **Définition** | Durée moyenne entre l’entrée en statut `customs_hold` et la levée (passage à `in_transit` ou `delivered`) ou validation documentaire complète. |
| **Formule (conceptuelle)** | Moyenne des `(date_levée - date_entrée_douane)` sur les dossiers concernés |
| **Source données** | Historique des statuts, dates de validation documents (`is_verified`, `verified_at`) |
| **Acteurs** | Courtier (activité du jour), Admin (analytics), Importateur (ses dossiers bloqués) |

---

## KPI 3 — Taux de conformité des documents

| Attribut | Détail |
|----------|--------|
| **Définition** | Part des documents déposés validés du premier coup (sans rejet) après revue humaine et/ou score IA favorable. |
| **Formule (conceptuelle)** | `(documents validés sans rejet) / (documents soumis)` × 100 |
| **Source données** | `documents.is_verified`, `ai_result.valid`, `rejection_reason` |
| **IA associée** | Analyse Gemini (`analyze_customs_document`) avant décision courtier |
| **Acteurs** | Courtier (cockpit douane), Admin (file réseau), Exportateur (statut de ses pièces) |

---

## KPI 4 — Coût estimé vs coût réel

| Attribut | Détail |
|----------|--------|
| **Définition** | Écart entre le coût logistique/douanier **estimé** (calculateur, proposition IA de route) et le coût **constaté** en fin de dossier. |
| **Formule (conceptuelle)** | `écart_% = ((coût_réel - coût_estimé) / coût_estimé) × 100` |
| **Source données** | Module calculateur (`/api/calculator`), champs fret/douane sur expédition, suggestions IA `suggest-routes` |
| **Acteurs** | Importateur, Exportateur (création dossier), Admin (agrégats analytics) |

---

## Matrice KPI × cockpit par acteur

| Acteur | Cockpit | KPIs affichés / calculés |
|--------|---------|---------------------------|
| **Administrateur** | Vue globale + Analytics | Retard réseau, dédouanement moyen, conformité docs, écarts coût agrégés ; **BI prédictif** complet |
| **Importateur** | Cockpit importateur | Dossiers en douane, retards sur **ses** expéditions, conformité pièces reçues, écart coût estimé/réel |
| **Exportateur** | Cockpit exportateur | Expéditions actives, retards clients, conformité **ses** documents déposés, revenus vs coûts estimés |
| **Transitaire** | Cockpit fret | En transit, retards du jour, **performance transitaire** (BI), corridors à risque |
| **Courtier** | Cockpit douane | File d’attente, validées aujourd’hui, **taux conformité**, temps moyen de traitement |

---

## Libellé type pour une ligne de tableau (modèle)

Remplacer :

> *« Permet d’afficher un tableau de bord contenant des indicateurs… »*

Par :

> *« Permet d’afficher un **cockpit Data-Driven** exposant les KPIs métiers : **(1)** taux de retard à l’arrivée, **(2)** temps moyen de dédouanement, **(3)** taux de conformité documentaire, **(4)** coût estimé vs coût réel, ainsi que [spécificités rôle]. Les données alimentent la couche **BI prédictive** (risque de retard) lorsque le rôle y a accès. »*
