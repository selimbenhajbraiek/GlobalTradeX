# Préparation soutenance — « Où est la BI dans votre projet ? »

> **Recommandation superviseur n°4** : préparer une réponse claire pour le jury.

---

## Réponse courte (20 secondes)

> « La BI est la **couche décisionnelle** de GlobalTradeX : KPIs sur les dashboards, agrégations dans `analytics.py`, et **BI prédictive** des retards dans `bi_delay_prediction.py`. L’assistant TradeFlow, c’est la couche **Advanced Analytics** en complément. »

---

## Réponse structurée (2 minutes)

### 1. Où est la BI ? — Trois niveaux

| Niveau | Contenu | Où le voir en démo |
|--------|---------|-------------------|
| **Descriptive** | KPIs, graphiques, volumes | Cockpits + page Analytics admin |
| **Prédictive** | Score de retard, corridors, transitaires | `/dashboard/transitaire/predictive`, PredictiveBiPanel |
| **Prescriptive (partielle)** | Synthèse Gemini + recommandations | Section synthèse exécutive du BI prédictif |

### 2. Ce n’est pas Power BI — pourquoi c’est quand même de la BI

- Entrepôt **logique** (MySQL OLTP + ELT Python)
- **Data Marts** par rôle (filtrage admin, transitaire, importateur)
- **Modélisation des indicateurs** (4 KPIs Chapitre 1)
- **Visualisation** Chart.js + panneaux dédiés

Détail : [06_STACK_BI_ET_JUSTIFICATION.md](../chapitre-02-preparation/06_STACK_BI_ET_JUSTIFICATION.md)

### 3. Assistant IA = Advanced Analytics

- **BI classique** : chiffres, tendances, scores
- **Advanced Analytics** : analyse documentaire IA, chat TradeFlow, synthèse en langage naturel
- Les deux se **complètent** ; la BI ne se réduit pas au chatbot

---

## Démo soutenance (ordre recommandé — 5 min BI)

1. **Admin** — Analytics globale + KPIs réseau  
2. **Courtier** — Téléverser / analyser document → valider → **conformité** visible  
3. **Transitaire** — Cockpit + **BI prédictive** (GTX-HIST, Karim Mansour)  
4. **Phrase clé** — « Voici comment un document devient un KPI » (cf. flux document → conformité)

Scénario complet : [GRADUATION_PRESENTATION_SCENARIO.md](./GRADUATION_PRESENTATION_SCENARIO.md)

---

## Questions jury probables — réponses simples

**Q : Pourquoi pas Power BI / Superset ?**  
> BI intégrée dans l’app multi-rôles, moteur prédictif custom explicable, déploiement PFE sans serveur BI supplémentaire.

**Q : Où est l’entrepôt de données ?**  
> Entrepôt logique sur MySQL ; agrégats calculés à la demande ; évolution possible vers DW physique.

**Q : Sprint 1 = comptes, où est la BI ?**  
> MVP BI au Sprint 5 ; sprints 1–4 préparent les données. Voir [07_JUSTIFICATION_MVP_INCREMENTAL.md](../chapitre-02-preparation/07_JUSTIFICATION_MVP_INCREMENTAL.md).

**Q : Différence BI et IA ?**  
> BI = indicateurs et prédiction chiffrée. IA = documents, chat, synthèse texte (Advanced Analytics).

---

## Slide suggérée « Architecture BI GlobalTradeX »

```
[ Données OLTP ] → [ ELT Python ] → [ KPIs + BI prédictive ] → [ Dashboards Chart.js ]
                                        ↓
                              [ Gemini : synthèse & IA doc ]
```

---

## Checklist avant soutenance

- [ ] `GOOGLE_API_KEY` configurée (Gemini)
- [ ] MySQL + `reset_and_seed_db.py` exécuté
- [ ] Comptes scénario (admin, Karim transitaire, Amira courtier)
- [ ] Parcours document → KPI conformité testé
- [ ] Page BI prédictive transitaire testée
