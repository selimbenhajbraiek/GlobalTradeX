# §1.3 — Étude de l'existant (référence rapport)

> **Étape 1 PFE** : citer des **concurrents réels** et un **tableau comparatif** argumenté (retour encadrement).

---

## Introduction (§1.3 — copier-coller)

Avant de définir les besoins de GlobalTradeX, nous analysons **trois solutions du marché** qui couvrent des parties différentes du commerce international :

1. **Flexport** — transit digital et visibilité fret ;
2. **Freightos** — marketplace et devis en ligne ;
3. **SAP Global Trade Services (GTS)** — conformité douanière enterprise.

Cette étude montre qu'**aucune solution ne combine** collaboration multi-acteurs, KPIs explicites et BI prédictive à coût maîtrisé. GlobalTradeX comble cette lacune.

---

## 1.3.1 Présentation des solutions existantes

### Flexport (transit digital)

**Flexport** (États-Unis, 2013) est une plateforme de **transit international digitalisée**. Elle propose la réservation de transport (mer, air), le **suivi en temps réel** des conteneurs, la gestion documentaire et des services douaniers. Son modèle repose sur un transitaire unique (Flexport) et des **tableaux de bord de visibilité**. La cible : PME et grands comptes qui externalisent leur fret.

**Forces** : visibilité transport, intégration douane.  
**Limites** : relation surtout client ↔ opérateur Flexport ; coût élevé ; peu orienté réseau multi-courtiers indépendants.

### Freightos (marketplace fret)

**Freightos** (Israël, marché international) est une **place de marché digitale** du fret. Elle permet de comparer des tarifs, réserver en ligne et obtenir des devis rapidement. La visibilité après réservation et l'intelligence douanière restent **secondaires** par rapport à l'achat de transport.

**Forces** : transparence tarifaire, rapidité de quotation.  
**Limites** : faible workflow documentaire multi-parties ; pas de pilotage par KPIs pour un réseau complet.

### SAP Global Trade Services (GTS)

**SAP Global Trade Services** s'intègre à l'écosystème **ERP SAP**. Il couvre la **conformité douanière** : déclarations, listes de sanctions, calcul de droits et reporting réglementaire. Le suivi GPS opérationnel n'est pas le cœur du produit.

**Forces** : référence compliance pour grandes entreprises.  
**Limites** : déploiement lourd, licence coûteuse, hors cible PME agile ; pas de collaboration ouverte importateur / exportateur / transitaire / courtier.

---

## 1.3.2 Analyse critique et limites

| Limite | Flexport | Freightos | SAP GTS |
|--------|----------|-----------|---------|
| **Prix** | Sur devis, coût élevé | Abonnement / commission | Licence enterprise très élevée |
| **Multi-acteurs** | Client ↔ Flexport surtout | Acheteur ↔ transporteur | Processus internes entreprise |
| **Courtier / validation doc** | Partiel | Faible | Fort mais peu PME |
| **BI prédictive accessible** | Visibilité, peu prédictif ouvert | Limité | Reporting avancé mais complexe |
| **Cible PFE / PME** | Sur devis | Marketplace | Projet d'intégration majeur |

**Constat** : aucune solution ne réunit, dans **un même espace collaboratif**, les rôles importateur, exportateur, transitaire et courtier, avec des **KPIs métiers explicites** et une **BI prédictive des retards** à coût maîtrisé.

**Positionnement GlobalTradeX** : plateforme **Data-Driven** avec workflow multi-rôles, intelligence douanière (IA + validation courtier), suivi GPS, cockpits KPI et BI prédictive.

---

## TABLEAU 1.0 — Comparatif des solutions vs GlobalTradeX

*(Version Word : `besoins-fonctionnels/TABLEAU_1_0_Comparatif_concurrents.txt`)*

| Critère | Flexport | Freightos | SAP GTS | **GlobalTradeX** |
|---------|----------|-----------|---------|------------------|
| **Suivi GPS / visibilité** | Élevé | Moyen | Faible | **Oui** — carte temps réel, statuts logistiques |
| **Intelligence douanière** | Élevé | Faible | Très élevé | **Oui** — analyse IA + validation courtier |
| **BI / Analytics** | Élevé (visibilité) | Faible à moyen | Élevé (licence) | **Oui** — 4 KPIs + BI prédictive retards |
| **Collaboration multi-acteurs** | Moyen | Faible | Moyen | **Élevé** — 5 rôles + messagerie dossier |
| **Modèle de prix** | Sur devis (élevé) | Freemium / abonnement | Licence SAP (très élevé) | **Coût marginal faible** (open source) |
| **Cible principale** | PME/GE externalisant le fret | Importateurs cherchant devis | Grandes entreprises SAP | **Réseau collaboratif** PME / PFE |

**Légende** : Faible / Moyen / Élevé / Très élevé — appréciation qualitative (documentation éditeurs, 2024–2025).

---

## Paragraphe de transition (fin §1.3)

> L'analyse comparée révèle un **espace disponible** pour une solution unifiant visibilité, conformité documentaire, analytics et collaboration multi-rôles. GlobalTradeX s'inscrit dans cette lacune. Les besoins fonctionnels, la **stratégie BI** (§1.6.3) et les contraintes non fonctionnelles sont formalisés aux §1.6 et §1.6.2.

---

## Sources bibliographiques

- Flexport : https://www.flexport.com/
- Freightos : https://www.freightos.com/
- SAP Global Trade Services : https://www.sap.com/products/scm/global-trade-services.html
