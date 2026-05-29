# §1.6.2 — Besoins non fonctionnels (mesurables)

> **Étape 3 PFE** : contraintes **quantifiables** — temps de réponse, disponibilité, volume de données (retour encadrement).

Les choix techniques (authentification, base de données, framework) sont **justifiés au Chapitre 2/3**, pas dans ce cahier des charges.

---

## Introduction

GlobalTradeX doit garantir la **fiabilité** et la **rapidité** des données alimentant les KPIs et la BI prédictive. Les exigences ci-dessous sont **mesurables** et testables en soutenance ou par scénario de charge.

---

## Tableau synthèse — Seuils cibles

| Domaine | Indicateur | Seuil cible |
|---------|------------|-------------|
| **Disponibilité** | Taux de disponibilité service | **99,9 %** (hors maintenance planifiée) |
| **Performance — dashboards** | Temps d'affichage KPIs + graphiques | **≤ 3 secondes** |
| **Performance — dashboards** | Volume historique supporté | **1 million de lignes** expéditions |
| **Performance — listes** | Première page (25 dossiers) | **≤ 1 seconde** |
| **Performance — connexion** | Authentification | **≤ 2 secondes** |
| **Performance — IA document** | Analyse d'un fichier (≤ 10 Mo) | **≤ 15 secondes** |
| **Performance — BI prédictive** | Rapport complet + synthèse | **≤ 5 secondes** |
| **Volume — utilisateurs** | Comptes simultanés (cible production) | **500 utilisateurs** |
| **Volume — expéditions** | Dossiers actifs en base | **50 000 expéditions** |
| **Volume — documents** | Pièces stockées | **200 000 fichiers** |
| **Sécurité** | Accès inter-rôles non autorisé | **0 succès** sur 100 tentatives testées |

*Note PFE* : le jeu de démonstration (`reset_and_seed_db.py`) contient un volume réduit (~100 expéditions). Les seuils définissent la **cible de conception** validée par l'architecture (pagination, ELT, index).

---

## Sécurité

| Exigence | Critère mesurable |
|----------|-------------------|
| Authentification | 100 % des écrans métier (hors vitrine publique) exigent une connexion identifiée |
| Autorisation par rôle | 0 accès non autorisé sur 100 tentatives de navigation inter-rôles |
| Mots de passe | Stockage haché ; politique minimale **8 caractères** |
| Documents douaniers | Seuls le déposant, les acteurs du dossier et le courtier habilité peuvent consulter une pièce |
| Déconnexion | Session clôturée en moins de **2 secondes** |

---

## Disponibilité

| Exigence | Critère mesurable |
|----------|-------------------|
| Disponibilité service | **99,9 %** sur l'environnement de production cible |
| Fenêtre maintenance | Maximum **4 heures / mois** annoncées à l'avance |
| Continuité métier | Si le module BI est indisponible, les fonctions transactionnelles (expéditions, documents) restent accessibles |

---

## Performance et volumétrie

| Exigence | Critère mesurable |
|----------|-------------------|
| Tableaux de bord analytiques | Affichage complet en **≤ 3 s** pour **1 M** lignes d'historique |
| Listes opérationnelles | Première page de **25** expéditions en **≤ 1 s** |
| Analyse IA document | Résultat en **≤ 15 s** par fichier PDF/image **≤ 10 Mo** |
| BI prédictive | Rapport + synthèse en **≤ 5 s** (jeu seed soutenance) |
| Authentification | Réponse en **≤ 2 s** |
| Upload document | Téléversement fichier **≤ 10 Mo** en **≤ 30 s** (réseau standard) |
| Messagerie | Envoi d'un message en **≤ 2 s** |

### Capacité de stockage (cible production)

| Donnée | Volume supporté |
|--------|-----------------|
| Expéditions (actives + archivées) | **50 000** dossiers |
| Documents douaniers | **200 000** fichiers |
| Utilisateurs enregistrés | **500** comptes |
| Historique BI (expéditions terminées) | **1 000 000** lignes agrégables |

---

## Convivialité

| Exigence | Critère mesurable |
|----------|-------------------|
| Création expédition | Réalisable en **≤ 4 étapes** sans aide externe |
| Lisibilité KPIs | **4 indicateurs** visibles sans défilement (écran 1920×1080) |
| Messages d'erreur | Texte explicite en français sur 100 % des formulaires critiques |

---

## Extensibilité et architecture

| Exigence | Critère mesurable |
|----------|-------------------|
| Nouveau KPI | Ajout sans modification des tables transactionnelles cœur |
| Nouveau rôle | Ajout d'un sixième rôle estimé à **≤ 2 jours** (conception) |
| Séparation OLTP / OLAP | 100 % des écritures métier via modules transactionnels ; 0 écriture depuis l'analytique |
| Migrations schéma | 100 % des évolutions versionnées |

---

## Paragraphe rapport (copier-coller §1.6.2)

> Les besoins non fonctionnels de GlobalTradeX incluent une **disponibilité cible de 99,9 %**, un **affichage des tableaux de bord en moins de 3 secondes** pour un historique de **1 million de lignes**, et des seuils définis pour l'authentification (**2 s**), les listes opérationnelles (**1 s**) et l'analyse documentaire IA (**15 s**). La plateforme doit supporter **50 000 expéditions**, **200 000 documents** et **500 utilisateurs** en configuration cible. La sécurité repose sur une authentification systématique et une autorisation stricte par rôle. Les détails d'implémentation sont traités aux chapitres de conception et de réalisation.
