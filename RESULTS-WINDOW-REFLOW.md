# UI-02: Fenster nach Größen-/Auflösungswechsel erreichbar halten

Stand 2026-11-04. Isoliertes Teilpaket; UI-01 (Aero/Caption) bleibt ausdrücklich offen.

## Änderung

`constrainBounds()` bleibt für freies Ziehen unverändert: Wie bisher darf der Nutzer Fenster teilweise seitlich oder hinter die Taskleiste ziehen. Neues `fitBounds()` unterscheidet davon die automatische Wiederherstellung nach einer Displayänderung.

Automatisches vollständiges Einpassen erfolgt bei Browser-/Arbeitsflächenänderung, `setFixedSize()` sowie wiederhergestellten Profil-/Arbeitsstandspositionen. Das behebt auch Standard→Statistik beziehungsweise Programmierer, wenn die vergrößerte Unterkante vorher hinter der Taskleiste blieb. Die Arbeitsfläche berücksichtigt weiterhin die vorhandene Taskleisten-/Mehrbildschirmregel.

Ist ein festes Werkzeug größer als die gesamte Arbeitsfläche, bleibt seine Tasten-/Textgröße erhalten. Nur dieser Ausnahmezustand erhält `viewport-constrained` mit Scrollbars und klebender Titelleiste. Das ist eine bewusste Web-Erreichbarkeitslösung, keine Behauptung eines identischen nativen Windowsverhaltens auf unrealistisch kleinen Displays. Die Klasse verschwindet beim erneuten Vergrößern.

## Prüfung

`node --test windows.test.mjs calculator.test.mjs calculator-ui.test.mjs desktop.test.mjs workspace.test.mjs`: **32/32 bestanden**. Bestehende Tests für absichtlich freie Offscreen-Bewegung, Andocken, Arbeitsstand und Fensterpräferenzen bleiben erfolgreich. Neue Fälle prüfen vollständige Reflowgrenzen und gespeicherte Offscreen-Geometrie.

Browserprüfung in echter gleichursprünglicher Iframe-Arbeitsfläche mit echtem `createDesktop()`; die äußeren Schaltflächen ändern die wirkliche Iframe-Größe und lösen echte Resize-Ereignisse aus, keine Mock-Viewportwerte:

- 1280×720 → Programmierer422×388 → 800×600: Fenster `[378,170,422,388]`, Unterkante **558**, direkt oberhalb der42px-Taskleiste. Vorheriger Auditfehler lag mit Unterkante666 außerhalb.
- 300×220: Fenster `[0,0,300,178]`; `overflow:auto`; Inhalt403×367, Clienthöhe161. Strg+Ende scrollt bis206; Titeloberkante bleibt **1**, Schließen bleibt sichtbar.
- Zurück800×600: native422×388 wiederhergestellt; Ausnahmeklasse entfernt.

[Browsernachweis](frame-verification/resize-800.png) zeigt die Iframe-Testoberfläche; wegen der Skalierung dient das Bild dem Zustandsnachweis, die obigen DOM-Messungen der Geometrie.

Die echte Windows-7-VM wurde im selben Paket wieder bedient (wissenschaftlich, Programmierer, Statistik). Frische [Statistikreferenz](calculator-verification/vm-statistics-current.png) für die zentrale Rechner-Funktionsarbeit übergeben. Das aktuelle Guacamole änderte zwischenzeitlich die Gastauflösung; diese Neuaufnahme wird deshalb nicht mit alten Vollbildbildern ungeprüft pixelweise verglichen.

## Grenzen

- Noch keine vollständige Live-Abnahme sämtlicher Apps/Mehrbildschirmkonfigurationen. Zentraler Agent integriert und veröffentlicht.
- Maximierte/angedockte Geometrie verwendet die bestehende Arbeitsflächenberechnung; keine neue Taskleistenhöhe global eingeführt.
- Caption-/Aero-Material, Standardrahmenvarianten und Dialogmodalität gehören zu Folgepaketen. Das vorliegende Paket schließt ausschließlich den bestätigten UI-02-Reflowfehler samt kleinem Displayfallback.
- Gemeinsame zentrale Änderung `confirm-window>p` in aero.css wurde weder überschrieben noch zurückgesetzt. Cherry-pick des kleinen Zusatzblocks erhält sie.
