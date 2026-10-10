# Roadmap – Solar Frontier: Origins

## Geplante Funktion: Kolonisten und Bevölkerungswachstum

**Status:** Konzept geplant – noch nicht implementiert

### Startbevölkerung
- Das Spiel startet mit **50 Kolonisten auf der Erde**.
- Andere Himmelskörper beginnen ohne Kolonisten; sie müssen zunächst besiedelt werden.

### Bevölkerungswachstum
- Neue Kolonisten entstehen durch natürliches Bevölkerungswachstum auf der Erde und später auf anderen besiedelten Himmelskörpern.
- Jeder Planet bzw. besiedelte Mond erhält einen **eigenen Wachstumsregler von 0 % bis 100 %**.
- **0 %:** Das natürliche Wachstum auf diesem Himmelskörper wird pausiert; vorhandene Kolonisten bleiben erhalten.
- **100 %:** Die vorgesehene normale Wachstumsrate.
- Zwischenwerte skalieren die normale Wachstumsrate entsprechend, z. B. 50 % = halbe Wachstumsrate.
- Die Regler sollen unabhängig voneinander eingestellt und gespeichert werden können.
- Die konkreten Wachstumsraten werden später festgelegt.

### Personentransport mit Raketen
- Kolonisten können zusätzlich durch Raketen zu anderen Himmelskörpern transportiert werden.
- Der Personentransport funktioniert unabhängig vom Wachstumsregler.
- Personenkapazitäten der einzelnen Raketentypen müssen später festgelegt werden; Tonnen an Fracht werden nicht automatisch als Personenzahl interpretiert.
- Ankunft und Zielort müssen berücksichtigt werden, damit Kolonisten der Bevölkerung des richtigen Himmelskörpers hinzugefügt werden.

### Spätere Ausbaustufen – noch offen
- Wohnraum bzw. maximale Bevölkerung
- Versorgung und Bedürfnisse wie Nahrung, Wasser und Sauerstoff
- Arbeitskräfte und Auswirkungen auf die Industrie
- Unterschiede bei Wachstum und Lebensbedingungen zwischen Himmelskörpern

### Umsetzungsregel
Diese Funktion ist zunächst nur auf der Roadmap festgehalten. **Keine Codeänderungen vor ausdrücklicher Freigabe.** Bei der späteren Umsetzung die bestehende Spielmechanik erhalten und Mobile sowie PC unterstützen.

## Geplante Funktion: Pionier-Kolonistenrakete

**Status:** Konzept geplant – noch nicht implementiert

### Zweck und Kapazität
- Die **Pionier** ist eine wiederverwendbare Rakete, die ausschließlich Kolonisten transportiert.
- Sie transportiert keine Rohstoffe oder sonstige Fracht.
- Die Passagierzahl wird vor dem Start über einen Regler eingestellt: **1 bis maximal 25 Kolonisten pro Flug**.
- Beim späteren Kolonistensystem müssen die ausgewählten Personen am Startort abgezogen und dem korrekten Zielort erst nach der vorgesehenen Ankunft bzw. Landung gutgeschrieben werden.

### Bau und Forschung
- Die Pionier wird über die vorhandene **Raketenfabrik** gebaut.
- Als Voraussetzung ist die Forschung **„Erweiterte Raumfahrt“** vorgesehen.
- Vorläufige Forschungsvorschläge: **5.000 Forschungspunkte** und **8 Minuten** Forschungsdauer.
- Vorläufige Baukosten: **1.200 t Stahl, 200 t Aluminium, 150 t Elektronik, 100 t Batterien und 80 t Chips**.
- Vorläufige Bauzeit: **90 Sekunden**.
- Kosten und Zeiten sind Konzeptwerte und können vor der Umsetzung noch angepasst werden.

### Flug, Orbit und Landung
- Die Pionier verwendet dieselben Flugzeiten wie die anderen Raketen für das jeweilige Ziel.
- Für Starts und Landungen auf einem Planeten mit Oberfläche wird dort eine **Start- & Landeplattform** benötigt.
- In der ersten Ausbaustufe fliegt die Pionier zum Zielorbit; eine Landefunktion für den Kolonistentransport wird später ergänzt.
- Im Orbit muss die Pionier nicht automatisch zurückfliegen. Sie kann dort verbleiben oder später für eine andere Mission eingesetzt werden.
- Die Rakete bleibt wiederverwendbar und wird nicht nach einem Flug verbraucht.

### Abhängigkeit vom Raketensystem
- Vor der Integration der Pionier sollen zunächst die Raketenanzeige und das Flug-/Missionsverhalten überarbeitet werden.
- Flug, Orbitaufenthalt, Rückflug und Landung sollen im System klar unterscheidbar sein.
- Die bestehende Raketenmechanik und ihre bisherigen Flugzeiten sollen erhalten bleiben.

### Umsetzungsregel
Die Pionier ist zunächst nur auf der Roadmap festgehalten. **Keine Codeänderungen vor ausdrücklicher Freigabe.** Die Kolonistenmechanik wird erst zusammen mit dem geplanten Kolonistensystem umgesetzt.

