# Référence — Diagrammes de séquence (modèle SmartChain)

## Types de diagrammes dans l'ancien rapport

| Type | Exemple SmartChain | GlobalTradeX |
|------|-------------------|--------------|
| **SSD** (système) | Acteur + boîte système, 2–3 messages | Variante simplifiée possible |
| **MVC interaction** | Boundary (vert) → Controller (jaune) → Entity (rouge) | Page React → API FastAPI → MySQL |
| **ref** | Cadre `ref S'authentifier` en tête de séquence | Réutiliser pour tout CU après login |

## Conventions GlobalTradeX

- **Boundary** : page ou composant frontend (`/register`, `/dashboard/shipments/new`)
- **Controller** : routeur FastAPI (`AuthRouter`, `ShipmentsRouter`, …)
- **Entity** : persistance SQLAlchemy (`User`, `Shipment`, `Document`, …)
- **Services externes** : MailerSend, OpenAI (rectangle à droite)

Numérotation des messages : `1.`, `2.`, …  
Retours : flèches pointillées `-->>`

**Libellés GlobalTradeX** : français simple sur les flèches (pas de codes HTTP ni de noms techniques anglais). Exemples : « Demander la connexion », « Enregistrer l'expédition », « Afficher la confirmation ». Les détails techniques (URL API) restent optionnels dans le nom du participant contrôleur.

## Livrables Releases 1, 2 et 3

2 diagrammes par sprint + fichier **PROMPT_*.txt** pour générer le même schéma sur un site externe (Mermaid Live, Eraser, Lucidchart, etc.).

Index : `docs/releases/DIAGRAMMES_SEQUENCE_INDEX.md`

| Release | Sprints | Exemples d'opérations |
|---------|---------|------------------------|
| R1 | 1–2 | S'inscrire, Créer expédition |
| R2 | 3–4 | Téléverser document, Notifications |
| R3 | 5–6 | Assistant TradeFlow, Suivi GPS, Gérer utilisateurs, Analytics global |
