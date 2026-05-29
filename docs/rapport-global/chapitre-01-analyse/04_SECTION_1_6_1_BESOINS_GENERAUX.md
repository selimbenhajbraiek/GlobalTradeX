# §1.6.1 — Besoins fonctionnels (liste générale)

Texte de référence issu du rapport (capture Chapitre 1), **révisé** avec la couche Data-Driven.

---

## Liste des besoins fonctionnels généraux

Pour assurer une gestion complète des opérations logistiques, la plateforme **GlobalTradeX** doit répondre aux besoins fonctionnels suivants :

1. **Authentification des utilisateurs** — connexion sécurisée, vérification e-mail, récupération de mot de passe.
2. **Gestion des comptes et des profils** — mise à jour des informations personnelles et préférences.
3. **Création et gestion des expéditions** — cycle de vie du dossier GTX, parties prenantes, produits associés.
4. **Suivi des expéditions en temps réel** — statuts logistiques, GPS, notifications automatiques.
5. **Pilotage Data-Driven et tableaux de bord par rôle** — exposition des **KPIs métiers** (retard à l'arrivée, dédouanement, conformité documentaire, coût estimé vs réel) et, pour les rôles autorisés, accès à la **BI prédictive** (risque de retard).
6. **Gestion des utilisateurs par l'administrateur** — création, rôles, activation/désactivation, garde-fous de sécurité.
7. **Notifications et alertes** — événements métier, préférences par canal, messagerie collaborative.

---

## Paragraphe d'introduction recommandé (avant les tableaux par acteur)

> Les besoins ci-dessus sont déclinés par **acteur métier** dans les tableaux 1.1 à 1.7. La **stratégie BI** (§1.6.3) précise les KPIs et les décisions automatisées. Chaque cockpit agrège des **indicateurs de performance** alignés sur la logistique internationale.

---

## §1.6.3 — Stratégie BI (section dédiée)

Voir le fichier complet : [09_STRATEGIE_BI_CHAPITRE_1.md](./09_STRATEGIE_BI_CHAPITRE_1.md)

Résumé : **4 KPIs** (retard, dédouanement, conformité, coût) ; **automatisation** des alertes et scores ; **validation humaine** pour la douane ; architecture **OLTP/OLAP** au Chapitre 2.

---

## Acteurs couverts par les tableaux

| Acteur | Fichier tableau |
|--------|-----------------|
| Administrateur | `besoins-fonctionnels/TABLEAU_1_7_Besoins_fonctionnels_Administrateur.txt` |
| Exportateur | `besoins-fonctionnels/TABLEAU_1_4_Besoins_fonctionnels_Exportateur.txt` |
| Importateur | `besoins-fonctionnels/TABLEAU_1_3_Besoins_fonctionnels_Importateur.txt` |
| Transitaire | `besoins-fonctionnels/TABLEAU_1_5_Besoins_fonctionnels_Transitaire.txt` |
| Courtier en douane | `besoins-fonctionnels/TABLEAU_1_6_Besoins_fonctionnels_Courtier.txt` |
| Développeur | `besoins-fonctionnels/TABLEAU_1_8_Besoins_fonctionnels_Developpeur.txt` |
| Chatbot TradeFlow | `besoins-fonctionnels/TABLEAU_1_9_Besoins_fonctionnels_Chatbot.txt` |
