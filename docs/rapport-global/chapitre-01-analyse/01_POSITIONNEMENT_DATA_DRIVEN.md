# Positionnement Data-Driven — GlobalTradeX (Chapitre 1)

## Proposition à intégrer dès l'introduction du chapitre

> **GlobalTradeX** ne se limite pas à **digitaliser** des processus logistiques (saisie, stockage, consultation de dossiers). La plateforme adopte une démarche **Data-Driven** : elle **collecte**, **structure** et **exploite** les données opérationnelles (expéditions, documents, statuts, transitaires, corridors) pour les transformer en **connaissance actionnable** — indicateurs, alertes, analyses prédictives et recommandations — au service des importateurs, exportateurs, transitaires, courtiers et administrateurs.

## Formulation courte (résumé exécutif)

| Avant (numérisation) | Après (Data-Driven) |
|----------------------|---------------------|
| Afficher des tableaux de bord | Mesurer des **KPIs métiers** et détecter les écarts |
| Archiver des documents | Calculer le **taux de conformité** et prioriser la revue |
| Suivre un statut | Estimer le **risque de retard** et anticiper les goulots |
| Estimer un coût | Comparer **coût estimé vs coût réel** sur le cycle de vie du dossier |

## Paragraphe type pour §1.6 (Spécifications des besoins)

Les besoins fonctionnels décrits dans ce chapitre s'organisent autour de **trois couches** :

1. **Couche opérationnelle** — authentification, gestion des profils, création et suivi des expéditions, messagerie, notifications.
2. **Couche documentaire intelligente** — téléversement, analyse automatique des pièces douanières (intelligence artificielle), validation humaine par le courtier.
3. **Couche décisionnelle (BI)** — tableaux de bord par rôle alimentés par des **KPIs métiers** ; couche **BI prédictive** estimant la probabilité de retard à partir de l'historique des transitaires et des corridors logistiques, enrichie d'une synthèse IA pour l'administrateur et le transitaire.

## Lien avec la problématique PFE

La problématique du commerce international (fragmentation des acteurs, opacité des délais, non-conformité documentaire) se traite par :

- **Visibilité** — suivi GPS, statuts, fil d'activité ;
- **Conformité** — file de revue courtier + scoring IA documentaire ;
- **Anticipation** — BI prédictif (retards) et recommandations TradeFlow.

Ce positionnement justifie une architecture **séparant données opérationnelles et couche analytique** (détail au Chapitre 2, §2.4).

## Phrase de transition vers les tableaux par acteur

Chaque acteur dispose d'un **cockpit métier** dont les indicateurs ne sont pas décoratifs : ils répondent à des questions de pilotage précises (retards, dédouanement, conformité documentaire, écart de coût). Le détail des KPIs par rôle est donné dans le [catalogue KPI](./03_KPI_METIERS_CATALOGUE.md), la [stratégie BI](./09_STRATEGIE_BI_CHAPITRE_1.md) et les tableaux du dossier [besoins-fonctionnels/](./besoins-fonctionnels/).
