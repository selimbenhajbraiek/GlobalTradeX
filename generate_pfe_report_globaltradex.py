# -*- coding: utf-8 -*-
"""
Génère le rapport PFE GlobalTradeX (structure alignée sur le modèle Selim BEN HAJ BRAIEK).
Usage: pip install reportlab && python generate_pfe_report_globaltradex.py
Sortie: docs/PFE_GlobalTradeX_Rapport.pdf
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = Path(__file__).resolve().parent / "docs" / "PFE_GlobalTradeX_Rapport.pdf"

BASE = getSampleStyleSheet()
STYLES = {
    "cover_title": ParagraphStyle(
        "cover_title",
        parent=BASE["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        spaceAfter=16,
    ),
    "cover_sub": ParagraphStyle(
        "cover_sub",
        parent=BASE["Normal"],
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        spaceAfter=8,
    ),
    "chapter": ParagraphStyle(
        "chapter",
        parent=BASE["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        spaceBefore=14,
        spaceAfter=10,
    ),
    "section": ParagraphStyle(
        "section",
        parent=BASE["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        spaceBefore=10,
        spaceAfter=6,
    ),
    "subsection": ParagraphStyle(
        "subsection",
        parent=BASE["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        spaceBefore=8,
        spaceAfter=4,
    ),
    "body": ParagraphStyle(
        "body",
        parent=BASE["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    ),
    "body_left": ParagraphStyle(
        "body_left",
        parent=BASE["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        alignment=TA_LEFT,
        spaceAfter=4,
    ),
    "toc": ParagraphStyle(
        "toc",
        parent=BASE["Normal"],
        fontSize=11,
        leading=16,
        leftIndent=12,
        spaceAfter=2,
    ),
    "caption": ParagraphStyle(
        "caption",
        parent=BASE["Normal"],
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        spaceAfter=10,
    ),
    "footer": ParagraphStyle(
        "footer",
        parent=BASE["Normal"],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.grey,
    ),
}


def P(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), STYLES[style])


def bullets(items: list[str], style: str = "body") -> ListFlowable:
    return ListFlowable(
        [ListItem(P(it, style), leftIndent=6) for it in items],
        bulletType="bullet",
        leftIndent=18,
        bulletFontName="Helvetica",
        bulletFontSize=9,
    )


def table(data: list[list], col_widths=None) -> Table:
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EAF6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1e1b4b")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawCentredString(A4[0] / 2, 1.2 * cm, "PFE — GlobalTradeX — Plateforme collaborative de commerce international")
    canvas.drawRightString(A4[0] - 1.8 * cm, 1.2 * cm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def build_story() -> list:
    s: list = []

    # —— Page de garde ——
    s.append(Spacer(1, 3 * cm))
    s.append(P("Projet de Fin d'Études", "cover_sub"))
    s.append(P("Conception et réalisation d'une plateforme web<br/>de pilotage du commerce international", "cover_title"))
    s.append(Spacer(1, 0.5 * cm))
    s.append(P("<b>GlobalTradeX</b>", "cover_sub"))
    s.append(Spacer(1, 2 * cm))
    s.append(P("Présenté en vue de l'obtention du diplôme d'ingénieur", "cover_sub"))
    s.append(Spacer(1, 1.5 * cm))
    s.append(P("Année universitaire 2025 — 2026", "cover_sub"))
    s.append(PageBreak())

    # —— Résumé ——
    s.append(P("Résumé", "chapter"))
    s.append(
        P(
            "Le commerce international repose sur la coordination de nombreux acteurs — importateurs, "
            "exportateurs, transitaires et courtiers en douane — autour d'un même dossier d'expédition. "
            "Les échanges demeurent souvent fragmentés entre courriels, tableurs et outils propriétaires "
            "peu adaptés aux PME. <b>GlobalTradeX</b> est une application web full-stack qui centralise "
            "le cycle de vie des expéditions : création de commandes, catalogue produits, documents "
            "commerciaux, transitions de statut logistique, contrôle douanier assisté par intelligence "
            "artificielle, messagerie inter-partenaires et tableaux de bord par rôle. "
            "L'architecture repose sur une API REST FastAPI, une interface Next.js et une base MySQL. "
            "Le présent document suit la démarche d'analyse, de spécification et de préparation "
            "du projet (chapitres 1 et 2), sur le modèle méthodologique Kanban."
        )
    )
    s.append(Spacer(1, 8))
    s.append(P("<b>Mots-clés :</b> commerce international, supply chain, FastAPI, Next.js, "
                "dédouanement, traçabilité, intelligence artificielle.", "body_left"))
    s.append(PageBreak())

    # —— Table des matières ——
    s.append(P("Table des matières", "chapter"))
    toc = [
        "Chapitre 1. Analyse et Spécification des Besoins",
        "    1.1 Contexte du projet",
        "    1.1.2 Problématique",
        "    1.2 Étude de l'existant",
        "    1.2.1 Revue des solutions existantes",
        "    1.2.2 Critiques des solutions existantes",
        "    1.3 Solution proposée",
        "    1.4 Spécification des besoins",
        "    1.4.1 Identification des acteurs",
        "    1.4.2 Spécifications des besoins fonctionnels",
        "    1.4.3 Spécifications des besoins non fonctionnels",
        "    1.5 Méthodologie",
        "    Conclusion",
        "Chapitre 2. Sprint 0 : Phase de Préparation",
        "    Introduction",
        "    2.1 Pilotage du projet avec KANBAN",
        "    2.2 Planification des sprints",
        "    2.3 Technologies et outils de développement",
        "    2.3.1 Développement Back-end",
        "    2.3.2 Développement Front-end",
        "    2.3.3 Outils de conception et de développement",
        "    2.4 Style architectural & Pattern",
        "    2.4.1 Style architectural",
        "    2.4.2 Pattern architectural",
        "    2.5 Diagrammes génériques",
        "    Conclusion",
    ]
    for line in toc:
        s.append(P(line, "toc"))
    s.append(PageBreak())

    # —— Introduction générale ——
    s.append(P("Introduction générale", "chapter"))
    s.append(
        P(
            "La digitalisation des flux commerciaux transfrontaliers constitue un enjeu majeur pour "
            "les entreprises tunisiennes exportatrices et pour leurs partenaires européens. Ce rapport "
            "documente le projet <b>GlobalTradeX</b>, plateforme web dédiée au suivi collaboratif des "
            "expéditions, à la gestion documentaire et à l'aide à la décision pour les opérations "
            "logistiques et douanières. Le document adopte la structure du rapport de référence "
            "fourni : un premier chapitre d'analyse et de spécification des besoins, puis un chapitre "
            "consacré à la phase de préparation (Sprint 0) du cycle Kanban."
        )
    )
    s.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # CHAPITRE 1
    # ═══════════════════════════════════════════════════════════════
    s.append(P("Chapitre 1. Analyse et Spécification des Besoins", "chapter"))

    s.append(P("1.1 Contexte du projet", "section"))
    s.append(
        P(
            "GlobalTradeX s'inscrit dans un contexte de PFE orienté vers l'ingénierie logicielle "
            "appliquée au commerce extérieur. Le projet vise à offrir un environnement unique où "
            "chaque acteur de la chaîne logistique dispose d'un tableau de bord adapté à son métier, "
            "tout en partageant une référence d'expédition commune (ex. <i>GTX-20240315-00042</i> pour "
            "le scénario TunisOlive → FreshMart). La plateforme couvre l'authentification sécurisée, "
            "la vérification d'e-mail, la réinitialisation de mot de passe via SMTP (MailerSend), "
            "ainsi que des modules d'analytique, de cartographie des expéditions en mouvement et "
            "d'assistant conversationnel TradeFlow AI."
        )
    )

    s.append(P("1.1.2 Problématique", "section"))
    s.append(P("<b>Comment synchroniser les acteurs d'une même expédition internationale ?</b>", "body_left"))
    s.append(
        P(
            "Lorsqu'une commande quitte un port d'origine (ex. Sfax) pour un hub d'importation "
            "(ex. Hambourg), l'importateur, l'exportateur, le transitaire et le courtier manipulent "
            "des informations partielles. Les retards de transmission provoquent des blocages douaniers "
            "évitables et une visibilité réduite sur les documents requis."
        )
    )
    s.append(P("<b>Comment fiabiliser les pièces documentaires ?</b>", "body_left"))
    s.append(
        P(
            "Factures commerciales, listes de colisage, certificats d'origine et connaissements doivent "
            "être disponibles, versionnés et contrôlés. Une erreur sur le certificat d'origine — tampon "
            "manquant, incohérence de poids — peut immobiliser un conteneur en <i>customs_hold</i>."
        )
    )
    s.append(P("<b>Comment attribuer des responsabilités claires par rôle ?</b>", "body_left"))
    s.append(
        P(
            "Seul le transitaire doit pouvoir faire évoluer certains statuts opérationnels ; seul le "
            "courtier valide ou rejette les documents ; l'administrateur supervise l'ensemble. "
            "Un système générique de gestion de projet ne respecte pas ces contraintes métier."
        )
    )

    s.append(P("1.2 Étude de l'existant", "section"))
    s.append(
        P(
            "L'étude de l'existant constitue la première étape du processus de conception. Elle permet "
            "d'identifier les forces et les lacunes des plateformes déjà déployées sur le marché du "
            "freight forwarding et du trade compliance, afin de positionner GlobalTradeX de manière "
            "pertinente pour les PME et les projets académiques de démonstration."
        )
    )

    s.append(P("1.2.1 Revue des solutions existantes", "subsection"))
    s.append(
        P(
            "Nous avons adopté la perspective des utilisateurs finaux (importateur / exportateur) et "
            "des opérateurs logistiques. La recherche a porté sur des solutions grand public et "
            "professionnelles partiellement comparables à notre périmètre."
        )
    )

    for title, body in [
        (
            "1.2.1.1 Flexport",
            "Flexport est une plateforme numérique de freight forwarding qui propose la réservation "
            "de fret, le suivi des conteneurs et un portail client. Elle excelle sur le transport "
            "mais offre peu de personnalisation des rôles métier (courtier en douane, exportateur "
            "catalogue produits) dans une même instance PME. Le modèle économique et la complexité "
            "d'onboarding la réservent surtout aux entreprises matures.",
        ),
        (
            "1.2.1.2 CargoWise",
            "CargoWise (WiseTech) est une suite TMS/forwarding très complète pour les transitaires. "
            "Elle couvre documentation, douane et finance, au prix d'une courbe d'apprentissage élevée "
            "et d'un coût de licence important. Elle n'est pas conçue comme un portail collaboratif "
            "léger multi-rôles pour un réseau restreint de partenaires commerciaux.",
        ),
        (
            "1.2.1.3 Kuehne+Nagel — myKN",
            "Le portail myKN permet aux clients de suivre expéditions et documents auprès du "
            "transitaire Kuehne+Nagel. La visibilité est excellente dans l'écosystème du prestataire, "
            "mais l'outil reste fermé : un exportateur tunisien et un importateur allemand ne peuvent "
            "pas y co-construire librement leur dossier hors contrat avec ce transitaire.",
        ),
        (
            "1.2.1.4 Odoo — module Commerce international",
            "Odoo intègre ventes, stocks et une partie des documents d'expédition. C'est un ERP "
            "généraliste modulaire, pertinent pour la gestion d'entreprise, mais il ne propose pas "
            "nativement un cockpit douanier avec vérification IA de certificat d'origine, ni une "
            "carte réseau temps réel des expéditions, ni une messagerie dédiée entre rôles trade.",
        ),
    ]:
        s.append(P(title, "subsection"))
        s.append(P(body))
        s.append(P(f"Figure — Interfaces inspirantes de {title.split()[-1]} (analyse documentaire)", "caption"))

    s.append(P("1.2.2 Critiques des solutions existantes", "subsection"))
    s.append(
        P(
            "Pour comparer objectivement les solutions, nous avons retenu des critères fonctionnels "
            "et non fonctionnels adaptés au commerce international :"
        )
    )
    s.append(
        bullets(
            [
                "Critère 1 : Pilotage multi-rôles (importateur, exportateur, transitaire, courtier, admin)",
                "Critère 2 : Gestion documentaire trade (facture, packing list, CoO, B/L)",
                "Critère 3 : Workflow de statuts d'expédition contrôlé",
                "Critère 4 : Assistance IA (documents / assistant métier)",
                "Critère 5 : Messagerie et notifications entre partenaires",
                "Critère 6 : Sécurité et authentification (JWT, vérification e-mail)",
                "Critère 7 : Tableaux de bord analytiques et cartographie",
                "Critère 8 : Ergonomie et accessibilité web responsive",
            ]
        )
    )
    s.append(Spacer(1, 6))
    s.append(
        P("<b>TABLEAU 1.1 — Comparaison des solutions existantes</b>", "body_left")
    )
    s.append(
        table(
            [
                ["Critère", "Flexport", "CargoWise", "myKN", "Odoo", "GlobalTradeX"],
                ["1 Multi-rôles métier", "Partiel", "Transitaire", "Client KN", "ERP générique", "Oui"],
                ["2 Documents trade", "Oui", "Oui", "Oui", "Partiel", "Oui + IA"],
                ["3 Workflow statuts", "Oui", "Oui", "Lecture", "Partiel", "Oui (FSM)"],
                ["4 Assistance IA", "Non", "Non", "Non", "Non", "Oui"],
                ["5 Collaboration", "Limitée", "Interne", "Limitée", "Interne", "Oui"],
                ["6 Sécurité", "Oui", "Oui", "Oui", "Oui", "Oui"],
                ["7 Analytics / carte", "Oui", "Oui", "Suivi", "Rapports", "Oui"],
                ["8 Ergonomie PME", "Moyenne", "Faible", "Bonne", "Moyenne", "Bonne"],
            ],
            col_widths=[3.2 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm, 2.8 * cm],
        )
    )

    s.append(P("1.3 Solution proposée", "section"))
    s.append(
        P(
            "Après cette analyse, <b>GlobalTradeX</b> se positionne comme une plateforme collaborative "
            "spécialisée sur le dossier d'expédition internationale. Les apports principaux sont :"
        )
    )
    s.append(
        bullets(
            [
                "Cockpits différenciés par rôle (importateur, exportateur, transitaire, courtier, administrateur)",
                "Référentiel produits exportateur (codes SH, origine, quantités) lié aux expéditions",
                "Machine à états pour les statuts : pending, in_transit, customs_hold, delayed, delivered",
                "Espace documents avec vérification manuelle et analyse IA (certificat d'origine, etc.)",
                "Messagerie directe entre partenaires et fil de notifications métier",
                "Carte réseau des expéditions actives et analytique globale réservée à l'admin",
                "Assistant TradeFlow AI et paramétrage d'avatar pour l'administration",
                "Parcours d'inscription avec vérification e-mail et réinitialisation de mot de passe (MailerSend)",
            ]
        )
    )

    s.append(P("1.4 Spécification des besoins", "section"))
    s.append(
        P(
            "Cette section formalise les acteurs, les besoins fonctionnels (BF) et non fonctionnels (BNF) "
            "du système GlobalTradeX, en s'appuyant sur les scénarios de démonstration (ex. huile d'olive "
            "Sfax → Hambourg, référence GTX-20240315-00042)."
        )
    )

    s.append(P("1.4.1 Identification des acteurs", "subsection"))
    s.append(
        bullets(
            [
                "<b>Visiteur / Internaute :</b> consulte la page d'accueil, peut s'inscrire et demander "
                "la réinitialisation de mot de passe.",
                "<b>Importateur :</b> crée et suit ses expéditions entrantes, consulte notifications et documents.",
                "<b>Exportateur :</b> gère le catalogue produits, lie des articles aux expéditions, dépose des pièces commerciales.",
                "<b>Transitaire :</b> met à jour les statuts logistiques, renseigne navire / voyage / ETA, téléverse le connaissement.",
                "<b>Courtier en douane :</b> examine la file de documents, lance la vérification IA, valide ou rejette.",
                "<b>Administrateur :</b> supervise les KPI globaux, gère les utilisateurs, accède à tous les cockpits.",
                "<b>Assistant IA (TradeFlow) :</b> module logiciel répondant aux questions métier et assistant vidéo optionnel.",
            ]
        )
    )

    s.append(P("1.4.2 Spécifications des besoins fonctionnels", "subsection"))

    bf_tables = [
        (
            "1.4.2.1 Besoins fonctionnels de l'acteur « Visiteur / Internaute »",
            "TABLEAU 1.2",
            [
                ["Fonctionnalité", "Description"],
                ["S'inscrire", "Création de compte avec rôle par défaut ; envoi d'un e-mail de vérification."],
                ["Vérifier e-mail", "Activation du compte via lien signé (token JWT à usage unique)."],
                ["Mot de passe oublié", "Demande de lien de réinitialisation par e-mail (SMTP MailerSend)."],
                ["Consulter vitrine", "Accès à la landing page présentant les capacités de la plateforme."],
            ],
        ),
        (
            "1.4.2.2 Besoins fonctionnels de l'acteur « Importateur »",
            "TABLEAU 1.3",
            [
                ["Fonctionnalité", "Description"],
                ["S'authentifier", "Connexion OAuth2 password flow ; accès au cockpit import."],
                ["Créer une expédition", "Assistant multi-étapes : route, fret, valeur, suggestion IA d'itinéraire."],
                ["Suivre expéditions", "Liste, détail, carte de suivi GPS simulée, historique des statuts."],
                ["Consulter documents", "Visualisation des pièces déposées par l'exportateur ou le transitaire."],
                ["Recevoir notifications", "Alertes sur changement de statut, douane, messages."],
                ["Messagerie", "Échanges avec exportateur, transitaire ou courtier sur un fil dédié."],
            ],
        ),
        (
            "1.4.2.3 Besoins fonctionnels de l'acteur « Exportateur »",
            "TABLEAU 1.4",
            [
                ["Fonctionnalité", "Description"],
                ["Gérer produits", "CRUD catalogue : nom, code SH, prix, quantité, pays d'origine."],
                ["Créer expédition liée", "Possibilité d'attacher des lignes produit à une nouvelle expédition."],
                ["Téléverser documents", "Facture commerciale, packing list, certificat d'origine (PDF / images)."],
                ["Consulter cockpit export", "KPIs revenus / expéditions et liste des dossiers associés."],
            ],
        ),
        (
            "1.4.2.4 Besoins fonctionnels de l'acteur « Transitaire »",
            "TABLEAU 1.5",
            [
                ["Fonctionnalité", "Description"],
                ["Mettre à jour statut", "Transitions autorisées selon FSM métier (ex. customs_hold → in_transit)."],
                ["Enrichir transport", "Saisie navire, numéro de voyage, notes, date ETA."],
                ["Téléverser B/L", "Dépôt du connaissement et autres pièces logistiques."],
                ["Cockpit fret", "Vue file active / complétée, alertes retards."],
            ],
        ),
        (
            "1.4.2.5 Besoins fonctionnels de l'acteur « Courtier en douane »",
            "TABLEAU 1.6",
            [
                ["Fonctionnalité", "Description"],
                ["File de revue", "Liste des documents en attente de validation."],
                ["Vérification IA", "Analyse automatique (OpenAI) avec synthèse des anomalies détectées."],
                ["Valider / rejeter", "Décision persistée ; impact sur les indicateurs douane."],
                ["Cockpit douane", "KPIs déclarations, alertes, juridictions."],
            ],
        ),
        (
            "1.4.2.6 Besoins fonctionnels de l'acteur « Administrateur »",
            "TABLEAU 1.7",
            [
                ["Fonctionnalité", "Description"],
                ["Vue globale", "Tableau de bord réseau, analytics, carte des expéditions en mouvement."],
                ["Gérer utilisateurs", "Création, changement de rôle, activation / désactivation."],
                ["Paramétrer assistant", "Configuration avatar HeyGen / messages d'accueil."],
                ["Accès transversal", "Navigation vers tous les cockpits rôle à des fins de support."],
            ],
        ),
        (
            "1.4.2.7 Besoins fonctionnels de l'acteur « Assistant IA »",
            "TABLEAU 1.8",
            [
                ["Fonctionnalité", "Description"],
                ["Répondre aux utilisateurs", "Chat contextuel sur expéditions, documents et procédures."],
                ["Suggérer itinéraires", "Propositions de routes lors de la création d'expédition."],
                ["Analyser documents", "Service de vérification douanière déclenché par le courtier."],
            ],
        ),
    ]
    for title, tab_name, rows in bf_tables:
        s.append(P(title, "subsection"))
        s.append(P(f"<b>{tab_name}</b> — Besoins fonctionnels", "body_left"))
        s.append(table(rows, col_widths=[4.5 * cm, 12 * cm]))
        s.append(Spacer(1, 6))

    s.append(P("1.4.3 Spécifications des besoins non fonctionnels", "subsection"))
    s.append(
        bullets(
            [
                "<b>Sécurité :</b> mots de passe hachés (bcrypt), JWT, contrôle d'accès par rôle côté API et middleware Next.js.",
                "<b>Disponibilité :</b> architecture déployable en local ou cloud ; API stateless.",
                "<b>Convivialité :</b> design system « Editorial White Paper × Kinetic Indigo », interface responsive.",
                "<b>Performance :</b> pagination des listes, chargements ciblés des cockpits, carte optimisée.",
                "<b>Extensibilité :</b> migrations Alembic, modules routers FastAPI découplés.",
                "<b>Modularité :</b> séparation frontend / backend / services (e-mail, IA, tracking GPS).",
                "<b>Traçabilité :</b> horodatage des messages, notifications et versions de documents.",
            ]
        )
    )

    s.append(P("1.5 Méthodologie", "section"))
    s.append(
        P(
            "La réalisation du projet s'appuie sur la méthode <b>Kanban</b> : visualisation du flux de "
            "travail, limitation du travail en cours et amélioration continue. Le tableau comporte les "
            "colonnes « À faire », « En cours » et « Terminé ». Chaque carte regroupe identifiant, "
            "titre, description, priorité (Faible / Moyenne / Élevée) et critères d'acceptation. "
            "Le Sprint 0 correspond à la phase de préparation décrite au chapitre 2."
        )
    )
    s.append(P("Figure 1.6 — Exemple de tableau Kanban du projet GlobalTradeX", "caption"))

    s.append(P("Conclusion", "section"))
    s.append(
        P(
            "Ce premier chapitre a posé le contexte du commerce international collaboratif, la "
            "problématique multi-acteurs, l'analyse comparative des solutions du marché et la "
            "solution GlobalTradeX. Les acteurs, les besoins fonctionnels et non fonctionnels ont "
            "été spécifiés, ainsi que le choix méthodologique Kanban. Le chapitre suivant détaille "
            "la phase de préparation (Sprint 0) : backlog, planification, stack technique et vues "
            "architecturales du système."
        )
    )
    s.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════
    # CHAPITRE 2
    # ═══════════════════════════════════════════════════════════════
    s.append(P("Chapitre 2", "chapter"))
    s.append(P("Sprint 0 : Phase de Préparation", "chapter"))

    s.append(P("Sommaire", "section"))
    for line in [
        "Introduction",
        "2.1 Pilotage du projet avec KANBAN",
        "2.2 Planification des sprints",
        "2.3 Technologies et outils de développement",
        "2.3.1 Développement Back-end",
        "2.3.2 Développement Front-end",
        "2.3.3 Outils de conception et de développement",
        "2.4 Style architectural & Pattern",
        "2.4.1 Style architectural",
        "2.4.2 Pattern architectural",
        "2.5 Diagrammes génériques",
        "Conclusion",
    ]:
        s.append(P(line, "toc"))

    s.append(P("Introduction", "section"))
    s.append(
        P(
            "Le deuxième chapitre présente la mise en œuvre de la phase initiale Kanban — le "
            "<b>Sprint 0</b> — dédiée à l'exploration, à l'organisation et à la préparation technique "
            "de GlobalTradeX. Nous y décrivons le backlog priorisé, le découpage en releases, "
            "l'environnement de développement retenu, l'architecture logicielle et le diagramme "
            "de cas d'utilisation global qui guide les sprints fonctionnels ultérieurs."
        )
    )

    s.append(P("2.1 Pilotage du projet avec KANBAN", "section"))
    s.append(
        P(
            "Les exigences ont été décomposées en user stories priorisées. Le tableau ci-dessous "
            "présente un extrait du backlog <b>GlobalTradeX</b> (identifiants et libellés adaptés "
            "au périmètre réel du dépôt logiciel)."
        )
    )
    s.append(P("<b>TABLEAU 2.1 — Backlog de GlobalTradeX (extrait)</b>", "body_left"))
    backlog_rows = [
        ["ID", "Fonctionnalité", "User Story (résumé)", "Priorité"],
        ["1", "Compte", "1.1 Inscription + vérification e-mail", "Élevée"],
        ["", "", "1.2 Authentification JWT par rôle", "Élevée"],
        ["", "", "1.3 Réinitialisation mot de passe (SMTP)", "Élevée"],
        ["2", "Profil", "2.1 Mise à jour profil et préférences notifications", "Élevée"],
        ["3", "Expéditions", "3.1 Création expédition multi-étapes (importateur)", "Élevée"],
        ["", "", "3.2 Transitions de statut (transitaire)", "Élevée"],
        ["", "", "3.3 Suivi GPS simulé et carte réseau", "Moyenne"],
        ["4", "Produits", "4.1 CRUD catalogue exportateur", "Élevée"],
        ["5", "Documents", "5.1 Upload / téléchargement pièces trade", "Élevée"],
        ["", "", "5.2 Vérification IA + validation courtier", "Élevée"],
        ["6", "Collaboration", "6.1 Messagerie inter-utilisateurs", "Moyenne"],
        ["", "", "6.2 Notifications métier", "Élevée"],
        ["7", "Admin", "7.1 Analytics globale et gestion utilisateurs", "Élevée"],
        ["8", "Assistant", "8.1 TradeFlow AI + avatar admin", "Moyenne"],
    ]
    s.append(table(backlog_rows, col_widths=[1.2 * cm, 2.8 * cm, 9.5 * cm, 2 * cm]))

    s.append(P("2.2 Planification des sprints", "section"))
    s.append(
        P(
            "La planification a été structurée en trois releases correspondant aux grands "
            "périmètres livrables du projet académique."
        )
    )
    s.append(P("<b>TABLEAU 2.2 — Planification des sprints</b>", "body_left"))
    s.append(
        table(
            [
                ["Release", "ID Sprint", "Nom du sprint", "Période indicative"],
                ["Release 1", "1", "Authentification & comptes", "10 jours"],
                ["", "2", "Expéditions & produits", "14 jours"],
                ["Release 2", "3", "Documents & douane (IA)", "12 jours"],
                ["", "4", "Notifications & messagerie", "8 jours"],
                ["Release 3", "5", "Analytics, carte & assistant", "12 jours"],
                ["", "6", "Finitions UI & scénario soutenance", "7 jours"],
            ],
            col_widths=[2.5 * cm, 2 * cm, 5.5 * cm, 4.5 * cm],
        )
    )

    s.append(P("2.3 Technologies et outils de développement", "section"))
    s.append(
        P(
            "Le tableau suivant synthétise les technologies effectivement utilisées dans le dépôt "
            "<i>globaltradeX</i> (backend Python, frontend Next.js, base MySQL)."
        )
    )

    s.append(P("2.3.1 Développement Back-end", "subsection"))
    s.append(
        P(
            "<b>FastAPI</b> : framework Python asynchrone pour l'API REST. Il expose les routes "
            "<i>/api/auth</i>, <i>/api/shipments</i>, <i>/api/documents</i>, <i>/api/messages</i>, "
            "<i>/api/analytics</i>, <i>/api/assistant</i>, etc. La validation des payloads repose sur "
            "<b>Pydantic v2</b> ; l'ORM <b>SQLAlchemy 2</b> mappe les entités (User, Shipment, Document, "
            "MessageThread, Notification, Product). Les évolutions de schéma sont versionnées avec "
            "<b>Alembic</b>. L'authentification utilise <b>JWT</b> (python-jose) et <b>bcrypt</b> pour "
            "le hachage des mots de passe. La connexion MySQL s'effectue via <b>PyMySQL</b>. "
            "Les e-mails transactionnels passent par <b>SMTP MailerSend</b> ; l'IA documentaire et "
            "l'assistant s'appuient sur <b>OpenAI</b>."
        )
    )

    s.append(P("2.3.2 Développement Front-end", "subsection"))
    s.append(
        P(
            "<b>Next.js 14</b> (App Router) et <b>React 18</b> constituent le socle de l'interface. "
            "Le style est porté par <b>Tailwind CSS</b> et un design system éditorial (cockpits par rôle, "
            "landing, auth split layout). Les appels API utilisent <b>Axios</b> avec intercepteurs JWT "
            "(cookie <i>token</i>). Le <b>middleware Next.js</b> et les composants <i>RoleGuard</i> "
            "redirigent chaque utilisateur vers son tableau de bord (<i>/dashboard/importateur</i>, "
            "<i>exportateur</i>, <i>transitaire</i>, <i>courtier</i>, <i>admin</i>). "
            "La cartographie s'appuie sur SVG (Natural Earth) et composants dédiés "
            "(<i>ShipmentNetworkMap</i>). L'internationalisation prévoit plusieurs locales via "
            "<i>LocaleContext</i>."
        )
    )

    s.append(P("2.3.3 Outils de conception et de développement", "subsection"))
    s.append(P("<b>TABLEAU 2.3 — Outils de conception et de développement</b>", "body_left"))
    tools = [
        ["Outil", "Description"],
        ["Visual Studio Code / Cursor", "Éditeur principal ; extensions Python, ESLint, Tailwind."],
        ["Git & GitHub", "Versionnement du code, branches feature, revues."],
        ["MySQL / XAMPP", "SGBD relationnel local pour le développement et la démo."],
        ["Postman / Swagger", "Tests des endpoints FastAPI (OpenAPI auto-généré)."],
        ["Figma (optionnel)", "Maquettage des cockpits et de la landing page."],
        ["MailerSend", "Relais SMTP pour vérification d'e-mail et reset password."],
        ["OpenAI API", "Vérification documentaire et assistant conversationnel."],
        ["ReportLab", "Génération de documents PDF (rapports, scénarios de test)."],
        ["Alembic CLI", "Migrations base de données alignées sur les modèles SQLAlchemy."],
    ]
    s.append(table(tools, col_widths=[4 * cm, 12.5 * cm]))

    s.append(P("2.4 Style architectural & Pattern", "section"))
    s.append(
        P(
            "L'architecture retenue suit le modèle <b>client — serveur</b> en trois couches logiques, "
            "adapté aux applications web métier."
        )
    )

    s.append(P("2.4.1 Style architectural", "subsection"))
    s.append(
        bullets(
            [
                "<b>Couche présentation :</b> application Next.js (navigateur) — pages, composants, état client.",
                "<b>Couche métier :</b> API FastAPI — règles de transition, permissions, orchestration IA et e-mail.",
                "<b>Couche données :</b> MySQL — persistance relationnelle, fichiers uploadés sur disque (<i>uploads/</i>).",
            ]
        )
    )

    s.append(P("2.4.2 Pattern architectural", "subsection"))
    s.append(
        P(
            "Côté frontend, nous appliquons une organisation proche du pattern <b>MVVM</b> : les pages "
            "Next.js jouent le rôle de vues, les hooks et contextes (<i>AuthContext</i>, "
            "<i>LocaleContext</i>) portent l'état, et les modules <i>lib/api.js</i> / "
            "<i>lib/role-dashboard.js</i> encapsulent l'accès aux données. Côté backend, les "
            "<i>routers</i> FastAPI délèguent aux <i>services</i> (e-mail, GPS, OpenAI) et aux "
            "modèles SQLAlchemy — structure proche d'une architecture en couches avec séparation "
            "des responsabilités."
        )
    )

    s.append(P("2.5 Diagrammes génériques", "section"))
    s.append(
        P(
            "Le diagramme de cas d'utilisation global regroupe les interactions entre acteurs humains "
            "et le module Assistant IA. Les cas principaux incluent : s'authentifier, gérer le profil, "
            "créer / suivre une expédition, téléverser un document, mettre à jour un statut, vérifier "
            "une pièce (IA + humain), consulter analytics, échanger des messages et interroger l'assistant."
        )
    )
    s.append(
        P(
            "<b>Figure 2.1 — Diagramme de cas d'utilisation global (GlobalTradeX)</b><br/><br/>"
            "Acteurs : Visiteur, Importateur, Exportateur, Transitaire, Courtier, Administrateur, Assistant IA. "
            "Cas d'utilisation centraux reliés à l'entité <i>Expédition</i> : création, suivi, changement de statut, "
            "gestion documentaire, notification, messagerie. L'administrateur hérite d'une vue étendue "
            "(gestion utilisateurs, analytics). Le courtier est spécialisé sur la validation documentaire. "
            "Ce diagramme formalise le périmètre fonctionnel validé en Sprint 0 avant les releases de développement.",
            "body",
        )
    )

    s.append(P("Conclusion", "section"))
    s.append(
        P(
            "Ce chapitre a présenté le pilotage Kanban du projet GlobalTradeX, la planification par "
            "releases, la stack technique (FastAPI, Next.js, MySQL, OpenAI, MailerSend) et les choix "
            "architecturaux (trois tiers, API REST, séparation routers / services). Le diagramme de "
            "cas d'utilisation global cadre les sprints suivants. Les chapitres ultérieurs du rapport "
            "complet détailleront la réalisation sprint par sprint, les tests et la soutenance "
            "(scénario TunisOlive → FreshMart, référence GTX-20240315-00042)."
        )
    )

    return s


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Rapport PFE GlobalTradeX",
        author="GlobalTradeX",
    )
    doc.build(build_story(), onFirstPage=add_footer, onLaterPages=add_footer)
    print(f"PDF généré : {OUTPUT}")


if __name__ == "__main__":
    main()
