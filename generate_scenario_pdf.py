from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

OUTPUT_FILE = "Scenario_Complet_GlobalTradeX_FR.pdf"

STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(name="title_custom", parent=STYLES["Title"], fontName="Helvetica-Bold", fontSize=20, leading=24, spaceAfter=12))
STYLES.add(ParagraphStyle(name="subtitle_custom", parent=STYLES["Normal"], fontName="Helvetica", fontSize=11, leading=14, spaceAfter=16))
STYLES.add(ParagraphStyle(name="section", parent=STYLES["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, spaceBefore=10, spaceAfter=6))
STYLES.add(ParagraphStyle(name="body", parent=STYLES["Normal"], fontName="Helvetica", fontSize=10.5, leading=14, spaceAfter=4))


def section_title(text: str) -> Paragraph:
    return Paragraph(text, STYLES["section"])


def body_text(text: str) -> Paragraph:
    return Paragraph(text, STYLES["body"])


def bullet_list(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, STYLES["body"]), leftIndent=8, value="bullet") for item in items],
        bulletType="bullet",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=10,
        bulletOffsetY=2,
    )


def build_pdf() -> None:
    doc = SimpleDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="Scenario complet de test - GlobalTradeX",
        author="GlobalTradeX",
    )

    story = []
    story.append(Paragraph("Scenario Complet de Test - GlobalTradeX", STYLES["title_custom"]))
    story.append(Paragraph("Document de validation fonctionnelle role par role pour la demonstration finale.", STYLES["subtitle_custom"]))

    story.append(section_title("1) Preparation generale (une seule fois)"))
    story.append(body_text("Objectif: preparer un environnement stable avant de lancer les tests complets."))
    story.append(
        bullet_list(
            [
                "Demarrer le backend FastAPI et le frontend Next.js.",
                "Verifier que la base de donnees est initialisee avec backend/init_db.py.",
                "Verifier la presence de 5 comptes de test: admin, importateur, exportateur, transitaire, courtier.",
                "Utiliser des profils navigateur differents (ou incognito) pour eviter les conflits de session.",
                "Conserver une reference shipment commune (ex: GTX-YYYYMMDD-XXXXX).",
            ]
        )
    )

    story.append(section_title("2) Scenario A - Role Importateur"))
    story.append(
        bullet_list(
            [
                "Connexion avec le compte importateur.",
                "Creer un nouveau shipment depuis /dashboard/shipments/new avec donnees realistes.",
                "Verifier la presence du shipment dans dashboard importateur et dans la liste shipments.",
                "Ouvrir le detail shipment et verifier route, statut, dates, valeur.",
                "Uploader au moins un document (invoice ou packing list).",
                "Verifier les notifications generees.",
            ]
        )
    )
    story.append(body_text("<b>Resultat attendu:</b> l'importateur voit uniquement ses donnees et le flux passe sans erreur."))

    story.append(section_title("3) Scenario B - Role Exportateur"))
    story.append(
        bullet_list(
            [
                "Connexion avec le compte exportateur.",
                "Ajouter 2 a 3 produits dans le catalogue (HS code, prix, quantite, pays d'origine).",
                "Modifier un produit puis supprimer un produit pour valider le CRUD.",
                "Consulter le dashboard exportateur (KPIs, revenus, shipments recents).",
                "Ouvrir un detail shipment autorise pour confirmer les droits d'acces.",
            ]
        )
    )
    story.append(body_text("<b>Resultat attendu:</b> catalogue fonctionnel, donnees scopees, dashboard distinct des autres roles."))

    story.append(section_title("4) Scenario C - Role Transitaire"))
    story.append(
        bullet_list(
            [
                "Connexion avec le compte transitaire.",
                "Ouvrir la file des shipments actifs.",
                "Prendre le shipment importateur et appliquer des transitions valides:",
                "pending -> in_transit -> customs_hold -> in_transit -> delivered (ou chemin delayed).",
                "Ajouter notes operationnelles, vessel_name, voyage_number, eta_update.",
                "Uploader un document logistique (Bill of Lading).",
            ]
        )
    )
    story.append(body_text("<b>Resultat attendu:</b> transitions invalides bloquees, transitions valides acceptees, notifications creees."))

    story.append(section_title("5) Scenario D - Role Courtier en Douane"))
    story.append(
        bullet_list(
            [
                "Connexion avec le compte courtier.",
                "Consulter la liste des documents en attente de verification.",
                "Lancer AI Verify sur au moins un document.",
                "Valider un document puis rejeter un autre avec motif.",
                "Verifier la mise a jour des KPIs documents et de la liste recently verified today.",
            ]
        )
    )
    story.append(body_text("<b>Resultat attendu:</b> analyse AI exploitable, decisions de verification persistees."))

    story.append(section_title("6) Scenario E - Role Admin"))
    story.append(
        bullet_list(
            [
                "Connexion avec le compte admin.",
                "Verifier les KPI globaux et graphiques sur dashboard admin.",
                "Tester gestion utilisateurs: creer utilisateur, changer role, activer/desactiver.",
                "Verifier acces admin a toutes les sections role-specific.",
                "Tester suppression shipment (admin autorise, non-admin interdit).",
            ]
        )
    )
    story.append(body_text("<b>Resultat attendu:</b> permissions critiques correctement appliquees."))

    story.append(section_title("7) Test de securite - Matrice d'acces"))
    story.append(
        bullet_list(
            [
                "Depuis chaque role, tenter d'ouvrir manuellement les routes des autres roles:",
                "/dashboard/admin, /dashboard/importateur, /dashboard/exportateur, /dashboard/transitaire, /dashboard/courtier.",
                "Verifier blocage/redirect UI (middleware + RoleGuard) et 403 cote API.",
            ]
        )
    )

    story.append(section_title("8) Checklist finale avant demo"))
    story.append(
        bullet_list(
            [
                "Authentification: login/logout/redirection OK.",
                "Shipments: creation, detail, statut, permissions OK.",
                "Documents: upload/download/verification/AI OK.",
                "Notifications: generation automatique sur evenements.",
                "Analytics: scope role correct, global reserve admin.",
                "UI: dashboards differencies visuellement par role.",
                "Aucune erreur console frontend, aucune traceback backend.",
            ]
        )
    )

    story.append(Spacer(1, 12))
    story.append(body_text("Conseil demo: suivre l'ordre Importateur -> Exportateur -> Transitaire -> Courtier -> Admin."))

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(f"PDF generated: {OUTPUT_FILE}")
