# Tray-Flyout-Release – 5. November 2026

Die öffentliche Website enthält jetzt die vorhandene Korrektur für Uhr-/Lautstärke-Popups beim Wechsel der Taskleistenposition, einschließlich der Rückkehr nach unten. Genau eine Produktdatei wurde ersetzt: public/taskbar-layout.js, SHA256 B1985653203B25D480427CB9E16DA4DCB019E7451F39C5C61A424170101BC0CE.

Quelle, native Laufzeit und öffentliche HTTP200-Antwort stimmen exakt überein; die öffentliche ETag enthält denselben Hash. Der Dienst blieb aktiv, ein Neustart war nicht nötig. Backup beider alten Dateien: /var/tmp/tray-before-b1985653-20261105.tar.gz. PaketSHA03eaac45f91d04e8b478a033593eda9fce515e3c54587a56930402531da41c27.

29 gezielte Layout-/Eigenschaften-/Soundtests bestanden. Die unabhängige echte Browserfixture prüfte den offenen Uhrflyout Links→Unten und Oben→Unten, Lautstärke Rechts→Unten sowie AutoHide/Fokus. Jeweils6px Ankerabstand und innerhalb1280x720; keine Produktivpräferenzen verändert. Ein weiterer unabhängiger frischer Produktivtab bestätigte Hash, tatsächliche Uhr-/Lautstärkeöffnung, unteren Ankerabstand und Viewport. QMs zusätzliche echte Positionswechselprüfung folgt separat.

Die ersten beiden Live-Clipbilder des Prüfers sind wegen eines falsch erfassten Screenshot-Ausschnitts ausdrücklich verworfen; die gemessenen DOM-Werte bleiben gültig. Vollständige1280×720-Rohbilder wurden danach vom Prüfer nachgeliefert und selbst angesehen. Daraus wurde kein Produktfehler abgeleitet.

Dieser Release beinhaltet weder40px-Taskleistengeometrie noch Start-/Sprunglisten oder CPL-Kategorien. Diese vorhandenen lokalen Pakete werden getrennt geprüft und veröffentlicht. GitHub-Übernahme läuft auf codex/releases-20261105; der alte Mainstand wird bis bestätigtem Merge nicht als aktualisiert bezeichnet.
