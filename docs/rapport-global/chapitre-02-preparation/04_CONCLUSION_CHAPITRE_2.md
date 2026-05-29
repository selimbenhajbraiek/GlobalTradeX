# §2.7 Conclusion du Chapitre 2 (texte révisé)

Dans ce chapitre, nous avons présenté la **phase de préparation (Sprint 0)** du projet GlobalTradeX : méthodologie **Scrum**, **Product Backlog** MoSCoW, planification en releases/sprints, choix **technologiques** (FastAPI, Next.js, MySQL, Gemini), **architecture des données** OLTP/OLAP, **stack BI intégrée** (Chart.js, moteur Python, BI prédictive) avec justification face aux outils classiques (Power BI, Superset, Metabase), et **patterns architecturaux** explicitement nommés : **MVC**, **Repository**, **CQRS léger** (séparation lecture analytique / écriture transactionnelle) et **Service Layer**.

Un apport majeur de cette phase, en réponse aux observations d'encadrement, est la définition explicite de l'**architecture des données** : séparation **OLTP** (transactions métier sur MySQL) et **OLAP** (analytics et BI prédictive via services FastAPI et pipeline **ELT** à la demande), avec **Data Marts logiques** par rôle et perspective d'évolution vers un **Data Warehouse** physique.

Les **diagrammes UML** (cas d'utilisation, classes) illustrent les interactions entre acteurs et modules. Ces éléments constituent la base pour la phase de **conception détaillée** et le **développement incrémental** décrits aux chapitres suivants (releases 1 à 3).

Le chapitre suivant détaillera la **réalisation** sprint par sprint et la validation des fonctionnalités, en s'appuyant sur l'architecture OLTP/OLAP définie ici.
