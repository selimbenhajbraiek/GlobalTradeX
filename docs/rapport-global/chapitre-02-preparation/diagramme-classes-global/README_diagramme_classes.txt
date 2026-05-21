================================================================================
Diagramme de classes global — GlobalTradeX
================================================================================

Fichiers :
  - Source PlantUML : docs/diagrams/GlobalTradeX_class_diagram.puml
  - Image générée   : docs/diagrams/GlobalTradeX_Class_Diagram.png
  - Copie rapport   : docs/GlobalTradeX_class_diagram.png (après génération)

Régénérer l'image :
  python scripts/render_use_case_diagram.py
  (ou) java -jar tools/plantuml.jar -tpng -o docs/diagrams docs/diagrams/GlobalTradeX_class_diagram.puml

Correspondance avec le modèle SmartChain (ancien projet) :
  - Utilisateur + spécialisations  →  Adhérent / Développeur remplacés par
    Importateur, Exportateur, Transitaire, Courtier en douane
  - Administrateur « Gérer » Utilisateur  →  gestion des comptes / rôles
  - Entités associées  →  Expedition, Document, Produit, Notification, Messagerie
    (à la place de Projet, Story, NFT, social links, Image, Feature)

Correspondance avec le code (backend/models/) :
  - Utilisateur        →  User
  - Expedition         →  Shipment
  - LigneProduit       →  ShipmentProduct
  - Produit            →  Product
  - Document           →  Document
  - Notification       →  Notification
  - FilDiscussion      →  MessageThread
  - ParticipantFil     →  ThreadParticipant
  - Message            →  Message
  - AssistantAvatar    →  AssistantAvatar

================================================================================
