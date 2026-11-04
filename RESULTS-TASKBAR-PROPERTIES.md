# Taskleisten-Eigenschaften und Fenster-Arbeitsbereich

Stand: 2026-11-04, UI-Folgepaket nach 1c140df.

## Umsetzung

- Separates modelesses Eigenschaftenfenster, 414 × 463 Pixel, drei stabile Reiter. Deutsches Windows-7-Referenzbild taskbar-properties.png / start-properties.png aus der vorhandenen Referenzsammlung; kompakte Dialogschrift und native Gruppen/Fußleiste.
- Bestehender Systemsteuerungs-Eintrag öffnet das neue Fenster; bestehende Startmenü-Pinverwaltung bleibt unter Anpassen erreichbar.
- Funktionierende Einstellungen für Fixieren, automatisch Ausblenden, kleine Symbole, vier Bildschirmkanten, drei Gruppierungsarten und Aero Peek. Speichern über vorhandenes POST /api/desktop, mit scope:share nur im bestehenden Share-Bearbeitungsmodus. Übernehmen bleibt offen, OK speichert/schließt, Abbrechen verwirft Änderungen, Fehler bewahren den Entwurf.
- Window Manager berücksichtigt Arbeitsbereich mit linken/oberen Offsets beim Einpassen, Maximieren, Andocken und Wiederherstellen. Unveränderte Einstellungen verschieben keine Fenster bei gewöhnlicher Datenaktualisierung.
- Immer/Nie/bei voller Leiste gruppieren; getrennte Fenster erhalten eigene beschriftete Schaltflächen. Mehrfachfenster-Vorschau richtet sich nach der Taskleistenkante.
- CSS für kleine/vertikale Leisten, AutoHide und Peek. Original-Startorb korrigiert auf seine Spriteabmessungen.

## Abnahme

39/39 gezielte Tests bestanden: taskbar-properties, taskbar-state, taskbar-layout, windows, control-panel-ui, personalization, appearance, desktop und workspace. Die Windows-Gesamtsuite des zentralen Agents ist zusätzlich vor Veröffentlichung erforderlich.

Browserprüfung auf isoliertem UI-Prüfprofil (keine Produktiv-Benutzerdaten verändert):
- normale horizontale Leiste 42 px, kleine Leiste 30 px;
- linke kleine Leiste 42 × 720 px, getrennte Taskschaltfläche sichtbar;
- Eigenschaftendialog 414 × 463 px; Panel clientHeight/scrollHeight beide356, clientWidth/scrollWidth beide384, kein Scrollbalken;
- Taskleiste/Startmenü-Reiter verändern die Fenstergeometrie nicht;
- Übernehmen setzt die sichtbare Leiste um und deaktiviert sich nach erfolgreichem Speichern.

Bildnachweise: frame-verification/taskbar-properties-final.png, taskbar-start-properties-final.png und taskbar-left-small.png. Die Bilder stammen aus der isolierten Integrationsfixture, nicht aus dem Produktivsystem.

## Integration

Benötigt zentrale Taskleistenmodelle 2e20b25, Backend/Shell-Hook70a65ce, Adapter591bdc1 und zentrale Verdrahtung a229b69. Aktuelle zentrale WorkArea-Erweiterung913166c beibehalten. Neue Assetroute /taskbar-properties.js registrieren; neue Tests zur zentralen Suite hinzufügen. Keine ältere desktop-shell.js/taskbar-layout.js aus diesem Worktree über zentrale Korrekturen kopieren. Personalization-Korrektur b9f235b bleibt unberührt.

## Offene Grenzen

Noch keine vollständige Windows-7-Deckung. Infobereich-Anpassung, Startmenü-Verlauf/Datenschutz und zusätzliche Symbolleisten sind ausdrücklich deaktiviert. Standard-Beenden zeigt die tatsächliche Webdesktop-Aktion Abmelden. Startmenü-Anpassen verwendet die bestehende Pinverwaltung statt des kompletten Windows-Dialogs. Vertikale Schaltflächen zeigen einzelne Symbole statt einer vollständig nativen mehrspaltigen Taskleiste; Gruppierung bei Platzmangel verwendet ein deterministisches Kapazitätsmodell. Browsernative Checkbox-/Select-Darstellung und Schrift-Rasterung bleiben plattformabhängig. Original-DWM-Blur und vollständige Sprunglisten sind nicht reproduziert.
