# Taskleisten-Dialog: Controls und Tastaturfokus

Stand2026-11-04, Folgepaket nach Sidebar074cd2c.

## Änderung

Nur .taskbar-properties-window: quadratische13px-Checkboxen mit grauem Bevel und stabilem CSS-Häkchen statt des Browser-Accent-Füllfelds; Normal/Hover/Pressed/Disabled sowie gepunkteter Textfokus. Auswahllisten erhalten einen festen kleinen Pfeil und Normal/Hover/Disabled-/Tastaturfokusdarstellung. Buttons erhalten konsistente Hover/Pressed/Disabled-Zustände. Der vorhandene Control-Input bleibt echt; keine ersetzenden Checkbox-/Dropdown-Skripte.

Einzige JavaScriptänderung: Checkboxbeschriftung als span statt Textknoten, damit der native gepunktete Textfokus gezielt gezeichnet werden kann. Labels/Inputs, Eventhandler und Speicherschnittstellen bleiben unverändert. CSS ausdrücklich auf dieses Dialogfenster begrenzt. Forced-Colors verwendet wieder browsernative Checkbox-/Select-Darstellung.

Keine passende Original-Checkbox-/Dropdownressource im vorhandenen Inventar gefunden. Diese Controls sind CSS-Rekonstruktionen und werden nicht als originale Windowsbitmaps bezeichnet. Farb-/Bevelvergleich mit der bereitgestellten VM und bestehender 7.css-Quelle: https://github.com/khang-nd/7.css/blob/main/gui/_checkbox.scss . Die bereits vorhandene MIT-Lizenz liegt unter public/icons/7CSS-LICENSE.txt. Für Schriftfragen gilt weiterhin der Microsoft-Leitfaden https://learn.microsoft.com/en-us/windows/win32/uxguide/vis-fonts ; keine pauschale Schriftverkleinerung vorgenommen.

## Geprüft

11/11 Tests: taskbar-properties.test.mjs, control-panel-ui.test.mjs, personalization-ui.test.mjs. Bestehende Save/Cancel/Error/Share-Prüfungen bestanden nach der Beschriftungsänderung.

Echter isolierter Browser: Leertaste auf Taskleiste fixieren schaltet den Wert und aktiviert Übernehmen. Computed Outline am Beschriftungsspan1px dotted; Home/ArrowDown im Positionsselect setztleft und aktiviert Übernehmen, Selectfokus ebenfalls1px dotted. Tabwechsel zu Startmenü zeigt deaktivierte Checkboxen und Select grau. Sheet bleibt414×463; Panelhöhe/Scrollhöhe identisch, kein Überlauf.

Nachweise: frame-verification/taskbar-controls-focus.png, taskbar-controls-select-focus.png, taskbar-controls-disabled.png. Das sind isolierte Testdaten, keine Produktionsprofiländerung. Änderungen am Entwurf verworfen, bevor der Test abgeschlossen wurde.

## Grenzen / Integration

Hover/Pressed-Paletten sind implementiert; statische Nachweise belegen Normal/Fokus/Disabled, keine gehaltene Mausdruck-Aufnahme. Das aufgeklappte Optionsmenü bleibt browsernativ; keine Aussage über byteidentische Darstellung auf jedem Browser. Forced-Colors-Fallback nicht auf einer aktivierten Hochkontrast-OS-Sitzung visuell abgenommen. Der Peek-Erklärungstext und manche Schriftmetriken bleiben gesonderte Referenzaufgaben. Gesamtoberfläche weiterhin nicht vollständig1:1.

Dateien: public/control-panel.css, public/taskbar-properties.js und dieser Bericht mit drei Screenshotnachweisen. Keine neue Assetroute/Abhängigkeit und kein Backend-/Deploymenteingriff. Veröffentlichte Sidebar1632d46 und Themefixes erhalten; zentrale Integration weiterhin durch den anderen Chat.
