# Konzept: Luxusgüter und Lebensqualität

**Projekt:** Solar Frontier: Origins  
**Status:** Geplant – noch nicht implementiert  
**Datei:** `KONZEPT_LUXUSGUETER.md`

## 1. Ziel

Luxusgüter sollen die Lebensqualität der Kolonisten erhöhen und dadurch das Bevölkerungswachstumspotenzial steigern. Die Spielenden entscheiden selbst, welche Luxusgüter eine Kolonie konsumiert.

## 2. Grundregeln

- Luxusgüter werden pro Planet separat aktiviert oder deaktiviert.
- Der Verbrauch erfolgt aus dem jeweiligen **Oberflächenlager**.
- Aktivierte Luxusgüter werden laufend verbraucht, sofern genügend Bestand vorhanden ist.
- Deaktivierte Luxusgüter werden nicht verbraucht; vorhandene Waren bleiben im Lager.
- Ist ein Luxusgut nicht ausreichend verfügbar, entfällt sein Wachstumsbonus, bis die Versorgung wieder ausreicht.
- Mehrere aktive Luxusgüter können ihre Boni kombinieren. Die genaue Berechnungsregel wird vor der Implementierung festgelegt.
- Luxusgüter ersetzen keine grundlegenden Bedürfnisse: Nahrung, Wasser und Wohnraum bleiben eigenständige Voraussetzungen.
- Luxusgüter erzeugen keine Waren und keine Kolonisten von selbst; sie beeinflussen lediglich das Wachstumspotenzial.

## 3. Erstes geplantes Luxusgut

### Kosmetik

- **Geplanter Bonus:** +10 % auf die bestehende Bevölkerungswachstumsrate.
- **Aktivierung:** Kosmetikverbrauch für die jeweilige Kolonie einschalten.
- **Deaktivierung:** Verbrauch stoppen; der vorhandene Bestand bleibt erhalten.
- **Versorgung:** Kosmetik muss im Oberflächenlager des jeweiligen Planeten vorhanden sein.
- **Produktion:** Eine Kosmetikfabrik und ihre Produktionskosten werden später festgelegt.
- **Rohstoffe:** Noch festzulegen.

Der Bonus von +10 % bedeutet eine relative Erhöhung der bestehenden Wachstumsrate um 10 % – nicht automatisch 10 % zusätzliche Einwohner pro Stunde. Die genaue Wachstumsformel und der Verbrauch pro Kolonist müssen vor der Implementierung festgelegt werden.

## 4. Geplante weitere Luxusgüter

Die folgenden Werte sind vorläufige Konzeptideen und noch nicht verbindlich:

| Luxusgut / Einrichtung | Möglicher Effekt | Status |
|---|---:|---|
| Kosmetik | +10 % Wachstumsbonus | Erster Kandidat |
| Süßwaren | +5 % Wachstumsbonus | Idee |
| Freizeitzentrum | +10 % Wachstumsbonus | Idee |
| Unterhaltungselektronik | +5 % Wachstumsbonus | Idee |

Die Boni, Verbrauchswerte, Produktionsketten und Baukosten weiterer Luxusgüter müssen vor ihrer Umsetzung festgelegt und balanciert werden.

## 5. Bedienung und Anzeige

Die Luxusgüter-Steuerung soll in die Kolonistenübersicht des jeweiligen Planeten integriert werden.

Für jedes Luxusgut sollen dort sichtbar sein:

- Name des Luxusguts
- Aktivierungsstatus
- lokaler Lagerbestand
- Verbrauch, sobald dieser festgelegt ist
- Wachstumsbonus bei ausreichender Versorgung
- Hinweis, wenn der Bestand für den Verbrauch nicht ausreicht

Jeder Schalter wirkt nur auf den ausgewählten Planeten. Beispielsweise kann Kosmetik auf der Erde aktiviert und auf dem Mars deaktiviert sein.

## 6. Zusammenspiel mit dem Kolonistensystem

Die bestehenden Regeln bleiben erhalten:

- Kolonisten verbrauchen Nahrung und Wasser aus dem jeweiligen Oberflächenlager.
- Nahrung, Wasser und Wohnraum bleiben unabhängig von Luxusgütern erforderlich.
- Es können sich nur so viele Kolonisten vermehren, wie Wohnraum vorhanden ist.
- Luxusgüter erhöhen das Wachstumspotenzial, schaffen aber keinen zusätzlichen Wohnraum.
- Die Regeln für Nahrung- und Wassermangel werden durch dieses Konzept nicht verändert.

## 7. Geplante Umsetzung

1. Datenmodell für Luxusgüter und planetenbezogene Aktivierung festlegen.
2. Verbrauchswerte und Wachstumsformel definieren.
3. Kosmetikproduktion und Lagerbestand ergänzen.
4. Schalter und Statusanzeigen in der Kolonistenübersicht integrieren.
5. Prüfen, dass Deaktivierung den Verbrauch stoppt und keine Waren löscht.
6. Prüfen, dass fehlender Bestand den jeweiligen Bonus aussetzt.
7. Speichern und Laden der Einstellungen testen.
8. Erst danach weitere Luxusgüter ergänzen.

## 8. Abgrenzung

Dieses Dokument beschreibt ausschließlich das geplante Konzept. Es nimmt noch keine Änderungen an `game.js`, `index.html` oder `style.css` vor. Baukosten, Forschungskosten, Produktionsraten und Verbrauchswerte gelten erst dann als festgelegt, wenn sie ausdrücklich beschlossen wurden.
