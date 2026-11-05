# Gezielte Funktionskorrekturen – 5. November 2026

Drei getrennt geprüfte statische Hotfixes wurden mit Sicherung von Quelle und Laufzeit auf explorer.xserverx.app aktiviert. Kein Dienstneustart war erforderlich.

- Editor-Dateiauswahl: app.js fe1dd1fd429e5bb1d8f4b674fa46eb071ad762d3dc316fddb700279cad2d6277. Menü und Öffnen-Werkzeug melden erst nach erfolgreichem Laden genau ein Dokumentereignis. Profil und Restoreursprung werden vor asynchronen Schritten gebunden. Unabhängiger echter synthetischer Desktop bestätigt Sprungliste und gespeicherten Datei-Pin; die ergänzende reguläre Callback-/Backendregression besteht mit 7/7 einschließlich Abbruch, Fehler, Profilwechsel, Restore und Readonly. Der separate tatsächliche Website-Nachtest folgt.
- Gruppenfensterauswahl: window-manager.js 1f254c60b759be82907b2590ef53da7f1303122901106d65885775c45621fea1. Explizites Anklicken fokussiert den aktiven Eintrag; Escape und zeitverzögertes Schließen geben den Fokus zurück. Hover erhält externen Texteingabefokus. Originalimporte bleiben erhalten. Die zwei Regressionen wurden an die bereits angepasste 40px-Testbasis angehängt; 24/24 Fenster-/Taskbar-Tests bestanden. Zwei unabhängige reale DOM-Prüfungen bestätigen den engen Fokusumfang; Website-Nachtest separat.
- Startsuch-Tastatur: desktop-shell.js dea21db2dc0b9db01b75d02127782bb2af649ca15aa51c2a9ba36191eb338c17. Ein enger Listener verwendet die vorhandenen Trefferaktionen: Pfeiltasten, Home/End, Enter und Tab erreichen und aktivieren Ergebnisse. Escape und Profilguards bleiben erhalten. Modulconsumer 32/32; unabhängiger Consumer prüfte zusätzlich acht Fokuszustände. Der unabhängige tatsächliche Website-Nachtest bestätigte Rechnerstart genau einmal, Tab/ShiftTab, Escape und unveränderte Appzahl bei Nulltreffern. Nur eigene leere Prüffenster wurden geschlossen.

Gesamter zusammengesetzter lokaler Releasebaum: 339 Tests, 338 bestanden, ein Windows-Plattformskip, keine Fehler. Die zusätzliche Browserprüfung bleibt ein optionaler Befehl mit separat installierten Playwright-Abhängigkeiten. Es wurden keine privaten Nutzerverläufe gelöscht, um die Fälle nachzustellen.

Sicherungen: /var/tmp/editor-picker-fe1dd-20261105, /var/tmp/preview-focus-1f254-20261105 und /var/tmp/search-keyboard-dea21-20261105. Öffentlich ausgelieferte Dateien wurden bytegleich mit HTTP200 bestätigt.

Die GitHub-CI fand zusätzlich einen echten Paketierungsfehler: recent-items.mjs fehlte in der expliziten COPY-Liste des Docker-Laufzeitimages. Diese einzelne Laufzeitabhängigkeit wurde ergänzt. Der native Hostbetrieb war davon nicht betroffen. Der tatsächliche Docker-CI-Nachtest wird separat dokumentiert.

Offen bleiben der eigenständige Lifecycle-Befund veralteter Gruppenvorschauzeilen, native Miniaturen/Peek und die übrige Windows-7-TODO. Diese engen Korrekturen sind keine vollständige 1:1-UI-Abnahme.
