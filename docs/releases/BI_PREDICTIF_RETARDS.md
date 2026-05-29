# BI prédictif — Prédiction des retards (IA + analytique)

## Objectif (retour encadrement PFE)

Compléter l’IA **documentaire** (Gemini) par une **IA prédictive BI** : estimation du risque de retard d’expédition à partir de l’**historique des transitaires**, des corridors et des signaux opérationnels.

## Architecture

| Couche | Composant |
|--------|-----------|
| Moteur BI | `backend/services/bi_delay_prediction.py` |
| API | `GET /api/analytics/predictive-bi?include_ai_summary=true` |
| Synthèse IA | Gemini 2.5 Flash sur le rapport JSON — repli règles métier si clé absente |
| UI Admin | `TradeAnalyticsPage` → section **PredictiveBiPanel** |
| UI Transitaire | `/dashboard/transitaire/predictive` + aperçu cockpit |

## Facteurs du score (explicable)

1. Taux de retard lissé par **corridor** (origine, destination, mode de transport)
2. Performance historique du **transitaire** (`forwarder_user_id` sur `shipments`)
3. Taux global réseau, type de marchandise, statut (ex. `customs_hold`)
4. Progression GPS et documents non vérifiés

## Données transitaire

- Colonne `shipments.forwarder_user_id` (migration `f6a7b8c9d0e1`)
- Assignation automatique quand un transitaire met à jour le statut
- Jeu de test : `python reset_and_seed_db.py` (historique GTX-HIST-* + Karim Mansour)

## Pour le rapport

> *« GlobalTradeX intègre une couche BI prédictive qui calcule, pour chaque expédition active, une probabilité de retard à partir de l’historique des transitaires et des corridors logistiques. Une synthèse Gemini transforme ces indicateurs en recommandations opérationnelles pour l’administrateur et le transitaire. »*
