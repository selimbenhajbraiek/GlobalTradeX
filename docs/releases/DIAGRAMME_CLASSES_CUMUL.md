# Diagrammes de classes cumulés (par release)

Un seul diagramme **cumulatif** par release (`.puml` + `.png`).  
Description textuelle détaillée : **`DIAGRAMME_CLASSES_TEXTUEL_INDEX.md`**

| Release | Fichier | Tables cumulées |
|---------|---------|-----------------|
| **1** | `release-01/diagramme-classes/Diagramme_Classes_Release1_Cumul` | 4 |
| **2** | `release-02/diagramme-classes/Diagramme_Classes_Release2_Cumul` | 9 |
| **3** | `release-03/diagramme-classes/Diagramme_Classes_Release3_Cumul_Final` | **13 (projet complet)** |

## Générer les PNG

```powershell
$jar = "docs\tools\plantuml.jar"
$dir = "docs\releases\release-01\diagramme-classes"
java -jar $jar -tpng -o "`"$dir`"" "`"$dir\Diagramme_Classes_Release1_Cumul.puml`""
```

(Répéter pour `release-02` et `release-03`.)

## Rapport global

Copie du diagramme final :  
`docs/rapport-global/chapitre-02-preparation/diagramme-classes-global/GlobalTradeX_class_diagram_physique_cumul.puml`

Vue **conceptuelle** (rôles métier) : `GlobalTradeX_class_diagram.puml` (inchangée).
