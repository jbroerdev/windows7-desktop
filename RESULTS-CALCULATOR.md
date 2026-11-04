# Rechner: isolierte Umsetzung für die zentrale Integration

Stand: 2026-11-04. Umfang mit dem Chat „Datei-Share-Plattform planen“ abgestimmt.

## Änderungen

- Standardfenster 227 × 322 CSS-Pixel. Die lokalen Rahmen-Innenabstände ergeben exakt die vermessenen Referenzpositionen; keine gemeinsamen Frame-Dateien verändert.
- Deaktivierte Maximieren-Schaltfläche ergänzt; vorhandene Aero-Grafiken der gemeinsamen Fensterdarstellung werden benutzt.
- Ansichtmenü mit getrennten Markierungs-, Beschriftungs- und Shortcut-Spalten; Basismodus und Original-Tastenkürzel. Zifferngruppierung funktioniert ohne Umwandlung der Eingabe in eine ungenauere JavaScript-Zahl.
- Escape schließt das Menü und fokussiert dessen Auslöser, ohne den Rechenwert zu löschen. Pfeile/Home/End navigieren; deaktivierte Einträge werden übersprungen. Links/rechts sowie Zeigerwechsel öffnen andere Menüs direkt. F10 fokussiert die Menüleiste; Pfeil ab öffnet sie.
- Alt+1/2/3 wechselt die vorhandenen Ansichten; bisherige Strg+1/2/3 bleiben kompatibel. Strg+H/U/E/F4 schalten Verlauf beziehungsweise die vorhandenen Zusatzansichten.
- Statistik und Arbeitsblätter sind als noch nicht implementiert deaktiviert. Keine funktionslosen aktiven Aktionen eingeführt.

## Prüfung

`node --check public/calculator.js`

`node --test calculator.test.mjs calculator-ui.test.mjs`: **9/9 bestanden**. Eventtests prüfen Escape ohne Datenverlust, Fokuswiederherstellung, Überspringen deaktivierter Menüeinträge, direkten Menüwechsel und Rückkehr zur Standardgröße. Bestehende Rechen- und Datumsprüfungen bestanden.

Isolierte Browser-Vorschau auf 127.0.0.1:3057 mit echten `style.css`, `aero.css`, `createDesktop()` und Rechner-Modul; keine Produktionsdaten, keine Backend-Mocks für Fenstergeometrie. Browserprüfung: Standard, Ansichtmenü, Escape, Alt+2 und Alt+3 sowie Gruppierung `12345 → 12.345` erfolgreich.

Gemessene lokale DOM-Rechtecke relativ zum Fenster, in CSS-Pixeln:

| Element | x | y | Breite | Höhe |
|---|---:|---:|---:|---:|
| Menü | 8 | 29 | 211 | 20 |
| Anzeige | 19 | 60 | 190 | 50 |
| MC | 19 | 115 | 34 | 27 |
| 7 | 19 | 179 | 34 | 27 |
| 0 | 19 | 275 | 73 | 27 |
| = | 175 | 243 | 34 | 59 |

Diese Werte stimmen mit der vermessenen VM-Referenz überein. Rohwerte: [geometry.json](calculator-verification/geometry.json).

Nachweise: [Standardansicht](calculator-verification/standard.png), [Ansichtmenü](calculator-verification/view-menu.png).

## Grenzen / noch offen

- Das ist eine überprüfte Standard-Geometrie, keine Zusage vollständiger Pixelgleichheit für sämtliche Zustände. Aero-Material/Glow und das vorhandene Rechner-SVG bleiben vom bestehenden gemeinsamen Assetstand abhängig.
- Wissenschaftlicher/Programmierer-Modus wurden auf Darstellung und Umschalten geprüft, ihre spezifischen Referenzgeometrien sind hier nicht nachgebaut.
- Statistik, Arbeitsblätter, vollständige Original-Hilfe und der originale Verlauf mit Einzelwertbearbeitung bleiben separate Aufgaben.
- Zifferngruppierung ist aktuell eine Fensteroption, kein gespeicherter Profilwert.
- Neue UI-Tests separat ausführen oder zentral zur npm-Testliste hinzufügen; package.json wurde zur Vermeidung von Konflikten nicht verändert.
- Kein GitHub-Push und kein Webdock-Deployment ausgeführt. Integration und Produktionsprüfung erfolgen zentral im anderen Chat.

## Exakte Integrationsdateien

- public/calculator.js
- public/calculator.css
- calculator-ui.test.mjs
- RESULTS-CALCULATOR.md
- calculator-verification/geometry.json
- calculator-verification/standard.png
- calculator-verification/view-menu.png

Andere uncommittete Referenzdokumente und die fremde SECURITY-PHP2SHELL-LOG.md gehören ausdrücklich nicht zu diesem Commit.
