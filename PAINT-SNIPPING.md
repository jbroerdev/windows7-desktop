# Paint und Snipping Tool

Aufruf im Startmenü oder über `/paint` / `/mspaint` und `/snippingtool` / `/snipping`.

Paint verwendet die vorhandene Aero-Fensterverwaltung, Gruppierung in der Taskleiste und den gemeinsamen Dateidialog. Implementiert sind neun Pinselvarianten, Stift, Füllen, Pipette, Radierer, Lupe, Text, 23 Formen einschließlich Kurven und Polygonen, rechteckige und freie Auswahl, Verschieben und Skalieren einer Auswahl, Zuschneiden, Spiegeln, Drehen, Größenänderung und Zerren, Schwarzweiß-Konvertierung, Rückgängig/Wiederholen und Zwischenablage. PNG, JPEG, GIF, BMP und WebP können gespeichert werden. Das Überschreiben prüft Dateiversion und Schreibberechtigung. Ungespeicherte Bilder werden mit dem persönlichen Arbeitsstand auf dem Server gesichert.

Snipping Tool verwendet die Bildschirmfreigabe des Browsers. Die Freigabe lässt sich abbrechen; nach einem Einzelbild werden sämtliche Tracks gestoppt. Rechteck, Freihand, Fenster und Vollbild stehen zur Verfügung. Für ein Fenster des Web-Desktops den aktuellen Tab freigeben; für ein natives Fenster in der Browserauswahl das entsprechende Fenster wählen. Stift, Textmarker, Entfernen ganzer Markierungen, Kopieren, Speichern und Übergabe an Paint sind implementiert. PNG, JPEG, GIF und BMP werden unterstützt. Bei einer Sitzungssicherung bleiben Grundbild und einzelne Markierungen getrennt erhalten.

## Grenzen der Nachbildung

Die Oberfläche orientiert sich an Windows 7. Die Toolbar-SVGs sind Nachzeichnungen; eine pixelidentische Übereinstimmung sämtlicher Ressourcen und Schriftmetriken wurde nicht nachgewiesen. Natürliche Pinsel werden mit Canvas simuliert und verhalten sich nicht bitgenau wie Microsofts Paint. TIFF, Scanner, MHT-Export, direkter E-Mail-Versand mit Anhang und native Drucker-Seiteneinstellungen sind nicht implementiert. GIF wird mit einer festen 256-Farben-Palette exportiert. Animierte GIFs werden als Einzelbild bearbeitet.

Die Aufnahme benötigt HTTPS oder localhost und eine Browserfreigabe. Die tatsächliche Freigabe eines Bildschirms konnte im eingebetteten Vorschau-Browser nicht abgeschlossen werden; Markierungen und Radierer wurden mit einem isolierten Testausschnitt geprüft. Die normale Zwischenablage hängt von Browserunterstützung und Berechtigung ab. Paint besitzt zusätzlich eine interne Zwischenablage zwischen Paint-Fenstern.

Die Canvas-Grenze beträgt 32 Millionen Pixel; für Rückgängig werden höchstens 30 Schritte beziehungsweise ungefähr 128 MiB vorgehalten. Die vorhandene serverseitige Grenze von 8 MiB gilt weiterhin für den gesamten gesicherten Desktop-Arbeitsstand. Die Undo-Historie von Paint wird nicht über eine Sperrung hinweg gesichert.

## Verifikation

- Tests: `node --test paint.test.mjs image-file.test.mjs`, außerdem die vollständige Testsuite.
- Browser: Rechteck, Füllen, Rückgängig/Wiederholen, Text, Auswahl, Skalieren und Verschieben, Farbdialog, Speichern und Überschreiben, GIF öffnen, Abbruch beim Schließen, Sperren und Wiederherstellen eines ungespeicherten Paint-Bildes.
- Snipping-Testbild: Stift, Textmarker, Entfernen einer einzelnen Markierung und Optionen.

Asset-Quellen stehen in `public/icons/paint-tools/ATTRIBUTION.md`.
