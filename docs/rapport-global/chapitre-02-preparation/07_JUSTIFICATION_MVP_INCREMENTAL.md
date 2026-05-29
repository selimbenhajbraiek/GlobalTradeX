# Justification MVP & priorisation backlog (Scrum)

> **Recommandation superviseur n°2** : justifier pourquoi le Sprint 1 est « Gérer Compte » et non un MVP BI pur (dashboard retards + données historiques).

---

## Ce que le superviseur propose (MVP BI « pur »)

Un MVP typique pour un projet BI serait :

1. Injecter des **données d’expéditions historiques** ;
2. Afficher un **dashboard de retards** ;
3. Ajouter les comptes utilisateurs **ensuite**.

C’est logique pour une **preuve BI isolée**. GlobalTradeX est une **plateforme multi-rôles** : la BI s’appuie sur des expéditions, documents et droits d’accès réels.

---

## Notre approche incrémentale (justification simple)

Nous livrons en ** trois vagues de valeur** :

| Vague | Sprints | Valeur livrée | Pourquoi d’abord |
|-------|---------|---------------|------------------|
| **Fondation** | 1 | Comptes, rôles, sécurité | Sans authentification, pas de dashboard par acteur ni de données protégées |
| **Données métier** | 2–4 | Expéditions, documents, notifications | La BI a besoin de **faits** : statuts, dates, pièces validées ou rejetées |
| **Intelligence** | 5–6 | KPIs, analytics, BI prédictive, seed historique | Les indicateurs et prédictions **consomment** les données des sprints précédents |

**En une phrase :** on ne peut pas montrer un « taux de conformité documentaire » sans documents téléversés, ni un « risque de retard par transitaire » sans expéditions liées à un transitaire identifié.

---

## Où se trouve le « MVP BI » dans notre plan ?

Le **vertical slice BI** est livré au **Sprint 5** (Release 3) :

1. Jeu historique `GTX-HIST-*` via `reset_and_seed_db.py` ;
2. Endpoints `/api/analytics/*` et `/api/analytics/predictive-bi` ;
3. Cockpits KPI (Chart.js) + `PredictiveBiPanel` ;
4. Démonstration admin + transitaire.

C’est l’équivalent du MVP BI du superviseur, **branché** sur une plateforme déjà fonctionnelle.

---

## Priorisation MoSCoW (TABLE 2.1)

| Priorité | Sens | Exemple |
|----------|------|---------|
| **Must** | Indispensable soutenance | Auth, expéditions, documents, KPIs, BI prédictive |
| **Should** | Forte valeur, sprint suivant si besoin | Messagerie, GPS, assistant TradeFlow |
| **Could** | Option | Landing page, avatar HeyGen |

Les stories **Must** du module 13 (Analytics & BI) sont planifiées dès le Sprint 5, pas en Sprint 1, car elles **dépendent** des modules 1–5.

---

## Paragraphe rapport (§2.2 ou §2.3 — copier-coller)

> Dans une démarche Scrum, GlobalTradeX privilégie une livraison **incrémentale** : le Sprint 1 pose la **fondation sécurisée** (comptes et rôles) indispensable à une plateforme multi-acteurs. Les sprints 2 à 4 alimentent le **référentiel de faits** (expéditions, documents, statuts). Le **MVP BI** — injection d’historique, dashboards de KPIs et prédiction des retards — est livré au **Sprint 5**, lorsque les données sources existent. Cette séquence respecte les dépendances métier tout en atteignant l’objectif BI du PFE.

---

## Réponse oral jury (30 secondes)

> « Notre MVP BI, c’est le Sprint 5 : seed historique, analytics et BI prédictive. Les sprints 1 à 4 préparent les **données** et la **sécurité** sans lesquelles un dashboard de retards serait une démo vide, sans lien avec le métier multi-rôles. »

Voir aussi : [05_PRIORISATION_MOSCOW.md](./05_PRIORISATION_MOSCOW.md), [backlog/TABLEAU_2_2_Planification_sprints.txt](./backlog/TABLEAU_2_2_Planification_sprints.txt).
