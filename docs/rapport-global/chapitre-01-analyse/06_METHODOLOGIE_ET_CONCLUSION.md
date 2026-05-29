# §1.7 Méthodologie Agile : Scrum & §1.8 Conclusion

## 1.7 Méthodologie Agile : Scrum

### Contexte et choix méthodologique

Le projet **GlobalTradeX** est organisé en **releases** et **sprints** time-boxés (TABLE 2.2, Chapitre 2). Ce mode de livraison incrémentale correspond à la méthode **Scrum**, framework Agile le plus adapté à un PFE avec jalons de soutenance.

> **Précision méthodologique** : Scrum structure le travail en **itérations fixes** (sprints) et en **incréments livrables**. Kanban, en revanche, est un flux continu **sans sprints ni releases figées**. GlobalTradeX utilise un **tableau visuel** (Trello : *To Do / In Progress / Done*) comme **outil de suivi**, mais la gouvernance du projet repose sur **Scrum**, pas sur Kanban pur.

### Rôles Scrum (équipe PFE)

| Rôle | Responsabilité |
|------|----------------|
| **Product Owner** | Priorise le backlog (MoSCoW), valide les user stories, arbitre la valeur métier |
| **Scrum Master** | Facilite les cérémonies, lève les impediments, respecte le time-box |
| **Équipe de développement** | Conçoit, implémente et teste les incréments (FastAPI, Next.js, MySQL) |

### Artefacts

| Artefact | GlobalTradeX |
|----------|--------------|
| **Product Backlog** | TABLE 2.1 — 53 user stories, priorisées **MoSCoW** |
| **Sprint Backlog** | Sous-ensemble de stories sélectionnées en Sprint Planning |
| **Incrément** | Version déployable à la fin de chaque sprint (Release 1 → 3) |

### Priorisation MoSCoW (Product Backlog)

Les user stories ne se limitent plus à « Élevée / Moyenne ». Chaque story est classée selon **MoSCoW** :

| Priorité | Signification | Critère GlobalTradeX |
|----------|---------------|----------------------|
| **Must** | Indispensable | Sans cela, pas de démo soutenance ni parcours métier complet |
| **Should** | Important | Forte valeur ; reportable au sprint suivant si contrainte de temps |
| **Could** | Souhaitable | Confort, démo avancée ou option (ex. avatar HeyGen, landing) |
| **Won't** | Hors périmètre v1 | Documenté explicitement (facturation, app mobile native) |

Détail des affectations : [chapitre-02-preparation/05_PRIORISATION_MOSCOW.md](../chapitre-02-preparation/05_PRIORISATION_MOSCOW.md).

### Releases et sprints

| Release | Sprints | Objectif |
|---------|---------|----------|
| **Release 1** | Sprint 1–2 | Comptes, profils, expéditions, produits (OLTP cœur) |
| **Release 2** | Sprint 3–4 | Documents, IA Gemini, notifications, messagerie |
| **Release 3** | Sprint 5–6 | Analytics, BI prédictive, cockpits KPI, admin, scénario soutenance |
| **Sprint 0** | Préparation | Backlog, architecture, UML, stack (Chapitre 2) |

Durée indicative : **65 jours** de développement (TABLE 2.2).

### Cérémonies Scrum

| Cérémonie | Fréquence | Objectif | Application GlobalTradeX |
|-----------|-----------|----------|--------------------------|
| **Sprint Planning** | Début de chaque sprint | Sélectionner les stories du sprint backlog, estimer l'effort | Planifier modules 1–14 par sprint (TABLE 2.2) |
| **Daily Scrum** | Quotidien (~15 min) | Synchroniser l'équipe : hier / aujourd'hui / blocages | Point court sur Trello + avancement API/UI |
| **Sprint Review** | Fin de sprint | Démontrer l'incrément au PO / encadrant | Démo des user stories *Must* du sprint |
| **Sprint Retrospective** | Fin de sprint | Améliorer processus et qualité | Ajustements priorisation, dette technique, retours superviseur |

### Definition of Done (DoD)

Une user story est **Done** lorsque : code mergé, API testée (Postman), écran fonctionnel, rôle RBAC vérifié, documentation sprint à jour.

### Intégration des retours superviseur

Les itérations Scrum ont permis d'ajouter en cours de projet : **KPIs métiers explicites** (Chapitre 1), **architecture OLTP/OLAP** (Chapitre 2) et **BI prédictive** (Sprint 5) sans remettre en cause les incréments déjà livrés — conformément à l'Agilité (adaptation du backlog).

---

## 1.8 Conclusion (version révisée)

Dans ce premier chapitre, nous avons présenté le **contexte** du commerce international et la **problématique** de coordination entre acteurs. L'analyse des solutions existantes a positionné **GlobalTradeX** comme une plateforme **Data-Driven** : transformation des données logistiques en **connaissance** (KPIs, BI prédictive, synthèses IA).

Nous avons défini les **acteurs**, les **besoins fonctionnels** avec **indicateurs métiers mesurables**, et les **besoins non fonctionnels**. La **méthodologie Agile Scrum** (sprints, releases, cérémonies, backlog MoSCoW) structure le déroulement du projet et justifie la planification du Chapitre 2.

Le chapitre suivant détaille la **phase de préparation (Sprint 0)** : technologies, **architecture des données**, backlog et diagrammes UML.
