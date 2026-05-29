# Priorisation MoSCoW — Product Backlog (TABLE 2.1)

## Légende

| MoSCoW | Définition | Part du backlog |
|--------|------------|-----------------|
| **Must** | Obligatoire pour la soutenance et le parcours métier de bout en bout | 35 stories (~66 %) |
| **Should** | Forte valeur business ; livrée si capacité sprint suffisante | 12 stories (~23 %) |
| **Could** | Option / confort / démo enrichie | 6 stories (~11 %) |
| **Won't** | Hors périmètre v1 PFE (non listées dans le tableau) | — |

## Critères de valeur métier

1. **Must** — Bloquant si absent : auth, cycle expédition, documents + validation courtier, cockpits KPI, admin, BI prédictive (retour encadrement).
2. **Should** — Améliore collaboration et UX : messagerie, GPS, assistant TradeFlow, analytics par rôle.
3. **Could** — Renforce la démo sans être critique : landing, carte mondiale admin, avatar HeyGen, listes « validés aujourd'hui ».

## Hors périmètre (Won't — v1)

| Élément | Raison |
|---------|--------|
| Application mobile native | Web responsive suffisant pour le PFE |
| Facturation / abonnements SaaS | Hors cahier des charges académique |
| Entrepôt de données physique séparé | OLAP applicatif retenu (cf. architecture données) |
| Intégration ERP tiers (SAP, etc.) | Évolution post-PFE |

## Synthèse par module

| Module | Must | Should | Could |
|--------|------|--------|-------|
| 1 Auth | 1.1–1.4 | — | — |
| 2 Profil | 2.1 | 2.2, 2.3 | — |
| 3 Expéditions | 3.1–3.4, 3.6–3.9 | 3.5 | 3.10 |
| 4 Produits | 4.1 | 4.2, 4.3 | — |
| 5 Documents | 5.1–5.4, 5.6–5.8 | 5.5 | 5.9 |
| 6 Calculateur | — | 6.1 | 6.2 |
| 7 GPS / Cartes | — | 7.1 | 7.2 |
| 8 Cockpits KPI | 8.1–8.4 | — | — |
| 9 Notifications | 9.1–9.3 | 9.4 | — |
| 10 Messagerie | — | 10.1 | — |
| 11 Assistant | — | 11.1 | 11.2 |
| 12 Admin users | 12.1–12.4 | — | — |
| 13 Analytics BI | 13.1, 13.3 | 13.2, 13.4 | — |
| 14 Vitrine | — | — | 14.1 |

## Alignement sprints (Must d'abord)

| Sprint | Stories Must ciblées |
|--------|---------------------|
| Sprint 1 | 1.x, 2.1, 12.x (auth, profil, admin base) |
| Sprint 2 | 3.1–3.4, 3.6–3.9, 4.1 (expéditions, produits) |
| Sprint 3 | 5.1–5.8 (documents + IA Gemini) |
| Sprint 4 | 9.1–9.3 + Should 10.1 (notifications, messagerie) |
| Sprint 5 | 8.x, 13.1, 13.3 + Should 6.1, 7.1, 11.1 (KPIs, BI, assistant) |
| Sprint 6 | Should/Could restants, scénario seed GTX, polish soutenance |

## Phrase rapport (§2.2)

> Le backlog produit (TABLE 2.1) est priorisé selon **MoSCoW** : les stories **Must** garantissent le parcours de démonstration (authentification → expédition → documents → validation → KPIs → BI prédictive) ; les **Should** enrichissent la collaboration ; les **Could** couvrent les options de présentation.
