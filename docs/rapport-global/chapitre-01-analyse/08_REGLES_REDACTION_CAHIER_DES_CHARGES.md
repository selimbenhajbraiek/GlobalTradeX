# Règles rédactionnelles — §1.6.1 Besoins fonctionnels

> **Retour encadrement** : le cahier des charges est **fonctionnel / métier**. Éviter JWT, SMTP, endpoints, chemins URL, noms de champs BDD.

## Formulations à utiliser

| ❌ Éviter (technique) | ✅ Préférer (métier) |
|----------------------|---------------------|
| Un jeton JWT ouvre le cockpit | Après authentification, l'utilisateur accède à **son tableau de bord sécurisé** selon son rôle |
| Lien SMTP / e-mail (SMTP) | Lien de réinitialisation **reçu par e-mail** |
| `/dashboard/importateur` | **Espace importateur** (tableau de bord dédié) |
| endpoint `/notify` | Fonction d'**envoi de notification** aux utilisateurs ciblés |
| `is_verified`, `ai_result` | La pièce est **marquée comme validée** ; le **résultat de l'analyse** est conservé |
| customs_hold (seul) | **Blocage douanier** (ou statut « en attente douane ») |
| owner, forwarder_user_id | **commanditaire**, **transitaire assigné** |

## Où documenter la technique ?

| Sujet | Chapitre |
|-------|----------|
| JWT, API REST, FastAPI | Chapitre 2 (technologies) / Chapitre 3 (conception) |
| Schéma BDD, Alembic | Chapitre 2 (architecture données) |
| Gemini, HeyGen | Chapitre 2 §technologies + Chapitre réalisation |

## Exception acceptable en §1.6.1

- **TradeFlow**, **Gemini** : acceptables comme **nom de produit / capacité IA** si formulés côté métier (« analyse automatique par intelligence artificielle »).
- Références **GTX-20240315-00042** : acceptables (identifiant métier de dossier).
