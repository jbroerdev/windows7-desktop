# Windows-7-Webdesktop: Ausbauplan

Stand: 4. November 2026. Ziel: ein in Aussehen und Bedienung möglichst originalgetreuer Windows-7-Desktop. Dies ist ein Webdesktop; Win32-Programme, Treiber und ein Windows-Kernel sind damit nicht automatisch vorhanden. Keine erfundenen Ergebnisse für fehlende Funktionen anzeigen.

Diese Liste bei jeder Windows-Erweiterung aktualisieren. Im Abschluss jeweils nennen: umgesetzt, geprüft, als Nächstes geplant. Offene Aufgaben nicht als erledigt darstellen.

## Verifizierter Stand und nächste Arbeit

Stand 4. November 2026, 21:20 MEZ. Maßgeblich sind die aktuellen Nachweise; ältere Abschnitte darunter beschreiben teilweise frühere Paketstände.

- Produktiv: `6870e59`, 299 bestandene Linux-Tests; Desktop nativ, Apps weiterhin Docker. Infobereich samt Dialog, Kontobindung, Systemsteuerung und Taskleisten-Eigenschaften ist veröffentlicht und live geprüft. Zusätzlich originales Glas-/Schattenpaket `7fcdd0a` veröffentlicht, 22 gezielte Frame-Tests und drei echte Livezyklen mit Rohpixelvergleich bestanden. Marker: `6870e59-plus-aero-7fcdd0a-299-suite-22-frame-tests-live-verified`.
- Korrigierte Abnahme: Die vermeintlich weißen Folgeaufnahmen waren eine Fehlinterpretation der Bildvorschau. Gespeicherte Dateien enthalten unverändert sämtliche Kategorien; direkte Folgeaufnahmen sind bitidentisch. Kein Renderingfehler der Anwendung wurde dadurch nachgewiesen. Diagnoseänderungen sind verworfen; maßgeblicher Bericht `RESULTS-AERO-CAPTURE-VERIFICATION.md`.
- Danach: Startmenü-Verlauf/Datenschutz und Sprunglisten, fortsetzbare interaktive CMD-/Batchzustände, verbleibende Befehls-/Host-/Registry-/Datenträgerfunktionen sowie alle offenen Originaltreue- und Installertests der Hauptliste. Diese Punkte bleiben vollständig im Auftrag; keine Gesamtfertigmeldung.
- Veröffentlichung auf GitHub weiterhin ausschließlich über die Website. Die lokalen aktuellen Commits sind mit einem erfolgreichen Host-Deployment nicht automatisch auf GitHub veröffentlicht.
- Separat veröffentlicht am 4. November: Login-Link „Öffentlichen Share-Desktop öffnen“ ist initial verborgen und wird nur bei `session.shareEnabled === true` angezeigt. Lokal anonym mit Share aus/ein geprüft, produktive Sitzung meldet Share aus und der Link bleibt verborgen. Nur `public/login.js` und `public/login.html` in Host-Quelle und nativer Laufzeit ersetzt, ohne Dienstneustart; Dateihashes identisch. Sicherung `/var/tmp/login-share-before-20261104.tar.gz`. Bildnachweis `.asset-cache/login-share-disabled.png`. Unfertige Sprunglisten wurden damit nicht veröffentlicht.
- RDP-Text-Clipping separat veröffentlicht als Asset-Paket `560e812`: ausschließlich `remote-desktop.js`/`.css` in Host-Quelle und nativer Laufzeit, Dienst weiterhin aktiv ohne Neustart. Backup `/var/tmp/rdp-layout-before-560e812.tar.gz`. SHA256 JS `1373f2acfb897320c4d04dafc14b4a31611dedc78d2c047b317d1a55046b8156`, CSS `4fa8caea3cd00e85a1a10a276b97059fe66cd61631b75caf823d7c1b7945bc9a`, lokal und Host identisch. Produktive App über `/remote-desktop` frisch geprüft, exakte Warnung initial und nach Optionen → Erweitert → Zurückklappen vollständig; Formular clientHeight=scrollHeight122, noteInside=true. Bild `.asset-cache/rdp-status-fixed-live.png`. Keine echte RDP-Verbindung gestartet. Unabhängige Mindestgrößen-/Max-Restore-Abnahme bleibt ausdrücklich offen; keine globale RDP-Fertigmeldung. Backend und unveröffentlichte Desktop-Erweiterungen unverändert.
- RDP-Nachabnahme inzwischen eingetroffen (`a1207a0`, `RESULTS-RDP-INDEPENDENT.md`): identische Asset-Hashes auf isolierter Fixture, alle vier Register, Auf-/Zuklappen, kompakt/erweitert Max/Restore und tatsächlich erreichte Mindestgröße410×260 bestanden. Formular an Mindestgröße31px hoch, aber scrollbar; Tab erreicht Zwischenablage/Sound und scrollt26→56. Das schließt die genannten lokalen Layoutprüfungen, nicht schmale Browser-Viewports, alle Fehlermeldungen, echte Verbindungen oder native Pixelabnahme. Rohbilder/903-Zeilen-Messprotokoll übernommen; keine globale RDP-Fertigmeldung.
- Neue verbindliche Nutzerreferenz verlangt anderen RDP-Kompaktaufbau. `560e812` bleibt technische Clipping-Korrektur, ausdrücklich keine Originaltreue-Abnahme:311px-Höhenwachstum wird durch neuen lokalen Entwurf ersetzt. Dieser nutzt420×260, einzeiligen fetten Titel, statische Benutzerzeile und einen gemeinsamen Kontextbereich; tatsächlicher Serviceblocker ersetzt dort den nativen Leermeldungstext. Titel-RGB aus Originalpixeln `0,51,153` übernommen. Dialoggrößen rechnen mit `taskbarWorkArea`, nicht mehr pauschal innerHeight−42. Eigene Messung mit Warnung:420×260, Computer210×22, Hinweis28px, Formular110/110px. `.asset-cache/rdp-native-compact-draft.png` dokumentiert Struktur vor letzter reiner Titelfarbkorrektur. Weitere Zustände/Originalvergleich sind an Prüfer übergeben; neuer Entwurf noch nicht veröffentlicht. Die vorherigen technischen Tests beweisen diese neue Originaltreue nicht.

## Host-Betrieb und Serververwaltung

### Laufende Arbeit: Startmenü und Sprunglisten (lokal, noch nicht veröffentlicht)

- Persönlicher Programm-/Dateiverlauf mit getrennten Datenschutzeinstellungen; Profilwechsel verwirft verspätete und wartende Client-Schreibvorgänge. Der Server prüft die erwartete Profil-ID zusätzlich.
- Startmenü zeigt angeheftete und häufig verwendete verfügbare Programme getrennt. „Aus Liste entfernen“ entfernt einen Programmeintrag aus dem Verlauf.
- Entfernen eines Dateiverlaufseintrags ist serverseitig und im Client vorbereitet. Es löscht keine Datei und verändert keine Verlaufseinträge anderer Anwendungen. Explizit angeheftete Dateien sind separat gespeichert, überstehen das Abschalten des Verlaufs und lassen sich lösen. Die Ausgabe prüft aktuelle Datei- und Anwendungsberechtigungen; gelöschte Ziele werden ausgefiltert.
- Aktueller gezielter Testlauf: 23/23 bestanden (`start-menu-state`, `recent-items-api`, `recent-activity`, `taskbar-properties`), zusätzlich 18/18 Fenster-/Taskleisten-Tests. Enthält echte HTTP-Prüfungen zu Kontotrennung, Freigabeentzug, Umbenennung, Datenschutz, Anheften/Lösen und Entfernen ohne Dateiverlust. Das Sprunglistenmodell trennt Anwendungen sowie angeheftete und zuletzt verwendete Einträge ohne Doppelanzeige. Explizite Speicherfehler werden gemeldet; bestehende Anzeige bleibt erhalten.
- Startmenü-Sprunglistenbereich lokal eingebaut: Pfeil/ArrowRight, angeheftete und letzte Dateien, Öffnen mit zugehöriger Anwendung, Anheften/Lösen sowie Kontextaktionen. Im vollständigen isolierten Desktop wurde `History-Test.txt` wirklich geöffnet und anschließend über die Oberfläche angeheftet; Zustand „Angeheftet“ sichtbar, Nachweis `.asset-cache/start-jump-pinned-local.png`. Ein dabei gefundener falscher Öffnen-Handler wurde korrigiert; Desktop startet danach erfolgreich.
- Taskleisten-Sprungliste lokal angeschlossen, auch für laufende nicht angeheftete Programme. Öffnen/Lösen/Anheften einer Testdatei im vollständigen Desktop geprüft. Nach Enter auf Lösen bleibt der Fokus auf dem passenden Anheften-Knopf; Escape schließt das Menü und fokussiert das Taskleistensymbol. Positionierungsmodell für alle vier Taskleistenkanten samt Viewportgrenzen getestet. Offene Fensterlisten werden vor der Sprungliste geschlossen. Bildnachweis `.asset-cache/task-jump-local.png`. Aktionen zum Starten/Anheften der Anwendung und Schließen ihrer Fenster sind eingebaut; Schließen noch nicht per Browser abgenommen.
- Öffnungswege erweitert: Office meldet die ursprüngliche gespeicherte Datei erst nach vertrauenswürdiger `Document_Loaded`-Rückmeldung und höchstens einmal pro Ladevorgang. Wiederhergestellte Erstöffnung wird ausgelassen; späteres manuelles Öffnen im selben Fenster wird wieder erfasst. Das ist durch einen neuen Office-Test belegt, einschließlich fremder und doppelter Rückmeldungen. Gezielter Testlauf nun 28/28 inklusive Office-Speicherrückmeldungen.
- Foto-/Medieninstanzen melden erfolgreiche Bild-/Metadatenladung an den übergeordneten Desktop. Quelle, App-Zuordnung und beim Öffnen gebundenes Profil werden geprüft. Im vollständigen isolierten Desktop wurden `History-Picture.png` und `History-Audio.wav` wirklich geladen; beide erscheinen danach in ihrer jeweiligen Sprungliste. Nachweise `.asset-cache/photo-jump-local.png` und `.asset-cache/media-jump-local.png`. Wiederherstellung setzt bei diesen Ladewegen die Verlaufserfassung aus; der vollständige Sperren-/Entsperren-Test dafür bleibt offen.
- Player-Sperren/Entsperren danach tatsächlich geprüft: Oberfläche meldet gesperrtes Profil, nach Anmeldung kehren Player, `History-Audio.wav` und Position `00:01` zurück. Vollständige API-Verlaufsantwort vorher/nachher identisch (`.asset-cache/recent-lock-before.json`, `recent-lock-after.json`, Vergleich `unchanged: true`); kein zusätzlicher Aufruf gezählt. Dies belegt den geprüften Player-Durchlauf, nicht sämtliche Apps oder Transcodierungsfehlerwege. „Fenster schließen“ in der Taskleisten-Sprungliste ebenfalls wirklich ausgeführt: Playerfenster und Taskleisteneintrag entfernt, DOM-Prüfung `playerWindows: 0`.
- Explorer-Ordnernavigation mit echter Benutzeraktion an den Verlauf angeschlossen. Im vollständigen Desktop `Dokumente` aufgerufen, danach `Documents` in der Explorer-Sprungliste angezeigt und über diesen Eintrag in einer neuen Explorer-Instanz geöffnet. Nachweis `.asset-cache/folder-jump-local.png`. Navigation während Arbeitsstand-Wiederherstellung bleibt ausgenommen.
- Startmenü-Tastaturbedienung ergänzt und wirklich geprüft: rechte Pfeiltaste am Programm öffnet die Sprungliste und fokussiert die Datei; rechts wechselt zum Anheftknopf, Enter heftet an und erhält den passenden Fokus nach Aktualisierung. Links kehrt zur Datei und anschließend zum ursprünglichen Programm zurück. Up/Down/Home/End sind implementiert, deren vollständiger Mehrzeilentest bleibt offen.
- Gruppen-/Aktivierungspaket `01f557f` gezielt lokal integriert: Stapelanzeige/Zähler auch bei angehefteten Programmen, Gruppierung ohne App-ID, Vordergrundübergabe beim Minimieren, kein Fokusdiebstahl beim Schließen eines Hintergrundfensters. Eigene Sprunglisten-Hooks bleiben erhalten. Nur neue Stack-CSS-Regeln übernommen, aktuelle Confirm-Dialog-Korrektur nicht zurückgesetzt. 34 gezielte Integrationschecks bestanden; kombinierte Browser-/Linux-Abnahme noch offen. Native Aero-Thumbnails/Peek sind damit nicht implementiert.
- Aktiver Richtungsschatten aus `d459c3b` ausschließlich als Ein-Regel-Diff lokal übernommen. Keine Farb-/Filter-/Confirm-/Stack-Regel ersetzt. Native Messung und Abnahmegrenzen stehen in `RESULTS-AERO-SHADOW-CALIBRATION.md`; Inaktivmaterial bleibt separat offen.
- Taskbar-Flyout-Paket zur Integration angenommen: `taskbar-layout.js` verankert Uhr-/Lautstärkemenüs auch bei Rückkehr nach unten neu, statt alte Inline-Positionen zu behalten. 54 kombinierte gezielte Tests bestanden. Im vollständigen Desktop Links → Oben → Unten über Eigenschaften gespeichert und Uhr geöffnet; Rechtecke links `(68,437,348,271)`, oben `(915,46,348,271)`, unten `(915,403,348,271)`, innerhalb 1280×720. Testprofil wieder auf Unten gestellt. Nachweis `.asset-cache/taskbar-flyout-bottom-return.png`. Native Pixelabnahme und Lautstärkeweg noch offen; noch kein Host-Deployment dieses Pakets.
- Lautstärkeweg ebenfalls im vollständigen Desktop geprüft: Rechts → Unten über Eigenschaften; Menü rechts `(1159.5,376,70,292)`, unten `(1104,384,70,292)`, ohne Veränderung der Lautstärke 80 %. Testprofil wieder Unten/fixiert. Nachweis `.asset-cache/taskbar-sound-bottom-return.png`; native Pixelabnahme bleibt offen.
- Kontextmenü auf freier Taskleistenfläche ergänzt: Desktop anzeigen, Task-Manager starten, Fixierung umschalten und Eigenschaften. Rechte Maustaste und Shift+F10 tatsächlich geprüft; Eigenschaften öffnen den vorhandenen Dialog, Fixierung lässt sich dauerhaft aus- und wieder einschalten. Schreibaktion ist an das beim Menüöffnen aktuelle Profil und Share-Kontext gebunden. Nachweis `.asset-cache/taskbar-context-local.png`. Fensteranordnungen/Symbolleisten und vollständige native Menüoptik bleiben offen.
- AutoHide-Integration ergänzt: geöffnete Taskleisten-Sprunglisten halten die Taskleiste sichtbar und werden nicht als Lautstärkeflyout umpositioniert. Regressionstest prüft Sichtbarkeit bis zum tatsächlichen Schließen und unveränderte eigene Menükoordinaten. 20 gezielte Layout-/Eigenschaften-/Soundtests bestanden; vollständiger Browser-AutoHide-Durchlauf mit Sprungliste bleibt offen.
- Unerreichbare Anheftungen bleiben explizit lösbar: API liefert ausschließlich eigene gespeicherte IDs mit neutralem Text „Nicht mehr verfügbar“, ohne früheren Namen/Pfad/Inhalt; erreichbare Einträge bleiben getrennt. Start-/Taskleisten-Sprunglisten zeigen diese Einträge mit deaktiviertem Öffnen und nutzbarem Lösen. Tastaturnavigation überspringt deaktivierte Öffnen-Schaltflächen. 16 gezielte Modell-/Client-/HTTP-Tests bestanden, einschließlich Rechteentzug und Aufräumen ohne Änderung anderer Konten. Volle 100er-Liste verliert bei abgelehnter neuer Anheftung nichts und nimmt nach explizitem Lösen wieder einen Eintrag auf. Sichtbare Browserabnahme dieses neuen Platzhalters noch offen.
- Platzhalter danach im vollständigen Desktop tatsächlich geprüft: eigene Testdatei angeheftet und in den Papierkorb gelöscht, neutraler deaktivierter Öffnen-Knopf und erreichbares Lösen per Tastatur bestätigt. Nach Entfernen des letzten Eintrags gefundenen Fokusverlust korrigiert und mit neuem Testeintrag wiederholt: Fokus kehrt zu `Notepad++` zurück. Nachweis `.asset-cache/unavailable-jump-local.png`.
- Inaktiver Schatten aus `7478995`/`c3d812d` als einzelne CSS-Kette samt korrigiertem Messbericht/Rohdaten übernommen. Aktiver Schatten, Confirm-Dialog und Stack-Regeln erhalten. Nativer rechter Rahmen bei x302 statt x301 in der Messung berücksichtigt; ein Pixel Rechnerbreite bleibt eigener offener Punkt. Kein Host-Deployment dieser lokalen Erweiterungen.
- Native Himmel-Standardfarbe aus `95d9f93` lokal integriert: Standard/Palette `#74b8fc`, gespeicherte eigene Farben bleiben unverändert. Inaktives transparentes Glas aus `59acf7c` nur als abgegrenzte CSS-Regel übernommen, keine Opaque-/Aktiv-/Profiländerung. 29 Appearance-/Fenster-/Personalisierungschecks bestanden. Im vollständigen lokalen Desktop gemeinsam geprüft: aktives CP `rgba(116,184,252,.46)` mit blur14/saturate1.25; inaktives RDP `rgba(255,255,255,.07)` mit blur14. Nachweis `.asset-cache/aero-integrated-active-inactive.png`; native Gesamtmaterialabnahme und Veröffentlichung bleiben offen.
- Systemsteuerungs-Kategoriekomponenten lokal ins bestehende Routing integriert, Assets serverseitig registriert. Zielaktionen nur für vorhandene freigegebene Seiten; Gäste erhalten keine aktiven Einstellungsaktionen. Nicht implementierte Funktionen bleiben inaktiv und entsprechend gekennzeichnet. CSS auf neue Unterseiten begrenzt, Container-Query richtet Spalten nach tatsächlicher Clientbreite. 12 kombinierte Kategorie-/CP-/HTTP-Prüfungen bestanden. Im vollständigen Desktop Darstellung/Anpassung mit534px Clientbreite einspaltig geprüft und „Fensterfarben ändern“ erfolgreich zur vorhandenen Farbseite navigiert. Bild `.asset-cache/control-panel-category-integrated.png`. Native Detailseiten-/Pixelabnahme, weitere echten Zielseiten und Veröffentlichung bleiben offen; keine fertige Systemsteuerung behauptet.
- Kategorieaktionen zusätzlich an aktuellen Profil-/Share-Kontext gebunden. Share erlaubt Darstellungsaktionen nur dem Administrator, persönliche Kontoaktionen bleiben dort inaktiv. Alte Kategorie-Links navigieren nach Kontextwechsel nicht mehr. 12 gezielte Kategorie-/CP-Tests bestanden, einschließlich dieser Fälle; keine neuen Hostberechtigungen geschaffen.
- Inaktive Titelfarbe aus `43aef39` lokal als eine Farbzeile auf Schwarz korrigiert, gemessene Originaltitel als Quelle. Schriftgröße und vorhandener Textglanz unverändert; Report/Rohbild/Pixelwerte übernommen. Keine vollständige ClearType-/DWM-Gleichheit behauptet und noch nicht veröffentlicht.
- Neuer lokaler Gesamtlauf vor Rechnerbreiten-/RDP-Nacharbeiten: 323 Tests, 322 bestanden, 1 übersprungen, 0 Fehler (`.asset-cache/windows7-suite-integrated.log`). Rechnerbreite danach gezielt auf228 korrigiert; aktuelle Statistik-/Workspace-Erweiterungen erhalten, vier exakte alte Test-Erwartungen entsprechend aktualisiert; 40 Rechner-/Fenstertests bestanden.
- Direkte Nutzerpriorität RDP-Text-Clipping lokal reproduziert und korrigiert: kompaktes Formular schnitt Hinweistext ab. Status bleibt ungestaucht, Formular ist bei Platzmangel scrollbar, Dialog wächst bei Inhaltsüberhang; erneute Prüfung nach Zurückklappen ergänzt. Exakte Zielcomputer-Warnung im vollständigen Desktop sowie Optionen → Erweitert → Zurückklappen geprüft: Höhe311, Formular122px ohne Scrollüberhang, Hinweis vollständig enthalten. Fixture verweigert echte Verbindungen. Nachweis `.asset-cache/rdp-status-collapse-fixed.png`; unabhängige Abnahme/Veröffentlichung noch offen.
- Verlauf-Aufräumen nach Rechteentzug korrigiert: eigene gespeicherte Einträge lassen sich lösen/entfernen, auch wenn ihr Ziel nicht mehr lesbar ist; neue Öffnungen/Anheftungen benötigen weiterhin aktuelle Zugriffsrechte. HTTP-Test prüft tatsächliche Persistenz, Profilwechsel-Abweisung, unveränderte Datei und erhaltene Anheftung im anderen Konto.
- Lokaler Gesamtlauf für diesen Arbeitsstand: 319 Tests, 318 bestanden, 0 fehlgeschlagen, 1 übersprungen (Log `.asset-cache/windows7-suite-current.log`, 16,07 s). Der Startsound-Test benötigte die neue Sprunglisten-Abhängigkeit im Testaufbau; korrigiert und Gesamtlauf wiederholt. Dies ersetzt den noch offenen Linux-Gesamttest und die native Optikabnahme nicht.
- Weiter offen: vollständige Tastatur-/Fokusprüfung einschließlich Startmenü, Originalsymbole statt vorläufiger Anheftzeichen, weitere Dateiöffnungswege, vollständige Bedienungs-/Optikprüfung anhand nativer Referenz, Linux-Gesamttest und Veröffentlichung. Diese Teilprüfung belegt keine fertigen Sprunglisten.

- [x] Desktop als nativer systemd-Dienst, Apps weiterhin in Docker.
- [x] Private Host-Agent-Schnittstelle mit serverseitig geprüfter Benutzerrolle.
- [x] Begrenzte Diagnosebefehle für Benutzer; Host-Dateibefehle und native Linux-Programme für Administratoren.
- [x] Konkrete Befehlsvorschau und Bestätigung für Host-Änderungen.
- [x] Interne Docker-Rückrufbrücke für Office und Browser-Downloads; dynamische Container-Adressen.
- [x] Installer für bestehende Linux/systemd/Docker-Stacks, Einstieg für Neuinstallation, Update und Rückweg.
- [x] Taskmanager-Kontextmenüs für Host-Prozesse, Systemdienste und Docker-Container.
- [ ] Neuinstallationspfad auf weiteren Distributionen und ARM64 separat testen; Ubuntu-Hostmigration ist die erste geprüfte Plattform.
- [x] Host-Dateisystem unter Netzwerk → Hostsystem im vorhandenen Explorer: Administratorzugriff, Brotkrumen, Ordnerbaum, Texteditor, Ordner anlegen, Umbenennen, Download, Eigenschaften und wiederherstellbares Löschen.
- [x] Host-Änderungen serverseitig auf Admin beschränken, konkrete Bestätigung, Dateiversionen prüfen, Sicherung vor dem Schreiben; privater Papierkorb je Dateisystem, Wiederherstellung ohne Überschreiben vorhandener Ziele.
- [x] Host-Uploads und neue Textdateien: Fortschritt/Abbruch, versionierte Namenskonflikte mit Ersetzen/Überspringen/Beide behalten, atomische Veröffentlichung nach Größen-/Prüfsummenprüfung, wiederherstellbare Sicherung beim Ersetzen und Aufräumen nach Agent-Neustart. Beide behalten, Ersetzen mit Original-Sicherung und neue Textdatei live geprüft.
- [x] Reguläre Dateien zwischen Host und Profil sowie innerhalb des Host-Dateisystems kopieren/verschieben: Fortschritt, Abbruch, Quell-/Zielversionen, Konfliktdialog, atomische Veröffentlichung und Quelle erst nach erfolgreicher Kopie in den wiederherstellbaren Papierkorb. Profil-Schreibrechte und Linux-Besitzer werden beachtet. Live mit 1-MB-Binärdatei in beiden Richtungen und Host→Host geprüft.
- [x] Rekursive reguläre Host-/Profil-Dateibäume einschließlich leerer Ordner, Zielordner zusammenführen, innere Namenskonflikte mit Ersetzen/Überspringen/Beide behalten und Abbruch mit Erhalt fertiger Elemente. Beim Verschieben nur vollständig kopierte Dateien entfernen, übersprungene Quellen erhalten und erst anschließend leere Quellordner in den Papierkorb legen. Linux-Integrationstest und sichtbare Host-Ordnerzusammenführung geprüft.
- [x] Explorer-Profil-Transfers mit denselben Konfliktdialogen: Ersetzen mit wiederherstellbarer Sicherung, Überspringen, Beide behalten, Ordner zusammenführen, leere Ordner und Profil-Verknüpfungen. Fortschritt/Abbruch, Metadatenjournal und Neustart-Recovery, Datei-/Elternordnersperren und serverseitige Profilrechte geprüft.
- [ ] Desktop-/Dateiverknüpfungen im Host-Transfer und vollständiges Undo/Redo über abgeschlossene Transfers ergänzen; echte externe Datenträger separat abnehmen. CMD-Schalter und Überschreibabläufe bleiben separat im Befehlsinventar offen.
- [ ] Host-Dateirechte/ACLs gezielt bearbeiten; feinere Host-Freigaben für andere Rollen, Dateiwächter für mehrere Explorer-Fenster, rekursive Ordnergrößen mit Fortschritt und getrennte Ansicht früherer Dateiversionen ergänzen.
- [ ] Host-Papierkorb: Wiederherstellung fehlender Eltern mit ursprünglichen Rechten, konfigurierbare Aufbewahrung, Größenanzeige und Verwaltungsaktionen vervollständigen.
- [ ] Loopback-only-Betrieb mit separatem Callback-Socket.
- [ ] Vollständiges Befehls-/Aktionsaudit, feinere Rollen und pro Befehl konfigurierbare Freigaben.
- [x] Profilgebundene Host-Befehlssitzungen mit sofortiger Ausgabe, Prozessgruppen-Abbruch und Wiedereinstieg nach Neuladen; Linux-Prozessabbruch und 35-Sekunden-Lauf live geprüft.
- [ ] Voll interaktive PTY-Sitzungen (Eingabe, Terminalgröße, Vollbildprogramme); Wiederherstellung auch verschachtelter Batch-/Pipelinezustände und über einen Host-Agent-Neustart hinweg.

## Aktueller Auftrag: CMD

- [x] Vorhandene Navigation, Programmstarts, Ordner anlegen, Umbenennen, Papierkorb und Nano erhalten.
- [x] Batchdateien `.bat`/`.cmd`: CALL, Parameter %0–%9, REM, @ECHO OFF, Labels, GOTO, EXIT /B; Rekursions- und Befehlsgrenzen.
- [x] SET/Umgebungsvariablen, einfache FOR-IN-DO-Schleifen, CMD /C und /K.
- [x] TYPE, FIND /I /V /C, SORT /R, Textvergleich FC/COMP, TREE /F.
- [x] Pipes und Textumleitung > und >>; Pfade in Anführungszeichen.
- [x] COPY/XCOPY und MOVE mit Explorer-Dateirechten; Zielnamen und Kollisionen prüfen.
- [x] RD/RMDIR und DEL/ERASE verwenden den wiederherstellbaren Papierkorb.
- [x] COLOR, TITLE, PROMPT, VER, PAUSE, TIMEOUT; DATE/TIME anzeigen.
- [x] TASKLIST zeigt Desktop-Fenster und vorhandene Host-Prozesse; TASKKILL schließt passende Desktop-Fenster über den normalen Schließen-Handler.
- [x] SYSTEMINFO verwendet Host-Monitor-Daten, PERFMON öffnet Taskmanager.
- [x] HELP-Ausgabe nach bereitgestellter deutscher Windows-Vorlage; CMD-Eingabe-/Ausgabeschrift und gemeinsame Aero-Titelschrift korrigiert.
- [x] `.bat`/`.cmd` per Explorer-Doppelklick im Dateiordner starten; Rechtsklick → Bearbeiten im Editor geprüft.
- [x] IF EXIST/DEFINED/ERRORLEVEL, NOT und Zeichenfolgenvergleich mit /I; ELSE für Klammerblöcke.
- [x] FOR /L sowie FOR /F für Text-/Datei-/Befehlsquellen, mehrzeilige Klammerblöcke, &&/|| anhand echter Rückgabewerte, Caret-Escapes; SETLOCAL/ENDLOCAL, PUSHD/POPD.
- [x] Tab/Shift+Tab vervollständigt profilzugängliche Dateien/Ordner; Abbruchlogik für clientseitige Batchverarbeitung und PAUSE/TIMEOUT automatisiert geprüft; Tastaturabnahme Strg+C im eingebetteten Browser noch offen (Kombination wird von der Browsersteuerung abgefangen).
- [x] CALL :Label mit getrennten Parametern/Rückkehr, GOTO innerhalb von IF, SHIFT und %~dp0; verschachtelte Rückkehr getestet.
- [x] FOR /R und /D, Dateimuster * / ? in FOR/TYPE/IF EXIST; FOR /F-Resttext bewahrt Trennzeichen.
- [x] Pipelines verwenden auch die tatsächliche Host-Ausgabe, statt native Befehle durch eine lokale Ersatzantwort zu ersetzen.
- [x] Abbruch an Host-Prozessgruppen weiterreichen; Fenster schließen bricht auch eine wiederaufgenommene Host-Sitzung ab. Normale Benutzer: 30 Sekunden; Admin-Sitzungen: bis zu einer Stunde, jeweils 1 MB Ausgabe.
- [ ] Strg+C/Strg+Pause als echte Tastenkombination in einem normalen Browser abnehmen; die eingebettete Browsersteuerung fängt Strg+C ab.
- [ ] Alle unten als teilweise/offen markierten Befehle vollständig umsetzen und mit echten Ergebnissen testen.

### Befehlsinventar

„Basis“ bedeutet brauchbare Grundfunktion, keine vollständige cmd.exe-Kompatibilität aller Schalter. Im Host-Modus verwenden Administratorbefehle die echten Linux-Dateien und Programme. Normale Dateioperationen bleiben auf das eigene Desktop-Profil beschränkt. Die unten aufgeführten Grenzen der Windows-Abbildung bleiben sichtbar; ein vorhandenes natives Linux-Programm kann als Administrator zusätzlich direkt gestartet werden.

| Status | Befehle | Grenzen / nächste Ergänzung |
| --- | --- | --- |
| Basis | call, cd, cls, cmd, color, dir, echo, exit, find, hostname, pause, sort, start, timeout, title, ver, set, rem | CALL-Labels vorhanden; verschachtelte CMD-Umgebungen, DIR-Schalter und genaue Windows-Fehlercodes ausbauen; &&/|| und Host-Rückgabewerte vorhanden |
| Basis | for | IN-Liste, /L, /F, /R, /D und * / ? vorhanden; weitere Variablenmodifikatoren und genaue cmd.exe-Sonderfälle prüfen |
| Basis | type, tree, mkdir, rename, copy, xcopy, move, erase, del, rmdir, rd | TYPE-Dateimuster vorhanden; Wildcards für weitere Dateioperationen, Mehrfachquellen, XCOPY-Schalter und Überschreibdialoge fehlen |
| Erweitert / Rest offen | comp, fc | Binär-/Textvergleich, FC-Resynchronisierung und Dateimuster sowie interaktive COMP-Dateinamen-/Optionen-/J/N-Schleife umgesetzt und produktiv geprüft; vollständige OEM-/ANSI-Regeln, DOS-8.3-Suchmasken, große Binär-Streams und physischer Strg+C-Nachweis fehlen weiterhin |
| Teilweise | diskcomp | Textvergleich statt Diskettenabbilder; echte Abbildprüfung fehlt |
| Teilweise | replace | Ersetzen wird erkannt, aber ohne fertigen Überschreibablauf abgelehnt |
| Teilweise | date, time, w32tm | Anzeige bzw. W32TM /QUERY; Änderungen über gemeinsame Desktop-Zeiteinstellungen fehlen |
| Basis Host / teilweise | tasklist, taskkill, perfmon, systeminfo | Echte Host-Prozesse, TASKKILL /PID für Admin, Taskmanager; mehr Windows-Filter und Formate fehlen |
| Basis Host / teilweise | ipconfig | Echte Schnittstellen über ip address; Windows-DHCP/DNS-Schalter und /ALL-Format fehlen |
| Teilweise | attrib, chkdsk, ftype, vol, gpresult | Attribute lesen, virtueller Verzeichnischeck, Basis-Dateizuordnungen, Volume-/Profilinformationen; Änderungen und vollständige Daten fehlen |
| Offen | runas | Getrennte authentifizierte Benutzerkontexte, nicht das globale Profil wechseln |
| Basis Host / teilweise Windows | shutdown | Administrator: echtes Linux-Shutdown/Reboot mit einer Minute Vorlauf und /A zum Abbrechen; weitere Windows-Schalter und Desktop-Arbeitsstand fehlen |
| Offen | ftp, tftp, telnet | Separater Protokoll-Dienst, Zugriffskontrolle, interaktive Sitzungen und Transferfortschritt |
| Basis Host | nslookup, ping, pathping, tracert | Echte Linux-Werkzeuge mit Zeit-/Ausgabelimit; Ausgabeformat und weitere Windows-Schalter fehlen |
| Basis Host / offen | getmac, netstat, route / netsh | MAC-, Verbindungs- und Routingdaten über ip/ss; netsh und Windows-Konfigurationsschalter fehlen |
| Offen | compact, expand | ZIP/CAB-/Kompressionsfunktionen anbinden, Formatunterstützung präzise ausweisen |
| Offen | diskcopy, defrag, diskpart, format, chkntfs, driverquery, label, mode, mountvol, verify | Virtuelle Datenträgerverwaltung und Prüfmodell bauen; keine Linux-Host-Befehle als Windows-Ergebnis ausgeben |
| Offen | gpupdate | Gemeinsames Richtlinienmodell mit Benutzerverwaltung und Berechtigungen |
| Offen | reg | Persistente virtuelle Registry pro Profil, HKCU/HKLM-Trennung, Rechte, Import/Export und Regedit |

## Nächste Arbeitspakete, in Reihenfolge

1. CMD-Kompatibilität vervollständigen: Weitere Variablenmodifikatoren, exakte Fehlercodes, Tastaturabnahme Host-Ctrl+C, Wildcards für Dateiänderungen, DIR-Schalter und erweiterte Batchtests. Parser/IF-Basis, FOR /L, Profil-Tab-Vervollständigung und clientseitiges Ctrl+C sind umgesetzt.
2. Netzwerkdiagnose erweitern: echte DNS-/Ping-/Traceroute-Ergebnisse sind über den Host-Agent bereits vorhanden; Sitzungsausgabe, Prozessabbruch und Wiederaufnahme vorhanden; Windows-Ausgabeformate und interaktive Netzwerkprogramme fehlen.
3. Virtuelle Registry und Regedit; Dateizuordnungen und Richtlinien darüber gemeinsam verwalten.
4. Virtuelle Datenträgerverwaltung für Diskpart/Format/Label/Volumes mit Vorschau und wiederherstellbaren Operationen.
5. Runas und Shutdown auf echte Desktop-Sitzungen beziehen; Arbeitsstände zuverlässig sichern.
6. FTP/TFTP/Telnet als eigene, isolierte Dienste mit Transfers nach Profil-Downloads.

## Windows-7-Originaltreue

- [x] Gemeinsame Titelschrift auch für Titelcontainer außerhalb von SPAN; automatisch vergebene ARIA-Titel-IDs.
- [x] Gemeinsames Fenstermenü mit Wiederherstellen, Verschieben, Größe ändern, Minimieren, Maximieren und Schließen; Pfeiltasten/Enter/Escape, Tastatur-Verschieben und Rücknahme live geprüft.
- [ ] Alt+Leertaste und Alt+F4 im normalen Browser separat abnehmen; eingebettete Browsersteuerung kann Systemkombinationen selbst abfangen.

- [ ] Referenzbilder für Aero Basic/Aero, aktive/inaktive Fenster, Dialoge, Menüs, Icons, Abstände und Schriftmetriken sammeln; Vergleichsansichten bei mehreren Auflösungen erstellen.
- [ ] Gemeinsame Menü-/Dialog-/Toolbar-Komponenten vereinheitlichen; Original-Icons wiederverwenden.
- [ ] Vollständige Tastaturbedienung: Fokusrahmen, Alt-Menüs, Zugriffstasten, Standard-/Abbrechen-Schaltflächen, Kontextmenütaste.
- [ ] Fensterverhalten: Aero Snap/Shake/Peek, konsistente Mindestgrößen, Modaldialoge, Fokus und Taskleisten-Aufmerksamkeit.
- [ ] Explorer: Navigation/Breadcrumbs, Details, Vorschau, Sortierung/Gruppierung, Suchfilter, Dateitypen, Mehrfachauswahl, Drag-and-drop und Undo vereinheitlichen.
- [ ] Startmenü: zuletzt verwendete Programme/Dokumente, Sprunglisten, Suche und Benutzeraktionen vervollständigen.
- [ ] Taskmanager: Prozess-/Dienstfilter, Spalten, Sortierung und kontinuierliche Leistungsdiagramme.
- [ ] Systemsteuerung: Netzwerkcenter, Geräte-/Druckeransicht, Programme, Standardprogramme, Bedienungshilfen, Energieoptionen und Wartungscenter priorisieren.
- [ ] Papierkorb-Eigenschaften, Datei-/Ordnerattribute, Berechtigungsdialoge und Eigenschaften vereinheitlichen.
- [ ] Notepad, WordPad, Rechner, Paint, Snipping Tool und Medienplayer gegen Originalbedienung prüfen.
- [ ] Mail/Kalender: konsistente Kontextmenüs, Ansichtseinstellungen, Ordneraktionen, Tastenkürzel und zuverlässige Offline-Daten.
- [ ] Sperren/Abmelden/Wiederherstellen aller Apps mit ungespeicherten Zuständen testen.
- [ ] Sounds, Benachrichtigungen, Uhr, Tray und Lautstärke konsistent machen.
- [ ] Barrierefreiheit, Touch/kleine Bildschirme und mehrere Monitore prüfen.
- [ ] Ressourcenverbrauch und Ladezeiten messen; sichtbares Flackern und Layoutsprünge beseitigen.
- [ ] Automatisierte Funktionsprüfungen plus visuelle Abnahme anhand echter Windows-7-Referenzen für jedes Arbeitspaket.

## Prüfstand Host-Terminals – 4. November 2026

- Node-Tests für Identität/Rolle, Cursor, Bestätigung, Wiederaufnahme und Sitzungsabbruch.
- Sieben Python-Tests auf dem Ubuntu-Host erfolgreich, darunter echte vorzeitige Ausgabe und Prozessgruppen-Abbruch; derselbe Linux-Test wird auf Windows gezielt übersprungen.
- Live: Ausgabe vor Prozessende; 35-Sekunden-Befehl beendet erfolgreich; Neuladen während eines 40-Sekunden-Befehls stellt dessen Ausgabe wieder her; anschließendes Fensterschließen beendet ihn mit Abbruchstatus statt die zweite Testausgabe auszuführen.
- Kein PTY und keine interaktive Standardeingabe in diesem Paket. Ausgabe und Jobs werden im Host-Agent gehalten; Browser speichert nur Sitzungskennung/Arbeitsverzeichnis pro Profil. Agent-Neustart beendet diese Sitzungen; abgeschlossene Ausgaben werden begrenzt aufbewahrt.

## Prüfstand Host-Explorer – 4. November 2026

- Gemeinsamer Explorer und Editor statt zusätzlicher Browseroberfläche; Host-Pfade liegen unter `/Network/Hostsystem/`, normale Profil-Laufwerke bleiben bestehen.
- Sieben Dateisystemtests unter Linux einschließlich BOM-Erhalt: Rollen/Symlink-Grenzen, Speichern/Sicherung/Versionskonflikte, Umbenennen/Kollisionen, Papierkorb/Wiederherstellung, Downloads in begrenzten Blöcken und Sonder-/Systempfade.
- Zusätzlicher Test und Live-Prüfung mit getrennten Dateisystemen (`/tmp` gegenüber `/var/lib`): privater Papierkorb auf dem Quelldatenträger, kein riskantes rekursives Kopieren/Löschen.
- Live: eigene isolierte Testdatei bearbeitet, auf dem Host verifiziert, gelöscht und bytegleich wiederhergestellt; anschließend den eigenen Testordner wiederherstellbar aufgeräumt. Keine bestehenden Nutzerdaten für Schreibtests verwendet.
- JSON-/Download-Schnittstelle prüft das aktuelle Administratorkonto; Gäste, Share-Sitzungen und normale Nutzer werden vor dem Dateizugriff abgewiesen. Textbearbeitung maximal 2 MB, Listen maximal 5.000 Einträge; Spezialdateien sind nicht als reguläre Dateien downloadbar.
- Noch keine vollständige Abnahme sämtlicher Host-Dateifunktionen oder eine vollständige Windows-7-Pixelabnahme. Die offenen Übertragungs-, Rechte- und Versionsansichten oben bleiben Teil des Gesamtauftrags.

## Prüfstand rekursive Übertragungen – 4. November 2026

- Vorbereitung erfasst maximal 10.000 Einträge / 128 Ebenen und prüft Quellbaum-Version, Rollen, Profilrechte, Office-Sperren und Zielkonflikte. Quell- und Zielpfade dürfen nicht ineinander liegen; aufgelöste Pfade verhindern das Umgehen über Aliase.
- 178 Node-Tests direkt auf Ubuntu erfolgreich, darunter Integration mit echtem privaten Python-Dateiagent und isolierten Host-/Profil-Dateien. Zusätzlich 25 Python-Tests für Terminal, Host-Dateien und Uploads erfolgreich. Lokal unter Windows: 177 erfolgreich, der Linux-Integrationstest gezielt übersprungen.
- Live: verschachtelte Host-Ordner zusammengeführt, Beide behalten innerhalb eines Unterordners, unveränderte bestehende Zieldatei und zusätzliche Datei sowie kopierter leerer Ordner auf dem Host geprüft. Keine vorhandenen Nutzerdaten als Schreibtest verwendet.
- Browser-Download-Warteschlange: Aufräumrennen im Linux-Gesamttest gefunden und behoben; persistenter Übergabebeleg verhindert erneuten Import beim Aufräumen nach einem Neustart.

## Prüfstand Profil-Transfers – 4. November 2026

- 184 Node-Tests direkt auf Ubuntu erfolgreich. Neue API-Prüfung verwendet ein normales Benutzerkonto und umfasst Ersetzen, eindeutige Sicherungs-IDs/Wiederherstellung, Ordnerzusammenführung, übersprungene Quellen beim Verschieben, Elternordnersperren während eines echten 32-MB-Transfers und Wiederherstellung einer Sicherung nach Entzug der ursprünglichen ACL-Freigabe.
- Abbruch, Sitzungsentzug, veraltete Zielversion und Metadaten-Schreibfehler nach Veröffentlichung separat geprüft. Das private Journal vervollständigt einen veröffentlichten Datensatz nach Neustart; abweichende Datei-Inhalte werden nicht anhand alter Journal-Metadaten übernommen.
- Öffentlich lesbare Verknüpfungen übertragen beim Kopieren in ein eigenes Profil keine fremden gespeicherten Anmeldedaten; auch der bestehende COPY-API-Pfad ist abgedeckt.
- Live im Admin-Profil: Ordner zusammengeführt, vorhandene Notiz ersetzt und Original-Bytes im Papierkorb geprüft; anschließend Beide behalten und eine zweite Konfliktdatei übersprungen. Leerer Ordner, Unterordner-Inhalt und weitere Zieldatei erhalten; keine temporären Upload-Dateien oder offenen Transferjournale übrig.
- Vollständiges Undo/Redo bleibt offen; die Sicherung und Papierkorb-Wiederherstellung sind noch kein gemeinsamer Rückgängig-Verlauf.

## Prüfstand Datei-Verlauf – 4. November 2026

- [x] Erster gemeinsamer, persistenter Verlauf für Profil-Umbenennungen: Bearbeiten/Organisieren sowie Strg+Z und Strg+Y; persönliche und Share-Bearbeitung getrennt, maximal 50 Einträge pro Kontext. Eingabefelder behalten ihren eigenen Text-Undo.
- [x] Wiederholen prüft aktuelle Rechte, Transfer-/Office-Sperren, Elternordner, Dateityp und Dateisystem-Identität. Veraltete Verlaufstoken oder Namenskollisionen ändern keine Datei; neue Umbenennung verwirft den Wiederholen-Zweig. Verlauf speichert keine Datei-Inhalte oder Verknüpfungskennwörter.
- [ ] Diesen Verlauf auf Erstellen, Kopieren, Verschieben, Papierkorb/Wiederherstellen und Host-Dateien erweitern; zusammengehörige Mehrfachaktionen und Konfliktentscheidungen als einen Vorgang behandeln.
- [ ] Absturzsichere Befehlsjournale, veraltete Einträge überspringen/Verlauf leeren sowie sämtliche Dateiaktionen über mehrere Explorer-Fenster abnehmen. Der bisherige Transfer-Journalmechanismus ersetzt dieses gemeinsame Undo-Journal nicht.
- Automatisiert: persistierter Verlauf nach Neuaufbau, Datei-Inhalt, externe Ersetzung, Kollision, Rollenzugriff, Rechteentzug, Office-/Transfersperre und gleichzeitige doppelte Undo-Anforderung geprüft. Gesamtsuite auf Windows: 185 erfolgreich, ein Linux-Test gezielt übersprungen.

- Live: Menü-Rückgängig, Strg+Y, Strg+Z und Wiederholen-Eintrag nach Neuladen erfolgreich geprüft; Datei-Inhalt bleibt unverändert. Linux-Gesamtsuite: 186 erfolgreich. Beim Löschen werden nur die Umbenennungs-Einträge der betroffenen Dateien aus dem Verlauf entfernt; andere Einträge bleiben erhalten. Diese Bereinigung ist zusätzlich über die echte API geprüft.

## Prüfstand Papierkorb-Verlauf – 4. November 2026

- [x] Profil-Löschen und manuelles Wiederherstellen laufen über denselben persistenten Verlauf wie Umbenennen; Strg+Z/Strg+Y und die vorhandenen Explorer-Menüs verwenden automatisch die passende Aktion.
- [x] Ketten Umbenennen → Löschen → Rückgängig → Rückgängig sowie Löschen → manuell Wiederherstellen → beide rückgängig/wiederholen werden mit echten Dateien und verschachtelten Ordnern geprüft. Neue Papierkorb-Kennungen beim erneuten Löschen aktualisieren zusammengehörige Verlaufsbefehle.
- [x] Konflikte überschreiben kein vorhandenes Ziel. Vor erneutem Löschen werden Datei-/Ordneridentitäten, Größen und Änderungszeiten des tatsächlichen Baums geprüft; nachträglich bearbeitete wiederhergestellte Dateien bleiben erhalten. Keine Behauptung eines Inhaltsvergleichs trotz identischer manipulierten Zeitstempel.
- [x] Ein fehlgeschlagener Metadaten-Commit wird in beiden Richtungen durch Rückverschieben der eigenen Datei und passende Metadaten zurückgenommen; gezielt injizierter Fehler mit anschließend erfolgreicher Wiederherstellung getestet. Vollständige Stromausfall-/Absturzjournale bleiben offen.
- [x] Endgültiges Leeren/Purgen entfernt die betroffenen Verlaufsreferenzen. Historie enthält keine Datei-Inhalte oder Verknüpfungskennwörter.
- [ ] Mehrfachauswahl als eine Aktion, Transfer-Konfliktentscheidungen, Erstellen/Kopieren/Verschieben sowie Host-Dateien in den gemeinsamen Verlauf aufnehmen.
- Lokale Gesamtsuite vor dem zusätzlichen Commit-Fehlertest: 186 erfolgreich, ein Linux-Test gezielt übersprungen; beide neuen Papierkorb-Tests danach erfolgreich. Linux-Gesamtsuite: alle 188 erfolgreich. Live: Entf-Löschen, Menü-Rückgängig, Strg+Y, manuelles Wiederherstellen und Rückgängig dieser Wiederherstellung erfolgreich; Notiz anschließend auf dem Host bytegleich geprüft. Eigener Testordner zum Abschluss wiederherstellbar im Papierkorb.

## Prüfstand Mehrfach-Papierkorb – 4. November 2026

- [x] Bis zu 100 Profil-Wurzeln gemeinsam löschen oder aus dem Papierkorb wiederherstellen; überlappende Ordner-/Kind-Auswahl wird beim Löschen bereinigt. Explorer und Papierkorb verwenden dieselbe Stapel-Schnittstelle.
- [x] Der Verlauf zählt zusammengehörige Teilbefehle als eine Benutzeraktion. Einmal Rückgängig/Wiederholen bearbeitet die ganze Gruppe; das Menü zeigt deren verbleibende Anzahl. Die Aufbewahrung zählt 50 Aktionen und schneidet keine 60-Dateien-Auswahl nach 50 Dateien ab.
- [x] Bei erst später auftretenden Konflikten bleiben erledigte Teile in der Gegenrichtung und noch offene Teile in der ursprünglichen Richtung verfügbar; Meldung nennt den erledigten Anteil. Keine Behauptung einer atomaren Gesamttransaktion.
- [x] Separat gelöschte Eltern-/Kind-Einträge werden beim gemeinsamen Wiederherstellen nach Abhängigkeit geordnet; danach funktioniert Rückgängig in umgekehrter Reihenfolge. Ordnerprüfung vergleicht Identität und tatsächliche Struktur; Datei-Größe/Änderungszeit bleiben Teil der Prüfung. Alte Verlaufs-Fingerabdrücke werden beim Abspielen weiterhin verstanden.
- [ ] Gruppen über 100 Einträge, gemischte Desktop-Verknüpfungen/Host-Dateien und gemeinsame Kopier-/Verschiebeaktionen einschließlich Konfliktentscheidungen weiter ausbauen. Größere/mischte Auswahlen behalten den bisherigen Ablauf statt am neuen API-Limit zu scheitern.
- Automatisiert: 3 Wurzeln mit eingeschlossenem Kind, Mehrfach-Wiederherstellen, Teilkonflikt mit erneutem Wiederholen, Eltern-/Kind-Abhängigkeit, persistierte Gruppenkennung und 60 Elemente als eine Aktion geprüft. Linux-Gesamtsuite: alle 190 erfolgreich; danach zusätzlicher Test für entzogene Sitzungsberechtigung zwischen Teilaktionen. Alle 14 Nachtests auf Ubuntu erfolgreich. Live: Dreierauswahl mit Entf gelöscht, einmal Rückgängig/Wiederholen für alle drei, ausgewählte Dreiergruppe aus dem Papierkorb wiederhergestellt; Menü zeigt eine Aktion mit 3 Elementen. Alpha-/Beta-Dateien auf dem Host bytegleich geprüft. Alter Verlauf aus der vorherigen Version ebenfalls erfolgreich abgespielt und bytegleich geprüft. Eigener Testordner anschließend wiederherstellbar aufgeräumt.

- Vor jeder weiteren Teilaktion wird die aktive Sitzung einschließlich Kontosperre und Share-Bearbeitungsrolle erneut geprüft. Ein getesteter Entzug stoppt die restlichen Dateien; bereits erledigte Teile bleiben wiederherstellbar.

## Prüfstand Übertragungsbelege – 4. November 2026

- [x] Bestätigte Profil-Übertragungen erfassen tatsächliche neue Ziele, ersetzte Ziele samt Sicherungskennung und beim Verschieben gesicherte Originale. Ein zusammengeführter, bereits vorhandener Zielordner und übersprungene Dateien werden nicht als neu erzeugt verbucht.
- [x] Belege und Dateimetadaten werden beim jeweiligen erfolgreichen Teilschritt gemeinsam gespeichert. Kopier-Dateijournale enthalten die zugehörige Belegkennung; ein nach Veröffentlichung aufgetretener Metadatenfehler kann beim Neustart den fehlenden Beleg genau einmal ergänzen.
- [x] Abbruch eines Ordnerkopiervorgangs erfasst nur den bereits angelegten Ordner, keine unveröffentlichte Teildatei. Laufende Belege werden nach Neustart als unterbrochen markiert.
- [x] Persönliche/Share-Kontexte getrennt, 50 ganze Vorgänge bzw. 20000 Teilschritte pro Kontext aufbewahren; HMAC-Versionen mit eigenem dauerhaftem Schlüssel (Dateimodus 0600) statt Verknüpfungskennwörtern in den Belegen. Schlüsseldatei gehört zusammen mit der Datenbank ins Daten-Backup.
- [ ] Rücknahme-/Wiederholen-Ausführung auf diesen Belegen aufbauen: neue Ziele entfernen, Ersetzen umkehren und ursprüngliche Quellen beim Verschieben korrekt wiederherstellen; gemeinsame Auswahl gruppieren und Konflikte/Teilfortschritt anzeigen. Kopieren/Verschieben bietet deshalb noch keinen vollständigen Undo-Verlauf.
- [ ] Eigene absturzsichere Journale für Ordner-/Verknüpfungs- und Quell-Papierkorb-Transaktionen ergänzen; der vorhandene Wiederanlaufbeleg deckt veröffentlichte reguläre Zieldateien ab.
- Automatisiert: normale Benutzer-API mit Ersetzen, Zusammenführen, übersprungenen Quellteilen beim Verschieben, Wiederanlauf nach Veröffentlichung, Abbruch vor Dateiveröffentlichung, stabilen Versionen nach Neustart, Kontexttrennung und ganzen aufbewahrten Belegen. Lokal 192 Tests erfolgreich, ein Linux-Test übersprungen; zusätzlicher Abbruchtest danach erfolgreich. Linux-Gesamtsuite: alle 194 erfolgreich. Nachtest ergänzt: Nachziehen des zwischengespeicherten Größenfelds invalidiert keinen Beleg, echte Dateiänderung dagegen schon. Alle 9 gezielten Nachtests auf Ubuntu erfolgreich. Live: Ordner zusammengeführt, eigene Notiz ersetzt, zwei neue Ziele erfasst; vorhandener Zielordner und unveränderte Datei nicht als neu verbucht. Alte/neue Bytes und Schlüsselmodus 0600 auf dem Host geprüft. Eigener Testordner anschließend wiederherstellbar aufgeräumt.

## Prüfstand Übertragungs-Undo – 4. November 2026

- [x] Neue Profil-Übertragungen pro Quellwurzel in den gemeinsamen persistenten Verlauf aufnehmen; Menü/Strg+Z/Strg+Y kehren ihre tatsächlichen Teilschritte in passender Reihenfolge um. Kopieren entfernt nur neu erzeugte Ziele; Zusammenführen lässt vorhandene Ordner und unbeteiligte Dateien stehen.
- [x] Ersetzen von Dateien und Verknüpfungen rückgängig/wiederholen; Zielkennung, aktuelle Freigabefelder und Berechtigungen bewahren. Vor Umschaltung wird eine unabhängige aktuelle Sicherung gespeichert; bei Metadatenfehler nach Umschaltung stellt ein Inode-Anker die ursprüngliche Datei wieder her.
- [x] Verschieben stellt ursprüngliche Kennungen und genaue Eltern wieder her, auch Profil-Wurzeln ohne Elternkennung. Bei übersprungenen Konflikten bleiben Quellreste und vorhandene Ziele erhalten. Kein stilles Ausweichen nach Documents beim Transfer-Undo.
- [x] Nachträglich bearbeitete Ziele und zusätzliche Dateien in neu angelegten Ordnern schützen; Teilstände bleiben in Undo/Redo erreichbar. Rechte-/Office-/Transfersperren pro Schritt erneut prüfen. Endgültiges Entfernen benötigter Sicherungen nimmt die abhängige Übertragungsaktion vollständig aus dem Verlauf.
- [x] Rückabgewickeltes Entfernen einer Quelle nimmt auch den zugehörigen Beleg/Undo-Schritt zurück; bereits fertig kopierte Ziele bleiben separat rückgängig machbar.
- [ ] Mehrere gleichzeitig ausgewählte Quellwurzeln als eine Kopier-/Verschiebeaktion gruppieren; ältere COPY/MOVE-/CMD-Wege sowie Host-Dateien anbinden.
- [ ] Stromausfallsichere Replay-Journale und Wiederaufnahme nach Prozessabbruch ergänzen. Vor dem Dateiaustausch gespeicherte Sicherungen bewahren Daten, ersetzen aber noch kein vollständiges Fortschrittsjournal. Verwaiste private Inode-Anker nach Abstürzen gezielt wiederherstellen/aufräumen.
- [ ] Dateisysteme ohne Hardlink-Unterstützung für Ersetzen-Undo ergänzen; derzeit sichere Ablehnung vor Veröffentlichung. Interne Versionssicherungen/deren manuelle Papierkorb-Aktionen in eine konsistente Versionsansicht integrieren; verbrauchte/veränderte Sicherungen können Undo derzeit absichtlich blockieren.
- Automatisiert: normales Benutzerkonto, zweimaliges Hin-/Herwechseln einer Ordnerzusammenführung mit Ersetzen, Link-Anmeldedaten, Move-/Rename-Kette, Wurzelordner, übersprungene Teile, Rechteentzug, bearbeitete Ziele, zusätzliche Dateien sowie injizierter Metadatenfehler. Lokale Gesamtsuite: 196 erfolgreich, ein Linux-Test übersprungen; gezielte Nachtests danach erfolgreich. Linux-Gesamtsuite: alle 198 Tests erfolgreich. Live auf Webdock: Kopieren mit Zusammenführen/Ersetzen, Rückgängig, Wiederholen und Verschieben samt Rücknahme ausgeführt; tatsächliche Dateiinhalte, unveränderte Zieldateien, stabile Zielkennungen und ursprüngliche Quellkennungen auf dem Host geprüft. Desktop nativ aktualisiert, App-Container unverändert.


## Prüfstand gemeinsame Übertragungen – 4. November 2026

- [x] Eine Explorer-Auswahl erhält eine gemeinsame Vorgangskennung für persönliche Profil-Transfers. Menü und Verlauf zählen Quellwurzeln statt interner Dateischritte; einmal Rückgängig/Wiederholen arbeitet die ganze zusammenhängende Auswahl ab.
- [x] Mehrfach-Kopieren und -Verschieben, Teilkonflikt mit geschützter bearbeiteter Datei sowie Wiederholen erledigter Teile automatisiert geprüft. Eine nach einer anderen Aktion wiederverwendete Kennung verbindet keine alten Verlaufsteile.
- [x] Belegaufbewahrung zählt ganze Gruppen; 60 Quellwurzeln bleiben gemeinsam erhalten und werden nach 50 neueren Aktionen gemeinsam entfernt.
- [ ] Gemischte Host-/Profil-Auswahlen und ältere COPY/MOVE-/CMD-Wege weiterhin in denselben Verlauf einbinden. Unterbrechungen durch andere Fenster erzeugen getrennte zusammenhängende Gruppen; keine atomare Transaktion über mehrere HTTP-Anfragen behaupten.
- Gezielte lokale Suiten: 17 Backend- und 9 Auswahltests erfolgreich. Linux-Gesamtsuite: alle 200 Tests erfolgreich. Live auf Webdock: Zweierauswahl kopiert, Menü zeigt 2 Elemente; einmal Rückgängig entfernt beide Kopien, einmal Wiederholen stellt beide wieder her. Quell-/Zielbytes und gemeinsame Beleggruppe auf dem Host geprüft.


## Prüfstand CMD-Übertragungen – 4. November 2026

- [x] Profil-COPY/XCOPY/MOVE im Desktop-CMD nutzen den versionierten Explorer-Übertragungsweg mit denselben Konfliktentscheidungen und persistentem Undo/Redo. Ein abweichender Zielname wird direkt übernommen; kein zusätzlicher Umbenennen-Schritt im Verlauf.
- [x] REPLACE kann eine vorhandene reguläre Profildatei mit wiederherstellbarer Originalsicherung ersetzen. Rückgängig und Wiederholen tauschen die Versionen unter stabiler Zielkennung.
- [x] Abbruch meldet einen Fehlerstatus für &&/||; Überspringen meldet 0 verarbeitete Einträge. Tests prüfen Kopieren, Move-Quellwiederherstellung, REPLACE, Abbrechen, Überspringen und eine fehlende REPLACE-Zieldatei.
- [ ] Vollständige Windows-Schalter und Wildcards/Mehrfachquellen bleiben offen; /Y war in diesem Zwischenstand noch kein dialogfreier Überschreibmodus; Umsetzung siehe nächsten Prüfstand. Host-CMD-Dateioperationen und direkte ältere API-Aufrufer benötigen weiterhin ihren eigenen Anschluss an den Dateiverlauf.
- Lokale gezielte Tests zunächst 25 erfolgreich; nach Ergänzung der Profil-/Host-Auswahl alle 17 CMD-Nachtests erfolgreich. Linux-Gesamtsuite vor Asset-/Dispatch-Nachkorrekturen: alle 202 Tests erfolgreich. Alle 17 CMD-Nachtests einschließlich HTTP-Asset und Profil-/Host-Auswahl auch unter Linux erfolgreich. Live: Batchdatei mit COPY und Ersetzen ausgeführt, im Explorer rückgängig gemacht und wiederholt; Original-/Neuinhalte und stabile Zielkennung auf dem Host geprüft. Eigene Testdateien anschließend wiederherstellbar aufgeräumt.

- Profil-Transfers werden auch für Administratoren vor der nativen Host-Ausführung erkannt, sofern Quelle und Ziel bekannte Profilpfade sind. Externe Ziele und native Linux-Programme bleiben beim Host-Agent. HTTP-Test prüft zusätzlich die tatsächliche JavaScript-Auslieferung des neuen CMD-Moduls.


## Prüfstand CMD-Überschreiben – 4. November 2026

- [x] COPY/XCOPY/MOVE werten /Y und /-Y aus. COPYCMD liefert die Vorgabe; explizite Schalter haben Vorrang, bei mehreren entscheidet der letzte. SETLOCAL/ENDLOCAL erhält die Vorgabe korrekt.
- [x] COPY und MOVE innerhalb einer Batchdatei verwenden ohne ausdrückliche Vorgabe den rückfragefreien Modus; XCOPY fragt standardmäßig weiterhin nach. /-Y erzwingt die Rückfrage auch in Batchdateien.
- [x] /Y benötigt keine zusätzliche Kopierbestätigung; die serverseitigen Versions-/Rechteprüfungen und wiederherstellbaren Originalsicherungen bleiben aktiv. Ersetzen und anschließendes Undo mit normalem Benutzerkonto automatisiert geprüft.
- Referenz: Microsoft-Befehlsdokumentation für COPY, MOVE und XCOPY; https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/copy/ und entsprechende MOVE/XCOPY-Seiten.
- Lokal: alle 27 CMD-/Auswahltests erfolgreich. Linux-Gesamtsuite: alle 204 Tests erfolgreich. Live: Batch-COPY /Y ohne Dialog abgeschlossen, COPY /-Y trotz COPYCMD=/Y mit Konfliktdialog übersprungen; Rückgängig stellt das erste Original bytegleich unter stabiler Zielkennung wieder her. Eigener Testordner anschließend wiederherstellbar aufgeräumt. Vollständige weitere Schalter, Wildcards und Host-Undo bleiben offen.


## Prüfstand CMD-Dateimuster – 4. November 2026

- [x] COPY/XCOPY/MOVE/REPLACE können mit * und ? mehrere direkt passende Profildateien auswählen; Groß-/Kleinschreibung wird ignoriert. *.* verwendet den vorhandenen Matcher und schließt auch Namen ohne Erweiterung ein. Ordner und enthaltene Dateien werden bei der Musterauswahl nicht versehentlich mitgenommen.
- [x] Dateimuster benötigen einen vorhandenen Profil-Zielordner; fehlende Treffer und unzulässige Mehrfachziele scheitern vor der ersten Übertragung. Maximal 10000 Quellen je Befehl. Das Zusammenfügen mehrerer Quellen zu einer Datei wird ausdrücklich noch nicht umgesetzt.
- [x] Alle erfolgreichen Quellen eines Befehls teilen eine Vorgangskennung. Normales Benutzerkonto: echte Mehrfach-Kopie mit einmal Undo/Redo und Mehrfach-Move mit Wiederherstellung ursprünglicher Kennungen automatisiert geprüft.
- [x] Abbruch zwischen Quellen stoppt weitere Übertragungen; ein späterer Fehler nennt die bereits abgeschlossene Anzahl. Fertige Teilvorgänge bleiben im Dateiverlauf verfügbar.
- [ ] Rekursive XCOPY-Auswahl/-Schalter, weitere Wildcard-Zielnamen, explizite Mehrfachquellen und Host-Verlauf bleiben offen.
- Lokale gezielte Suite: alle 29 Tests erfolgreich. Linux-Gesamtsuite: alle 206 erfolgreich. Live: Batch-COPY /Y mit Source\*.txt kopiert nur die zwei direkten TXT-Dateien; Binärdatei und Unterordner bleiben unberührt. Gemeinsames Undo/Redo über Explorer und echte Quell-/Zielbytes auf dem Host geprüft; eigener Testordner anschließend wiederherstellbar aufgeräumt.


## Prüfstand rekursives XCOPY – 4. November 2026

- [x] XCOPY mit Profil-Quellordner oder Dateimuster kopiert die ausgewählten Inhalte direkt in den vorhandenen Zielordner, ohne einen zusätzlichen Quellordner darum anzulegen.
- [x] Ohne /S oder /E nur direkte passende Dateien; /S zusätzlich passende Dateien in Unterordnern und deren erforderliche Eltern, /E zusätzlich sämtliche leeren Unterordner. Dateimuster gelten in jeder Ebene. Unpassende Dateien bleiben ausgeschlossen.
- [x] Serverseitige Auswahl, Rechteprüfung und ein gemeinsamer Übertragungsbeleg; Undo/Redo entfernt bzw. rekonstruiert die tatsächliche Zielstruktur. Auswahloptionen sind an die Vorschau-Version gebunden; ungültige Pfadmuster werden abgelehnt.
- [ ] /I mit neuen Zielordnern, Einzelfile-/Zielmasken-Sonderfälle, /H-/R-/K-Attribute und weitere Originalschalter bleiben offen; unbekannte physische Quelleinträge werden wie bei regulären Profil-Transfers vor der Vorschau synchronisiert. Kein vollständiger Win32-/Attributnachbau behauptet.
- Lokale Integrationsprüfung mit normalem Benutzerkonto: direkte Auswahl, /S-Muster, /E einschließlich leerer Kinder, Ausschlüsse, genaue Zielstruktur, Undo/Redo und veränderte Vorschauoptionen erfolgreich. Linux-Gesamtsuite: alle 206 Tests erfolgreich. Live: /S und /E mit derselben TXT-Maske nebeneinander ausgeführt; echte Inhalte, ausgeschlossene Binärdateien und unterschiedliche leere Ordner geprüft. Undo/Redo der /E-Struktur lässt die /S-Kopie unverändert. Eigener Testordner anschließend wiederherstellbar aufgeräumt.


## Prüfstand XCOPY /I – 4. November 2026

- [x] /I kann einen fehlenden Zielordner für eine Profil-Ordner-/Musterauswahl anlegen. /S-/E-Auswahl, Vorschauversion, Berechtigungen und ein gemeinsamer Übertragungsbeleg schließen den neuen Zielordner ein.
- [x] Einmal Undo entfernt Ordner und kopierte Inhalte; Redo stellt dieselbe Zielkennung mit der Verzeichnisstruktur wieder her. Ohne /I wird ein unbekannter Zielordner weiter vor der Übertragung abgelehnt. Ein vorhandenes Dateiziel wird nicht als Ordner verwendet.
- [ ] Mehrere fehlende Zielebenen, Dateiziel-/Einzelquell-Sonderfälle und weitere XCOPY-Schalter bleiben offen.
- Lokale Prüfung mit normalem Benutzerkonto und ergänzten Ablehnungstests erfolgreich. Linux-Gesamtsuite: alle 207 Tests erfolgreich. Live: fehlenden Zielordner mit /I /E /Y angelegt, passende Dateien und leere Unterordner kopiert; einmal Undo entfernt den gesamten neuen Zielbaum, Redo stellt seine ursprüngliche Zielkennung und Inhalte wieder her. Auf dem Host geprüft; eigene Testdaten anschließend wiederherstellbar aufgeräumt.


## Prüfstand DIR-Schalter – 4. November 2026

- [x] Profil-DIR mit Dateimustern, mehreren Pfaden, /B, /S, /W, /L und /P; kombinierte Schalter wie /B/S/O:N. /B erzeugt bei /S vollständige Windows-Pfade und lässt sich durch Pipes/FOR-F weiterverarbeiten.
- [x] /A mit tatsächlichen D-/H-Merkmalen einschließlich Negation; ohne /A ausgeblendete Einträge und deren verborgene Unterordner nicht rekursiv auflisten. /O mit N/E/S/G, Kombinationen und Umkehrung. Unterstützte Parameter werden explizit geprüft.
- [x] Bekannte Profilpfade werden auch für Admins vor der nativen DIR-Ausführung erkannt; externe Hostpfade bleiben beim Host-Agent. Pause/Abbruch und Byte-Größensortierung automatisiert geprüft.
- [ ] Vollständige klassische Detailausgabe einschließlich echter Änderungs-/Zugriffszeiten, Volume-Seriennummer/freiem Platz und Summen, weitere Attribute, /D-/Q-/X-/T-/C-Optionen, DOS-8.3-Wildcards und an die Fensterhöhe angepasstes Paging fehlen. Keine synthetischen NTFS-/Zeitangaben erzeugen.
- Referenz: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/dir
- Lokal alle 23 CMD-/Transfernachtests einschließlich FOR-/F-Verarbeitung erfolgreich. Linux-Gesamtsuite: alle 209 Tests erfolgreich; nativer Desktop auf Webdock aktualisiert, App-Container unverändert. Live-Abnahme der DIR-Ausgabe und Linux-Nachtest der zuletzt ergänzten FOR-/F-Assertion noch offen.

## Prüfstand Rechner-Integration – 4. November 2026

- [x] Isolierten Rechner-Commit geprüft und übernommen: Standardmaße 227 × 322, Menüspalten, deaktivierte Maximierung, Zifferngruppierung ohne Präzisionsverlust, Menü-Tastatursteuerung und Alt+1/2/3.
- [x] Lokal alle neun Rechner-/UI-Tests erfolgreich; neue UI-Tests in die reguläre Gesamtsuite aufgenommen.
- [ ] Wissenschaftliche/Programmierer-Geometrie, Statistik und Arbeitsblätter, vollständiger Originalverlauf sowie zentrale Live-Abnahme/Veröffentlichung dieser Rechneränderungen bleiben offen. Messbilder und Bericht: RESULTS-CALCULATOR.md und calculator-verification/.

- Zentrale Linux-Gesamtsuite einschließlich UI-Tests und finaler DIR-FOR-/F-Assertion: alle 212 Tests erfolgreich. Auf Webdock veröffentlicht, Apps unverändert. Produktiver Rechner über Start geöffnet; deaktivierte Maximierung, Menü und Umschalten von 12345 auf 12.345 geprüft. DIR-Live-Abnahme weiterhin offen.


## Zwischenstand Statistik-Rechner – 4. November 2026

- [x] Separate Beobachtungsliste mit Hinzufügen, Entfernen, Leeren und Kopie für Wiederherstellung vorbereitet. Anzahl, Summe, Quadratsumme, Mittelwert sowie Stichproben-/Populationsstandardabweichung implementiert; zentrierte Abweichungen erhalten kleine Differenzen bei großen Ausgangswerten.
- [x] Lokal alle elf Rechner-/UI-Tests erfolgreich, einschließlich bekanntem Datensatz, Einzelwert, ungültigen Eingaben und großen Offsets.
- [ ] Noch keine Statistik-Oberfläche oder Verbindung zur Fensterwiederherstellung; Menü bleibt bis zur Umsetzung deaktiviert. Diese Engine-Erweiterung ist noch nicht veröffentlicht. Prüfer bearbeitet abgegrenzt wissenschaftliche/Programmierer-Geometrie.


## DIR-Live-Abnahme – 4. November 2026

- [x] Produktive Batchdatei über /cmd/C/Users/admin/Downloads/Dir-Live-20261104/Run.cmd gestartet: /B /O:-N ergibt B.TXT vor A.txt; /B/S/O:N liefert beide direkten TXT-Dateien und Sub/Deep.txt als volle Windows-Pfade; /AD nur Sub; /OS nach echten Byte-Größen; FOR /F verarbeitet beide direkten TXT-Dateien ohne Kopfzeilen. Other.bin ausgeschlossen.
- [x] Screenshot .asset-cache/cmd-dir-live.png. Eigene Testdaten anschließend über Explorer wiederherstellbar in den Papierkorb verschoben; vorhandener Audit-Ordner unverändert. Initialer Aufräumfehler war EACCES durch meine als root angelegten Testdateien; nur deren Eigentümer auf den Desktop-Dienst korrigiert, danach Papierkorbverschiebung sichtbar bestätigt.
- [ ] Klassische DIR-Detailausgabe und die zuvor genannten weiteren Schalter weiterhin offen.


## Zwischenstand Rechnerzustand und reale Dateizeiten – 4. November 2026

- [x] Statistikdaten werden unabhängig im Rechner-Snapshot gespeichert und wiederhergestellt; CE/C entfernen die Beobachtungsliste nicht. Ungültige Daten abgewiesen; ältere Zustände ohne Statistik kompatibel.
- [x] Dateisystemscan erfasst echte mtime-Werte für Dateien und Ordner; auch gleich große externe Änderungen aktualisieren die Metadaten. /api/nodes reicht modified weiter. Keine Importzeit als Änderungszeit ausgegeben.
- [x] Lokal alle 17 Rechner-/UI-/Storage-Tests erfolgreich, einschließlich Worker-Ruhe nach unveränderten Scans und tatsächlicher Zeitänderung bei gleich großem Inhalt.
- [ ] DIR-Formatierung und Datumssortierung auf Basis dieser Metadaten, Linux-Gesamttest und Veröffentlichung dieses Pakets folgen. Statistik-UI bleibt weiterhin offen.


## DIR-Änderungszeit – 4. November 2026

- [x] Detailzeilen zeigen echte modified-Zeit im deutschen Datumsformat mit lokaler Browserzeit; fehlende/ungültige Zeitangaben bleiben leer. /O:D und /O:-D sortieren Zeitwerte; /T:W wird akzeptiert. Import-created wird ausdrücklich nicht als echte Dateierstellung verwendet; /T:C bleibt abgewiesen.
- [x] Lokal alle 22 CMD-/Storage-Tests erfolgreich, einschließlich Datumssortierung, unbekannten Zeitwerten und unverändertem /B-Format.
- [ ] Linux-Gesamtsuite, Veröffentlichung und produktive Datumsausgabe folgen. Volume-/Summenausgabe und weitere DIR-Schalter weiterhin offen.

- Linux-Gesamtsuite: alle 217 Tests erfolgreich; Paket auf Webdock veröffentlicht. Live mit echten mtimes 2020/2021 geprüft: /O:D und /O:-D liefern umgekehrte Reihenfolgen; Detailausgabe zeigt 01.01.2020 bzw. 01.01.2021 in Browser-Ortszeit. Screenshot .asset-cache/cmd-time-live.png; Testordner anschließend sichtbar in Papierkorb verschoben. Statistik-Logik ist mitveröffentlicht, Statistik-Menü weiterhin deaktiviert.

- Rechner-Modus-Commit 527cf07 geprüft und zentral als c9f12e4 integriert. Zusammen mit aktueller Statistik-Engine alle 14 Rechner-/UI-Tests lokal erfolgreich. Modus-Geometrie noch nicht zentral veröffentlicht/live abgenommen.


## Statistik-Bedienlogik und Rechner-Wiederherstellung – 4. November 2026

- [x] Statistikoperationen über Calculator.command verbunden: stat:add, stat:clear, stat:remove:index sowie alle Berechnungsoperationen. Ergebnisse erscheinen im normalen Eingabewert; Fehler gehen über den bestehenden Rechnerfehlerzustand, ohne Beobachtungen zu verlieren.
- [x] Gruppenformat, eingeblendeter Verlauf und Inv-Zustand Teil des Fenster-Snapshots. UI-Test speichert und öffnet den echten Modulzustand erneut, einschließlich Gruppierung und Verlaufshöhe.
- [x] Lokal alle 16 Rechner-/UI-Tests erfolgreich.
- [ ] Statistik-Ansicht mit Originaltasten/-Geometrie weiterhin in Arbeit; VM-Referenz beim Prüfer angefragt. Diese zusätzlichen Änderungen noch nicht veröffentlicht.


## Statistikmodus – 4. November 2026

- [x] Statistik über Ansicht/Alt+4 mit frischer VM-Referenz umgesetzt: 227 × 422, Datenliste/Anzahl, Originaltastenanordnung und sämtliche sechs Statistikberechnungen. Add/Enter, CAD, Auswahl/Entf und Snapshot-Wiederherstellung verbunden.
- [x] Lokal 17 Rechner-/UI-Tests erfolgreich. Browser: 4 und 8 aufnehmen, Mittelwert 6; einzelnes Löschen und Fokus nach Neuzeichnen tatsächlich geprüft. RESULTS-CALCULATOR-STATISTICS.md und Referenz-/Prüfbilder unter calculator-verification/.
- [ ] Zentrale Gesamtsuite/Veröffentlichung, vollständiger Pixelabgleich und die im Bericht genannten Originaldetails weiterhin offen. Gemeinsamer Größenwechsel-Überlauf im parallelen Frame-Paket des Prüfers in Bearbeitung.


## Gemeinsames Rechner-/Fensterpaket – 4. November 2026

- [x] Reflow-Commit 0697bf1 als d9090d4 geprüft/integritiert: nach Toolgrößenwechsel, Viewportänderung und Wiederherstellung Offscreen-Grenzen in den sichtbaren Arbeitsbereich bringen. Absichtlich freies Ziehen unverändert. Kleine Displays erhalten Scrollfallback für feste Tools mit sichtbarer Titelleiste.
- [x] Zusammen 39 gezielte Fenster-/Rechner-/Desktop-/Workspace-Tests erfolgreich. In echter Browseransicht Standard → Statistik geprüft: komplettes 227 × 422-Fenster automatisch über Taskleiste; kein manuelles Verschieben nötig. .asset-cache/calculator-statistics-reflow.png.
- [x] Statistikliste ergänzt Pfeile/Home/End mit erhaltenem Fokus; Enter öffnet fokussierte Menüleiste korrekt. Alle 18 Rechner-/UI-Tests erfolgreich.
- [ ] Linux-Gesamttest und produktive Abnahme dieses kombinierten Pakets folgen. Caption-/Aero-Originaltreue separat beim Prüfer offen, Arbeitsblätter und vollständiger Originalverlauf weiter offen.

- Kombiniertes Paket veröffentlicht: alle 225 Linux-Gesamttests erfolgreich, nativer Desktop aktualisiert, App-Container unverändert. Produktive Prüfung: Stats4/8→6, Werte nach Moduswechsel erhalten; wissenschaftlich sin(90°)=1, Programmierer-Bitpositionen korrekt sichtbar. .asset-cache/calculator-statistics-live.png. Weitere Originaldetails und ein bei Alt-Moduswechsel aus einer ersetzten Taste beobachteter Fokusverlust bleiben offen; keine vollständige Pixelgleichheit behauptet.


## Rechner-Fokuskorrektur – 4. November 2026

- [x] Alt-/Strg-Ansichtswechsel und Verlauf-/Zusatzansichtskürzel setzen nach Tastenfeld-Neuaufbau Fokus zurück auf Ergebnis. Inv ebenso. Programmierer-Zahlensystem-/Wortgrößenwechsel fokussieren das neu erzeugte, ausgewählte Radioelement; Alt-Moduswechsel funktioniert auch aus solchen Eingabeelementen.
- [x] Lokal alle 20 Rechner-/UI-Tests erfolgreich. Echter Browser: Klick auf Ziffer → Alt+2 → direkte Eingabe90; Inv → direkte Eingabe5 ohne erneuten Klick auf Anzeige. .asset-cache/calculator-focus-local.png.
- [ ] Noch nicht veröffentlicht; für das nächste zentral geprüfte UI-Paket vorgesehen. Weitere Rechner-/Windows-Aufgaben bleiben offen.


## Batch-/FOR-Pfadmodifikatoren – 4. November 2026

- [x] %~f/d/p/n/x/z/t für Batchparameter0–9 und normale/F-FOR-Variablen, kombinierte Pfadbestandteile wie dp/nx; %~0/%~nx0/%~dp0 beziehen sich auf die Skriptdatei, unabhängig vom aktuellen Arbeitsverzeichnis. SHIFT und fehlende Parameter geprüft.
- [x] Größen/Zeitwerte nur aus zugänglichen tatsächlichen Metadaten; bei fehlenden Werten leer. FOR-Variablen behalten ihre Groß-/Kleinschreibung, eingesetzte Werte werden nicht erneut als dieselbe FOR-Variable expandiert.
- [x] Lokal alle 26 CMD-/Transfer-Tests erfolgreich; Leerzeichen, echte Größen, Datumswert, normale/F-Schleifen und Prozentzeichen in eingesetzten Namen enthalten.
- [ ] PATH-Suche, DOS-Kurznamen/volle NTFS-Attribute, ursprüngliche Quote-Erhaltung für rohe Batchargumente, weitere cmd.exe-Expansionssonderfälle und exakte Fehlercodes offen. s/a-Modifikatoren werden ausdrücklich abgewiesen. Linux-Gesamttest/Veröffentlichung/Liveabnahme dieses Pakets folgen.
- Referenz: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/for


## Variablenmodifikatoren mit PATH-Suche – 4. November 2026

- [x] %~ sowie kombinierte Modifikatoren wie %~dp für FOR und Batchargumente. Suchpfade in definierter Reihenfolge, Variablennamen ohne Groß-/Kleinschreibungsunterschied, nur bekannte zugängliche Dateien, Verzeichnisse ausgeschlossen. Bei fehlendem/leeren ENV oder keinem Treffer leeres Ergebnis.
- [x] SETLOCAL/ENDLOCAL-Suchkontext und Dateinamen mit Leerzeichen automatisiert geprüft; lokal alle 27 CMD-/Transfer-Tests erfolgreich.
- [ ] Linux-Gesamtsuite, zentrale Veröffentlichung und produktive Batch-Abnahme folgen. Weitere Quote-/Expansions-/NTFS-/DOS-Sonderfälle gemäß Vorabschnitt bleiben offen.

- Fokus-/Variablenpaket auf Webdock veröffentlicht: alle 230 Linux-Gesamttests erfolgreich; Apps unverändert. Produktive Batch zeigt Script=Run.cmd, korrektes Skriptverzeichnis, Name=File One.txt, Bytes=3 und den richtigen LOOKUP-Treffer. .asset-cache/cmd-modifiers-live.png. Eigene Testdateien sichtbar wiederherstellbar aufgeräumt. Produktiver Rechner: Klick7 → Alt+2 → direkte Eingabe90 ohne neuen Mausklick, Ergebnis fokussiert; .asset-cache/calculator-focus-live.png.


## Binärvergleich und Undo-Regression – 4. November 2026

- [x] FC /B und automatische Binärwahl für exe/com/sys/obj/lib/bin verwenden unveränderte Bytes; Offset-/Hexdiagnostik, Längenunterschied und Rückgabewerte0/1/2. COMP mit Hex-/Dezimalbyteausgabe und Stopp nach zehn Abweichungen. Bekannte Profilpfade umgehen nativen Hostdispatch.
- [x] Bestehender Download mit serverseitiger Leserechteprüfung als Bytequelle verbunden; gestreamte Größenkontrolle/Abbruch, maximal32MiB je Datei und explizite Ausgabelimits statt stiller Kürzung. Vergleichsfehler und Unterschiede steuern IF/&&/|| über echte Ergebnisse.
- [x] Reproduzierten Undo-Fehler korrigiert: neue Belege Format2 ignorieren abgeleitete modified-Cachewerte, prüfen echte Dateigröße/mtime weiterhin. Format1 bleibt nach ursprünglicher Regel prüfbar und wird erst bei erfolgreich validiertem Replay umgestellt; ungültige alte Prüfsummen werden nicht blind migriert.
- [x] Lokal alle38 gezielten CMD-/Transfer-/Beleg-/Replay-Tests erfolgreich, einschließlich Invalid-UTF8-Bytes, Streamlimit, Abbruch, Legacybeleg und rekursivem XCOPY-Undo/Redo. Neuer Vergleichstest in regulärer Suite.
- [ ] FC-Textresynchronisierung und weitere Schalter, COMP-Zeilen-/Zeichenspezialfälle, Wildcard-Paare, interaktive COMP-Nachfragen, vollständige Größenunabhängigkeit und echte Diskettenabbilder bleiben offen. Unbekannte Vergleichsschalter abgewiesen. Linux-Gesamtsuite/Veröffentlichung/Liveabnahme dieses Pakets folgen.
- Referenzen: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/fc und https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/comp

- Binär-/Belegpaket veröffentlicht: alle236 Linux-Gesamttests erfolgreich. Live FC/B mit00 FF FE gegen00 FE FF zeigt Offsets1/2; IF unterscheidet DIFFERENT/SAME korrekt; COMP/D zeigt255/254. Anschließende Profilkopie nach Dateisystemabgleich per Explorer rückgängig und wiederholt; Host bestätigt wiederhergestellte Bytes00fffe. Screenshot .asset-cache/cmd-binary-live.png. Eigene Testdaten wiederherstellbar aufgeräumt. Weitere Vergleichs-/Originaldetails gemäß Abschnitt offen.


## Taskleisten-Präferenzbasis – 4. November 2026

- [x] Neues taskbar-state.js: Win7-Standardwerte, tolerantes Lesen, strikte partielle API-Eingaben sowie kantenabhängiger Arbeitsbereich. Unten/oben42px oder klein30; links/rechts62/klein42; AutoHide-Aktivierungsstreifen2px. Werte/Geometrie mit Prüfer abgestimmt, weitere VM-Maßabnahme ausstehend.
- [x] POST /api/desktop speichert taskbar mit vorhandener persönlicher/Share-Rechteprüfung; Teiländerungen erhalten übrige Optionen. Keine neuen Berechtigungen. Gespeicherte Werte, Trennung zweier Profile/Share, Fehlerablehnung ohne Zustandsänderung und Modulroute automatisch geprüft.
- [x] Minimaler optionaler Shell-Refresh-Hook configureTaskbar; reine Zustands-/API-/Assettests lokal alle5 erfolgreich. Tests in reguläre Suite aufgenommen.
- [ ] Sichtbares Layout, Gruppierung, automatisches Ausblenden, Sperr-/Verschiebelogik, Peek und Eigenschaftendialog werden mit dem getrennten UI-Paket des Prüfers verbunden; keine aktiven UI-Optionen als funktionierend behauptet. Noch nicht veröffentlicht.


## Aero-/Systemsteuerungs-Prioritätspaket – 4. November 2026

- [x] Prüfer-Commit1c140df als4c98a5f geprüft/integritiert: Caption-/Controlmaße, maximierte Kontur, Taskleisten-Zustandsgrafiken und führende Nullen im Datum; Systemsteuerung mit acht Originalkategorien/VM-Iconausschnitten, Anpassungsnavigation und sieben Aero-Designs. Paint-Erstöffnung passt vollständig oberhalbTaskleiste.
- [x] Erste kombinierte lokale Prüfung47Tests erfolgreich. Zwei Integrationsfälle ergänzt: unveränderte Presets ohne Phantomkachel, veränderte Sound-/Transparenz-/Intensitätswerte behalten Design-speichern-Pfad; reine Mixerlautstärke erzeugt kein anderes Design. Anonyme Hintergrundverknüpfung folgt der bisherigen Login-Sperre. Zugehörige zwölfUI/Modell/API-Tests erfolgreich.
- [x] Neue Systemsteuerungs-/Personalisierungstests in reguläre Suite aufgenommen. VM-/Browsernachweise und genaue Grenzen in RESULTS-SHELL-CONTROL-PANEL.md.
- [x] Alle248 Linux-Gesamttests bestanden und natives Desktop-Update erfolgreich. Live-Abnahme entdeckte fehlende Icon-Whitelist: Hotfix6d1ae98 mit HTTP-Prüfung aller10PNG-Dateien, 2/2 HTTP-/Migrationstests, erfolgreich aktualisiert. Alle acht Kategorie-Icons sowie Anpassungsansicht danach im produktiven Browser sichtbar geprüft. Nachweise .asset-cache/control-panel-native-live.png und .asset-cache/personalization-native-live.png. App-Container unverändert.
- [ ] Erweiterte Taskleistenoptionen/PropertySheet werden separat verbunden; keine pauschale1:1-Fertigmeldung und keine erfundenen Netzwerkzustände.


## Taskleisten-Interaktionsanbindung – 4. November 2026

- [x] Adapter591bdc1 in zentralem Shell-Commit a229b69 angeschlossen: AutoHide wartet bei Startmenü, Fokus und Flyouts; Peek bleibt reversibler visueller Zustand; entsperrtes Kanten-Docking speichert über bestehende Desktop-API. Arbeitsfläche berücksichtigt Kante und sekundäre Bildschirme.
- [x] Acht gezielte Adapter-/Modell-/HTTP-Tests erfolgreich; neues Modul als HTTP-Asset registriert und reguläre Suite erweitert.
- [ ] Gemeinsame Integration mit CSS, Gruppierung und Taskleisten-Eigenschaften des Prüfers, echte Browserprüfung der vier Kanten und Veröffentlichung bleiben offen. Dieses Folgepaket ist noch nicht produktiv.

## Arbeitsflächen-Reflow und CMD-Ausgabe – 4. November 2026

- [x] Taskleistenadapter meldet neue Arbeitsfläche erst nach gesetzter Surface-Geometrie; Shell ordnet Symbole danach erneut an. Identische Refreshes und reine Peek/Sperroptionen lösen keinen zusätzlichen Reflow aus. Kein rekursiver Resize-Dispatch. Elf gezielte Adapter-/Modell-/Desktoptests erfolgreich (913166c).
- [x] CMD-Ausgabe in Mikroaufgaben gebündelt: neue Textknoten statt wiederholtem Ersetzen des kompletten PRE, Scrollmessung höchstens einmal pro Animationsframe. Snapshot flushert ausstehende Ausgabe synchron; CLS, Wiederherstellung und Profilwechsel verwerfen alte Puffer. Test mit65.536 Zeilen prüft Vollständigkeit und genau einen DOM-Append; kein stilles Kürzen (bcc1118).
- [x] Acht Vergleichs-/Ausgabe-/HTTP-Tests und Syntaxprüfung von app.js erfolgreich. cmd-output.js über bestehende Assetroute verfügbar; Tests regulär registriert.
- [ ] Gemeinsame Browserabnahme und Linux-Veröffentlichung dieses Folgepakets stehen aus; produktiv bleibt der zuvor verifizierte Icon-Hotfix6d1ae98. Keine Behauptung vollständiger CMD- oder Taskleisten-Originaltreue.

- CMD-Ausgabe zusätzlich im echten Browser geprüft: 65.536 Zeilen, genau ein Textknoten und letzte Zeile0000ffff: FF FE sichtbar; CLS danach leer. Screenshot .asset-cache/cmd-output-browser.png. Der anschließende Wiederherstellungsversuch konnte wegen eines Browser-Beobachtungsfehlers nicht visuell abgenommen werden; Snapshot-/Restore-Automatiktests bestehen, produktive Gesamtprüfung bleibt ausstehend.

- Offene CMD-Snapshot-Browserabnahme nachgezogen:2.048 Zeilen erzeugt, CLS ausgeführt, Snapshot wiederhergestellt; DOM prüft exakt2.048 Zeilen und letzte Zeile000007ff: FF FE. Screenshot .asset-cache/cmd-output-restore-browser.png. Die größere65.536-Zeilen-Ausgabe bleibt separat belegt; für die Wiederherstellung wurde keine gleich große Browserabnahme behauptet. Linux-/Produktivabnahme weiterhin offen.

## FC-Textvergleich – 4. November 2026

- [x] Textvergleich zeigt abweichende Blöcke mit voriger Kontextzeile und erster wieder passender Zeile; Einfügungen verschieben nicht die komplette restliche Ausgabe. Standardpuffer100 und Synchronisation2; /LBn und /nnnn verändern diese Regeln. Pufferüberschreitung meldet fehlgeschlagene Resynchronisation und Status1.
- [x] /A verkürzt lange Blöcke, /N zeigt echte Zeilennummern, /C ignoriert Groß-/Kleinschreibung, /W fasst Rand-/Binnenleerraum zusammen, /T erhält Tabs statt Vergleich an8er-Tabstopps. /U liest unveränderte Dateibytes alsUTF-16LE. Vergleichsergebnisse0/1 und Fehler2 bleiben für IF/&&/|| erhalten.
- [x] Referenz: Microsoft-Learn-FC-Dokumentation plus lokale nativefc.exe-Beispiele für Einfügung, Änderung, kürzere Datei, EOF-Unterschied, Abkürzung und /LB1. Kein pauschaler Anspruch identischer Windows-7-Fehlertexte oder aller Resync-Tie-Breaks. Quelle:https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/fc
- [x]30 gezielte CMD-/Vergleichs-/Ausgabetests erfolgreich; Unicode, Tabstopp-/Whitespace-/Case-Regeln, Kontextblöcke, Pufferabbruch und echte Steuerfluss-Ergebnisse abgedeckt.
- [ ] Wildcard-Dateipaare, vollständige ANSI/OEM-Codepage-Regeln, Offline-Dateiattribut, Binär-Streaming jenseits32MiB und weitere native Grenzfälle bleiben offen. /OFF wird ohne echten Offline-Dateistatus akzeptiert; keine Funktion eines Offline-Dateisystems behauptet. Linux-Gesamtsuite und Veröffentlichung folgen.

## Gemeinsame Taskleisten-/CMD-Veröffentlichung – 4. November 2026, 20:05 MEZ

- [x] UI-Commit4842d33 alsb593841 übernommen, Modulroute/Testliste956135b; alle48 lokalen Integrationstests und anschließend alle266 Linux-Gesamttests erfolgreich (70,23s). Update des nativen Desktops abgeschlossen; systemd aktiv, Runtime-/Source-Modul und Backend identisch. App-Container nicht geändert.
- [x] Produktiv: Eigenschaften öffnen/Übernehmen/OK/erneutöffnen; links/rechts kleine Leiste42×720, oben/unten1280×30. Nie gruppieren zeigt separate Fensterschaltflächen, Immer gruppieren wieder gemeinsame. Echtes entsperrtes Ziehen unten→oben gespeichert und durch erneutes Öffnen bestätigt.
- [x] Produktiv AutoHide: untere42px-Leiste um40px verschoben, obere Kantey718bei720H; Surface718H, also2px Aktivierungsstreifen. Ursprüngliche admin-Werte anschließend vollständig wiederhergestellt und erneut geöffnet: unten42, lockedtrue, autoHidefalse, smallIconsfalse, combinealways, peektrue. Screenshots .asset-cache/taskbar-properties-live.png, taskbar-left-small-live.png und taskbar-restored-live.png.
- [x] FC/N live mit eigenen Downloads-Dateien: alpha/beta/gamma/delta gegen alpha/INSERT/beta/gamma/delta zeigt Kontextblock und Zeilen1/2gegen1/2/3, nachbeta wieder synchron. Screenshot .asset-cache/fc-text-live.png. Beide eigenen Testdateien anschließend einzeln per Explorer in Papierkorb verschoben; Abwesenheit im Downloads-Ordner bestätigt. Abgebrochene Host-mkdir-Vorschauen wurden nicht ausgeführt; ein falsch übertragenes Backslash-Testkommando erzeugte keine Testdateien.
- [x] Letzter CSS-Feinschliff074cd2c als1632d46 veröffentlicht, ohne Dienstneustart. Produktiver Browser zeigt einzeilige Startseitenverknüpfung sowie nachfolgende24px-Zeilenabstände (margin6plusheight18). Screenshot .asset-cache/personalization-sidebar-live.png. Versionsmarker1632d46-taskbar-cmd-266-tests-sidebar-live-verified.
- [ ] Vollständige1:1-UI-Abnahme weiterhin offen; bekannte Grenzen stehen in RESULTS-TASKBAR-PROPERTIES.md und UI-ABNAHME-RESTPUNKTE.md. Infobereich-Anpassung, Startmenü-Verlauf/Datenschutz, zusätzliche Symbolleisten, Original-DWM-Blur, volle Sprunglisten und weitere Designs/Controls sind nicht als fertig markiert. Weitergehende CMD-/Host-/Installer-Punkte der Gesamtliste bleiben erhalten.

## FC-Dateimuster – 4. November 2026

- [x] FC vergleicht alle passenden Quelldateien mit einem festen Ziel oder den positionsweise abgeleiteten Zielnamen. Maskenfeldregeln anhand nativemfc.exe geprüft:*.txt→*.bak,?.bak,b*.bak,*.?ak,*x.bak,*ohnePunkt,*.*ohneDateiendung und zu lange Präfixe/Fragezeichen. Keine rekursive Erweiterung in Unterverzeichnisse.
- [x] Pro tatsächlicher Quelldatei automatische Text-/Binärwahl; ein später identisches Paar überschreibt frühere Abweichungen nicht. Fehlende Ziele werden für das jeweilige Paar gemeldet und weitere Paare verarbeitet; Gesamtstatus0/1/2 steuert IF und&&/||. Kein neuer Zugriff außerhalb vorhandener lesbarer Profilknoten.
- [x]33 gezielte CMD-/Ausgabe-/Vergleichstests erfolgreich; darunter native Maskenzuordnung, mehrere Dateipaare, Zwischenfehler/Weiterlauf und gemischte .bin/.txt-Dateien. Quelle:https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/fc
- [ ] Linux-/Produktivabnahme dieses Folgepakets ausstehend. Vollständige DOS8.3-/?-Suchmasken, Wildcards in Ordnernamen, Offlineattribute, ANSI/OEM-Codepages und COMP-Interaktion/-Dateimuster bleiben gesondert offen. Keine vollständige FC/COMP-Deckung behauptet.

- Zusätzliche echte Steuerflussregression behoben: Fehler beim Schreiben einer Ausgabeumleitung und Parserfehler setzen ERRORLEVEL vor der Auswertung nachfolgender&&/||-Befehle. Vorher konnte ein fehlender Zielordner irrtümlich&&fortsetzen.34gezielte CMD-/Vergleichs-/Ausgabetests erfolgreich, einschließlich fehlgeschlagenem Gruppenredirect und ungültigem FOR-Schritt0. Produktivübernahme noch ausstehend.

## FC-Dateimuster und Dialog-Controls veröffentlicht – 4. November 2026, 20:15 MEZ

- [x] FC-Dateimuster efa901b nach269bestandenen Linux-Gesamttests ohne Dienstneustart ausgeliefert. Anschließend Fehlerstatus ada85dc plus UI-Controls f4b9b4c→a443b85 integriert;47kombinierte lokale Prüfungen und270Linux-Gesamttests erfolgreich (73,35s). Nur bestehende Browsermodule/CSS ausgetauscht, keine App-Container oder Dienste neu gestartet. Runtime-/Source-Versionen verglichen.
- [x] Produktiver FC/N-Maskenvergleich zweier eigener .txt/.bak-Paare: A identisch, B SAMEgegenCHANGED mitZeilennummern, IF ERRORLEVEL1ergibtDIFFERENT. Nachweis .asset-cache/fc-pairs-live.png.
- [x] Produktive Umleitungsregression: fehlender Zielordner ergibtZielordnernichtgefunden undRECOVERED im||Zweig; DOM bestätigt keinenMUST_NOT_RUN-Ausgabezweig. Keine Datei im fehlenden Ordner erstellt. Nachweis .asset-cache/cmd-redirection-live.png.
- [x] Taskleisten-Controls bewusst scopedCSS-Rekonstruktion, keine extrahierten Originalbitmaps behauptet. Produktiver Browser: Space schaltet Checkbox, Beschriftungsfokus1pxdotted, ArrowDown setzt Positionsentwurfleft und gepunktetenSelectfokus, disabledDatenschutzoptionen graurgb109. Cancel verwirft Entwurf; erneutes Öffnen zeigtlockedtrue/bottom/42px. Keine Präferenzänderung gespeichert. Nachweise .asset-cache/taskbar-controls-focus-live.png und taskbar-controls-disabled-live.png.
- [ ] Forced-Colors mit aktivem OS-Hochkontrast und gehaltenePressed-Aufnahme weiter offen; native aufgeklappte Selectmenüs/Schriftmetriken und vollständige Windows-7-Controltreue nicht abschließend abgenommen. COMP-Interaktion, vollständige DOS-Suchmasken und übrige Gesamtliste bleiben offen.

- Alle vier eigenen FC-Pair-20261104-A/B-Testdateien anschließend gemeinsam per Explorer in den Papierkorb verschoben; DOM bestätigt0verbleibende Treffer. Bestehende Nutzerdateien unberührt. Versionsmarker:a443b85-fc-masks-cmd-status-controls-270-tests-live-verified.

## COMP-Vergleichsschalter – 4. November 2026

- [x] /A zeigt abweichende Bytes als Zeichen, /L die Zeile stattOffset, /C vergleicht ASCII-Groß-/Kleinschreibung gleichwertig. /N=Zeilen begrenzt den Vergleich auf die erstenZeilen;0behält die Größenprüfung. Originalbytes bleiben unverändert, Hexwerte werden ohne unnötige führendeNull ausgegeben.
- [x] An nativemcomp.exe geprüft: Unterschied inZeile2mit/A/L, ignorierteASCII-Schreibweise, /N=1mit unterschiedlich langen zweitenZeilen, /N=2und Unterschiede vorLF, /N=0bei verschiedenen Größen sowie frühesEOFohnevollständigeZeile. Rückgabewerte bleiben inIF/&&/|| wirksam.
- [x]37gezielte CMD-/Vergleichs-/Ausgabetests bestanden. Keine neuen Routen/Abhängigkeiten.
- [ ] Vollständige interaktive Dateiabfrage/Weitere-Dateien-Schleife, COMP-Dateimuster/Ordnerparameter, exakte OEM-/ANSI-Locale und Nicht-ASCII-Caseregeln bleiben offen. Zeichenausgabe verwendet derzeitWindows-1252; keine pauschaleKonsolen-Codepagegleichheit behauptet. Linux-/Produktivprüfung dieses Pakets folgt.
- Referenz:https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/comp

- Zusätzlicher nativerCOMP-Abgleich: Bei/Azusammenmit/DgewinntZeichenausgabe unabhängig von der Schalterreihenfolge; zuvor angenommeneLast-wins-Regel korrigiert und gegen echteAusgabe getestet. Header, OFFSET-Darstellung, Größen-/Identischmeldung und Zehn-Unterschiede-Stopp an vorhandenes deutschescomp.exe angeglichen. InteraktiveWeitere-Dateien-Abfrage weiterhin ausdrücklich offen.

## COMP-Schalter veröffentlicht – 4. November 2026, 20:22 MEZ

- [x] Paketa15db90 mit273erfolgreichen Linux-Gesamttests veröffentlicht (70,08s). Anschließende native Format-/A/D-Vorrangkorrektur9e270c8mit37gezielten Linux-CMD-/Vergleichs-/Ausgabetests erfolgreich geprüft (1,13s) und separat ausgeliefert. Source-/Runtime-Modul identisch; kein Dienstneustart und keine Containeränderung.
- [x] Produktiver Browser:/A/LzeigtUnterschiedbeiZEILE2,Datei1=AundDatei2=a;/CergibtDateiensindidentischund&&CASESAME;/N=1ergibtDateiensindidentischund&&FIRSTLINESAME. DOM bestätigt beideMarkierungenalsAusgabezeilen. Nachweis .asset-cache/comp-switches-live.png.
- [ ] Interaktive fehlende Dateiparameter/Weitere-Dateien-Frage, COMP-Wildcards/Ordnerparameter, vollständige Codepage-/Locale-Gleichheit bleiben offen; bestehender nichtinteraktiver Vergleich ist keine vollständigeCOMP-Nachbildung. Weitere Haupt-TODO unverändert offen.

- Beide eigenen COMP-Live-20261104-Testdateien anschließend per Explorer in Papierkorb verschoben; DOM bestätigt0verbleibendeDateien. Versionsmarker9e270c8-comp-switches-273-suite-37-format-tests-live-verified.

## COMP-Dateipaare und interaktive Konsole – 4. November 2026

- [x] COMP erweitert Ordnerparameter zu den darin vorhandenen lesbaren Dateien, ordnet Zielnamen über Dateimuster zu und vergleicht unveränderte Bytes. Fehlende Paare setzen Fehlerstatus und blockieren weitere vorhandene Paare nicht. Bekannte Profilordner umgehen den nativen Hostdispatcher.
- [x] Inline-Texteingabe im CMD-Fenster ergänzt. COMP fragt fehlende Dateinamen ab, bietet WeitereDateien(J/N), übernimmt beiJneue Dateinamen und Option:-Eingaben bis zur leerenZeile. Leere neue Optionen erhalten vorige Schalter. UngültigeJ/N-Eingaben werden erneut abgefragt. Keine Browser-Promptbox.
- [x] Signalabbruch und Fensterschließen räumen die Eingabezeile auf und stellen das normale Formular wieder her; der nächste Befehl bleibt ausführbar. Das vorhandene Konsolenfontsystem bleibt durch vererbte Styles erhalten.
- [x] Nativecomp.exe-Referenz für Ordner/Masken, genaue deutsche Dateinamenfragen und Option:-Schleife unter begrenzter automatisierter Standardeingabe geprüft.44gezielte CMD-/Vergleichs-/Inline-Input-/HTTP-Prüfungen bestanden; weiterer Test für beibehaltene Optionen ergänzt.
- [ ] Linux-/Produktivabnahme dieses Pakets ausstehend. Laufende Frage samt noch unbestätigtem Eingabetext wird bei Sperren/Neustart noch nicht als fortsetzbare COMP-Sitzung gespeichert. Vollständige DOS8.3-/Locale-/Hostpfad-Gleichheit und alle Windows-Fehlertexte bleiben weiter offen.

## Interaktives COMP produktiv – 4. November 2026, 20:34 MEZ

- [x] da49c81 mit279bestandenen Linux-Gesamttests (70,46s) über natives Desktop-Update veröffentlicht; Backend-Source/Runtime verglichen, App-Container unverändert.
- [x] Live COMPohneParameter: erste/zweiteDatei inline eingegeben, /AbeiOption:undLeerzeile; A/aalsUnterschied. Jwiederholt Dateinamenfragen, neueOption/CundLeerzeile ergebenIdentisch, Nkehrt zumnormalenPromptzurück. ComputedEingabe-/Ausgabefontidentisch16px/18,4pxConsolas. Nachweise .asset-cache/comp-inline-question-live.png und comp-interactive-live.png.
- [x] Live eigeneDateimuster: zwei passendeQuelldateiengegenfesteZieldatei mit/Cidentisch; nachNfolgt&&PAIRS_SAME. DOM bestätigt genauzweiVergleiche. Nachweis .asset-cache/comp-pairs-interactive-live.png. Ordnerparameter über nativeReferenz und gezielteTestdaten belegt; kein Vergleich fremderDownloads-Dateien alsProduktivtest.
- [x] Fensterschließen währendoffenerFrage entferntInlineFormundbrichtmit^Cab; erneutesÖffnenundechoRESTOREDfunktionieren. Signalabbruch automatisch geprüft.
- [ ] Strg+C-Liveabnahme offen: automatisierte Browser-Tastaturpfade ließen die Frage aktiv; keine Browserfehler imCMD-Kontext erkennbar. Ursache/echteBenutzertaste gesondertprüfen, nichtalsbestätigtenTastaturabbruchausgeben. OffeneCOMP-Fragen/Eingabetext werden beiSperren/Neustart noch nicht fortsetzbar gespeichert.

- Beide eigenen COMP-Dialog-20261104-Dateien perExplorer inPapierkorb verschoben; DOM bestätigt0verbleibendeTreffer. KeineFrage mehraktiv. Markerda49c81-comp-interactive-279-tests-live-verified-control-c-open.

## Infobereich-Basis und lokale Browserabnahme – 4. November 2026

- [x] `4115747`: Präferenzmodell `notificationArea` mit den Standardwerten `clock: true`, `volume: show` und `alwaysShow: false`. Tolerantes Lesen und strikte Teiländerungen sind implementiert. Die bestehende Desktop-API und die Rechte für persönliche Profile und den Share bleiben erhalten. Zwei Profile, Share-Scope, Fehlerantworten und gespeicherte Daten sind geprüft. „Immer alle anzeigen“ hebt nur Overflow auf, niemals ein ausdrücklich deaktiviertes Symbol oder die ausgeschaltete Uhr.
- [x] `ac6e4e0`: Die vorhandene Lautstärketaste wird in den aufklappbaren Bereich verschoben, nicht dupliziert. Uhr und Lautstärkesymbol lassen sich ausblenden. Profilwechsel schließen den Bereich; Fokus, Escape, Positionierung an den Bildschirmkanten und Schutz vor automatischem Ausblenden sind angebunden. Eigene CSS- und Modulroute; keine Änderungen an globalem Aero oder Appearance.
- [x] Die isolierte Browserprüfung verwendet das bestehende `attachVolume`. Dabei wurde ein echter Fehler gefunden: Eine vorhandene `display: flex !important`-Regel hielt das Symbol sichtbar. `4675075` korrigiert die Priorität beim Verstecken und stellt die ursprüngliche Darstellung beim Einblenden wieder her. Der Browser bestätigt außerhalb des geöffneten Bereichs `display: none` und Breite 0. Im Bereich öffnet die vorhandene Taste den echten Lautstärke-Slider. Ein Klick ins Sound-Flyout schließt den Bereich nicht. Ausgeschaltete Uhr und Lautstärke bleiben auch bei „Immer alle anzeigen“ aus.
- [x] 16 gezielte Tests für Modell, API, Adapter, automatisches Ausblenden und Assetrouten bestanden. Browsernachweis: `.asset-cache/notification-area-overflow-local.png`. Keine produktiven Benutzerpräferenzen geändert.
- [ ] Noch nicht veröffentlicht: Der Infobereich-Dialog des Prüfers ist zugunsten der neuen Nutzerpriorität für Glas, Transparenz und Schatten zurückgestellt. `controlPanel.open('notification-area')` erst gemeinsam mit dem fertigen Dialog ausrollen. Für das Frame-Update nur dessen Aero-/Appearance-Dateien übertragen, nicht den gesamten lokalen Stand. Die genaue Platzverteilung im Tray und die vollständige Benachrichtigungssemantik bleiben offen.

## Aero-Glas: produktiver Restore-Vergleich – 4. November 2026, 20:55 MEZ

- [x] Isoliertes CSS-Paket `3aae2c2` als `7fcdd0a` integriert und mit 21 gezielten Tests geprüft. Anschließend nur `aero.css` in Quelle und nativer Runtime ausgetauscht; keine Container oder Dienste neu gestartet.
- [x] Produktiver A/B-Vergleich isoliert einen Darstellungsfehler: Mit neuer CSS bleibt die Systemsteuerung über einem maximierten IE sichtbar. Nach Wiederherstellen des IE mit fremdem Webseiten-Iframe und Aktivieren der Systemsteuerung wird deren Clientfläche weiß, obwohl die acht Kategorien im DOM vorhanden bleiben. Derselbe Ablauf mit der vorherigen CSS zeigt die Kategorien korrekt.
- [x] Deshalb vorherige CSS in Quelle und Runtime wiederhergestellt und Gleichheit bestätigt. Produktiv bleibt Backend `da49c81` mit 279 bestandenen Linux-Tests. Präziser Marker: `da49c81-279-tests-aero-glass-rolled-back-restore-render-regression`. Nachweis der funktionierenden alten Darstellung: `.asset-cache/aero-old-restore-cpl-live.png`.
- [ ] Neue Glasdarstellung ausdrücklich noch nicht abgenommen. Der Prüfer übernimmt den isolierten Material-/Compositing-Fix; danach denselben Restore-Ablauf erneut prüfen. Keine pauschale Repaint-Kaschierung oder parallele Veröffentlichung.

## CMD-Tastaturdiagnose – 4. November 2026

- [x] In einer eigenen Browser-Testseite erzeugt die automatisierte Kombination Strg+C nur ein `copy`-Ereignis, keine `keydown`-/`keyup`-Ereignisse. Strg+Enter erzeugt dagegen reguläre Tastaturereignisse. Der bisherige Automationsversuch ist deshalb kein Beweis für einen defekten CMD-Abbruchhandler.
- [x] `91e3e5e` extrahiert den vorhandenen Abbruchhandler in `handleCMDAbortKey`, ohne die Auslösebedingungen zu verändern. 44 gezielte Tests bestanden. Eine ausdrücklich synthetische Strg+C-Eingabe im Browser beendet die offene COMP-Frage, entfernt deren Formular und stellt die normale Eingabe wieder her. Nachweis: `.asset-cache/cmd-abort-handler-local.png`.
- [ ] Physische Strg+C-/Strg+Pause-Abnahme bleibt offen. Synthetischer Handlernachweis ersetzt sie nicht. Refaktorierung noch nicht produktiv; wegen ebenfalls unveröffentlichter Infobereich-Anbindung keine vollständige lokale Branch-Veröffentlichung vor deren gemeinsamer Abnahme.

## Dynamische Infobereich-Platzierung – 4. November 2026

- [x] Taskleistenadapter reserviert die gemessene Breite beziehungsweise Höhe des Infobereichs statt fester 136/112-Pixel-Werte. Ein ResizeObserver berücksichtigt geänderte Sichtbarkeit, Schrift-/Uhrbreite und Kantenwechsel; beim Beenden wird er entfernt. Kein zusätzlicher Reflow der Desktopsymbole ohne geänderte Arbeitsfläche.
- [x] Kapazitätsabhängige Gruppierung verwendet die echte innere Taskleistenlänge abzüglich des reservierten Platzes, Buttonabstände sowie kleine/vertikale Buttongrößen. Nach einer Tray-Größenänderung werden Gruppen ohne Änderung der Benutzerpräferenz neu berechnet.
- [x] 30 gezielte Tests bestanden. Echte Browsermessung mit vorhandener Lautstärketaste: Standard-Tray 139 px und Reservierung 143 px; Uhr und Lautstärke ausgeschaltet: Tray 20 px und Reservierung 24 px. Vorhandener Desktop-anzeigen-Bereich bleibt erreichbar.
- [ ] Noch nicht produktiv; gemeinsam mit dem Infobereich-Dialog veröffentlichen. Vollständige native Überlaufnavigation bei sehr vielen Fenstern und mehrspaltigen vertikalen Leisten bleibt offen.

- Aero-Nachprüfung 20:59 MEZ: Layer-Kandidat `7b10f56` → `30149b3` mit 22 gezielten Tests lokal integriert und separat live geprüft. Der erste Max→Restore→CPL-Wechsel zeigte Kategorien. Der zusätzliche Ablauf restaurierten IE minimieren → über Taskleiste öffnen → CPL aktivieren erzeugte erneut weißen Inhalt. Derselbe vollständige Ablauf mit alter CSS zeigt alle Kategorien. Kandidat deshalb ebenfalls zurückgenommen; alter CSS-Stand und Rollback-Marker bleiben produktiv. `.asset-cache/aero-layer-restore-cpl-live.png` belegt den FEHLER und darf nicht als erfolgreiche Abnahme verwendet werden. Nächster Vergleich: Schatten-/Backdrop-Layer statt weiterer Farbkalibrierung.

## Infobereich-Dialog integriert – 4. November 2026

- [x] Prüfer-Prototyp `2cb4cec` als `2254848` übernommen und fertig angebunden: Systemsteuerungseintrag „Infobereichsymbole“, `notification-area`-/`system-icons`-Routing, Taskleisten-Eigenschaften → Anpassen und Überlauf → Anpassen. Eigene öffentliche Modulroute registriert.
- [x] Systemseite für tatsächliche Uhr/Lautstärke, gemeinsame Entwürfe zwischen Seiten, Zurück, Suche zur Hauptsystemsteuerung, Standardwerte, OK/Abbrechen/Escape/Enter. Fehlgeschlagenes Speichern erhält Entwurf und sichtbaren Fehler. Vorheriger Überlaufmodus bleibt beim Aus-/Einschalten der Lautstärke im Entwurf erhalten.
- [x] Persistenz über bestehende Desktop-API mit persönlichem beziehungsweise administrativem Share-Scope. Dialog bindet Entwurf an Konto/Rolle/Share-Kontext; Refresh oder OK nach Kontextwechsel schließt ohne Speichern. Rechte der API bleiben maßgeblich.
- [x] 52 gezielte Dialog-/Modell-/API-/Tray-/Taskbar-/Fenster-/HTTP-Prüfungen bestanden. Browser: End ändert Auswahl, Abbrechen verwirft sie, erneutes Öffnen zeigt gespeicherten Modus. Überlauf → Anpassen öffnet echten Dialog. Systemseite speichert Uhr/Lautstärke aus; Browser bestätigt beide und Pfeil `display:none`, Reservierung24px. Eigene Fixture-Präferenzen, keine produktiven Benutzerwerte geändert. Bild `.asset-cache/notification-properties-system-local.png`; native Referenzen unter `frame-verification/notification-*.png`.
- [ ] Linux-Gesamtsuite, produktiver Routing-/Persistenztest und Veröffentlichung stehen aus. Nicht vorhandene Netzwerk-/Energie-/Wartungscenter-Symbole werden nicht als echte Telemetrie dargestellt. Volle Benachrichtigungssemantik und globale 1:1-Abnahme bleiben offen.

- Aero-Diagnose: `61d3a2e` → `2b3e96f` (alte Schatten-/Sättigungswerte mit neuer Glasfläche) ebenfalls live gescheitert und zurückgenommen. Kontrollablauf jetzt mit expliziter IE-Aktivierung und bestätigtem `hidden:true` beim Minimieren durchgeführt; alte CSS besteht diesen Ablauf. Frühere verdeckte Caption-Klicks sind kein Beleg eines tatsächlichen Minimierens. Kein Glasfix als fertig markiert.

## Infobereich produktiv veröffentlicht – 4. November 2026, 21:08 MEZ

- [x] `6870e59` samt Tray-/Platzreservierungsbasis selektiv übertragen; 299 Linux-Gesamttests bestanden (74,40 s). Natives Desktop-Update erfolgreich, Backend in Quelle/Runtime verglichen. App-Container unverändert. Die nicht abgenommene neue Aero-CSS wurde aus dem Paket ausgeschlossen; vorherige Runtime-CSS per Vergleich bestätigt.
- [x] Produktiver Einstieg über Systemsteuerungssuche und Taskleisten-Eigenschaften → Anpassen geprüft. Überlauf gespeichert, vorhandene Lautstärketaste dort angezeigt; Überlauf → Anpassen öffnet den Dialog erneut und zeigt den gespeicherten Wert.
- [x] Systemseite produktiv: Uhr und Lautstärke aus gespeichert; echte DOM-/CSS-Prüfung bestätigt Uhr, Sound und Überlaufpfeil `display:none`, Taskleistenreservierung24px. Danach ursprüngliche Werte wiederhergestellt und erneut geöffnet: Uhr ein, Lautstärke ein/show, alwaysShow=false. Keine Lautstärke oder Soundschema geändert.
- [x] Bildnachweise `.asset-cache/notification-overflow-live.png`, `.asset-cache/notification-properties-live.png`, `.asset-cache/notification-system-restored-live.png`. Marker `6870e59-notification-area-299-tests-live-verified-aero-previous`.
- [ ] Neue Glasdarstellung bleibt wegen reproduzierbarem weißen CPL-Inhalt offen. Max-Schatten-Spezifitätskandidat315b3a7 noch nicht produktiv getestet. Weitere Haupt-TODO inklusive Benachrichtigungssemantik, Startmenü, Host-/CMD-Vollständigkeit und gesamter Windows-7-Abnahme bleibt aktiv.

## Korrektur der Aero-Ursachenzuordnung – 4. November 2026, 21:10 MEZ

- [x] Max-Spezifitätskandidat `315b3a7` → `96c8b36` im Livebrowser geprüft: erster vollständiger Zyklus sichtbar, zweiter weiß. Anschließend vorherige CSS wiederhergestellt.
- [x] Danach identischer Kontrolllauf mit drei vollständigen Zyklen auf vorheriger CSS: jeweils Browser aktivieren, maximieren/wiederherstellen, wirklich minimieren (`hidden:true` bestätigt), öffnen, Systemsteuerung aktivieren. Erster Zyklus sichtbar, zweiter und dritter ebenfalls weiß. Nachweise `.asset-cache/aero-old-cycle-0.png`, `aero-old-cycle-1.png`, `aero-old-cycle-2.png`.
- [ ] Damit ist die bisherige alleinige Zuordnung zur neuen Glas-CSS widerlegt. Die früheren Einzelzyklus-A/B-Belege reichen dafür nicht aus. Allgemeiner wiederholungsabhängiger Renderingfehler bei überlappenden Fenstern mit Webseiten-Iframe bleibt offen. Alte CSS ist produktiv, aber nicht als dauerhaft fehlerfrei zu bezeichnen. Nächster gezielter Fix: Glasfilter auf separate Materialfläche statt gefiltertem Ancestor der opaken Clientinhalte.

- Glasflächen-Kandidat `cfbdfcc` → `24e6701` ebenfalls nicht abgenommen: live Hostdialog `backdrop-filter:none`, Pseudofläche `blur(14px) saturate(1.3)` bestätigt. In drei tatsächlichen Max/Restore/Min/Reopen-Zyklen bleibt nur der erste korrekt; zweiter/dritter weiß. Kandidat wieder zurückgenommen, produktive Infobereich-Version bleibt erhalten. 22 lokale Frame-/Appearance-/Screen-Tests bestanden, ohne Anspruch auf Renderingfehlerfreiheit. Nachweise `.asset-cache/aero-surface-cycle-0/1/2.png`. Nächster Diagnosevergleich deaktiviert ausschließlich für die Untersuchung sämtliche betroffenen Backdrop-Filter; kein endgültiger Verzicht auf Glasunschärfe beschlossen.

## Aufnahmeweg als mögliche Fehlerquelle – 4. November 2026, 21:16 MEZ

- [x] Diagnose `5f9fdb5` → `6e74c71`: live Frame, Material-Pseudofläche, Taskbar und Tray jeweils `backdrop-filter:none` bestätigt. Trotzdem ab zweiter Aufnahme weiß. Danach normale Aero-CSS wiederhergestellt; Abschalten der Filter ist keine Lösung.
- [x] Zusätzliche Kontrolle: Webseitenbrowser minimiert, stattdessen RDP-Verbindungsformular ohne sichtbares Webseiten-Iframe in drei vollständigen Zyklen bewegt. Erneut erste Aufnahme korrekt, folgende weiß. Damit ist auch eine ausschließliche OOPIF-Ursache nicht belegt.
- [x] Entscheidender Kontrollversuch: Systemsteuerung über Breadcrumb neu gerendert, dann ZWEI direkte `getScreenshot()`-Aufnahmen ohne weitere UI-Aktion. Erste enthält Kategorien, zweite weiß. DOM und Hit-Test bleiben korrekt. Der Aufnahme-/Prüfpfad muss unabhängig geprüft werden, bevor weitere Produktänderungen als Renderfix begründet werden können. Kein nachgewiesener Nutzer-Renderingfehler allein aufgrund dieser Aufnahmen behauptet.
- [x] Alle Diagnoseänderungen an `public/aero.css` auch im lokalen Produktstand auf die veröffentlichte vorherige Fassung zurückgesetzt. SHA256 lokal/Host: `cb097d2a6650244caaf1f524ac49695a1093a30ca04f85147bbcdcae1457c8e4`. Kandidaten und Nachweise bleiben in der Git-Historie. Infobereich-Version `6870e59`/299 Linux-Tests bleibt produktiv.
- [ ] Neue Materialkalibrierung und verlässliche visuelle Abnahme weiterhin offen. Keine pauschale Schlussfolgerung, ob Fehler im Browser, der Aufnahme oder der Anwendung liegt; unabhängiger Beobachtungsweg erforderlich.


## Aero-Abnahme korrigiert und ursprüngliches Paket veröffentlicht – 4. November 2026, 21:20 MEZ

- [x] Frühere Behauptungen weißer Clientinhalte sind durch Dateiprüfung widerlegt. Zwei direkte Aufnahmen sind bitidentisch; die Kategoriefläche aller alten und neuen Nachweise hat denselben Pixel-Hash `9210835773825595da32f6058f0da8bf9e38d51f26a41e3e881d027b372f858c`. Nicht nur DOM-Sichtbarkeit, sondern tatsächliche Bilddaten enthalten die vollständige Referenz.
- [x] Daher alle spekulativen Renderingänderungen verworfen. `public/aero.css` wieder exakt auf ursprünglichem Glas-/Schattenpaket `7fcdd0a`: weichere Reflexe, streifenfreie Taskleiste, abgestufte aktive/inaktive Schatten und tatsächlich schattenlose maximierte Fenster. Keine Pseudoflächen-/Filter-none-/Schatten-Rollback-Diagnostik produktiv.
- [x] Drei erneute echte Livezyklen des originalen Pakets, jeweils bestätigtes `hidden:true`, bestanden anhand gespeicherter Rohaufnahmen: Kategoriefläche in allen drei Fällen exakt gleich vollständiger Referenz. Beleg `frame-verification/aero-capture-integrity.json`. Maximiertes Browserfenster: shadow none, Caption23px; Taskbar ohne texture.png. IE wieder maximiert, RDP unminimiert, Original-Symbolpräferenzen erhalten.
- [x] 22 gezielte lokale Frame-/Appearance-/Screen-Tests bestanden. Vorhandene Backendversion6870e59 mit299 Linux-Gesamttests bleibt erhalten. Nur CSS Quelle/Runtime geändert, SHA256 `37f3d03f20b7f4ef1ff3caeef6257ce8fc3b0027f34f6a1c2452c88384047121`; keine Dienste oder App-Container verändert. Marker `6870e59-plus-aero-7fcdd0a-299-suite-22-frame-tests-live-verified`.
- [ ] Weitere native Material-/Schattenkalibrierung ist visuelle Verbesserung, kein belegter Renderingfix. Gesamte restliche Windows-7-TODO bleibt offen. Bei scheinbaren Folgeaufnahmefehlern künftig zuerst gespeicherte Rohdaten unabhängig vergleichen.

## Startmenü-Verlauf: Datenschutzgrundlage – 4. November 2026

- [x] Neues Modell `startMenu` mit getrennten Schaltern `recentPrograms` und `recentDocuments`. Bestehende Desktop-API validiert Teiländerungen streng; persönliche Optionen werden nicht im Share gespeichert.
- [x] Authentifizierte persönliche `/api/recent-items`-Schnittstelle. Begrenzte Programm-/Dateilisten, Häufigkeitszähler und letzte Öffnung; Dateinamen werden erst beim Lesen aus dem aktuellen zugänglichen Knoten ermittelt. Umbenennungen erscheinen aktuell, gelöschte oder nach Freigabewiderruf unzugängliche Dateien werden nicht ausgeliefert. Keine fremden Kontoverläufe, keine Share-Gasthistorie und keine vom Client übermittelten Dateinamen/Pfade.
- [x] Abschalten entfernt die entsprechende gespeicherte Liste in derselben serverseitigen Speicherung wie den Schalter. Weitere Ereignisse erzeugen sie nicht erneut; erneutes Einschalten stellt gelöschten Verlauf nicht wieder her. Persistierte Datenbank im Test geprüft.
- [x] Startmenü-Register der Taskleisten-Eigenschaften hat funktionale Datenschutzauswahl statt deaktivierter Platzhalter. Änderungen getrennt von Taskbar-Feldern speichern, Share deaktiviert, Entwurf bei Profilwechsel ohne Speicherung schließen. Noch nicht produktiv.
- [x] 17 gezielte Modell-/API-/Taskbar-/CPL-Tests bestanden, angrenzende Infobereich-/HTTP-Prüfungen ebenfalls erfolgreich. API-Test deckt private Fremddatei, Freigabe/Widerruf, aktuellen Namen, Kontotrennung, Rollenfilter, Löschen, ungültige Einstellungen ohne Datenverlust und gespeicherte Löschung ab. Ein Test wurde an die tatsächliche öffentliche Node-API angepasst: Profilpfad verwenden, statt ein nicht veröffentlichtes owner-Feld vorauszusetzen.
- [ ] Noch zu vervollständigen: echte erfolgreiche Programm-/Dateiöffnungen an diese Schnittstelle anbinden, persönliches Startmenü und Sprunglisten daraus aufbauen, Anheften/Entfernen sowie Tastaturführung umsetzen und gegen native Referenz prüfen. Danach gemeinsame Browser-/Linux-Abnahme und Veröffentlichung. Die jetzige Grundlage ist keine fertige Verlaufs-/Sprunglistenfunktion und wird nicht separat veröffentlicht.

### RDP-Folgeprüfung 2026-11-04

Computerauswahl jetzt tatsächlich mit Maus/Tastatur bedienbar, Leerzustand und Fokus geprüft; kein Verbindungsstart. Lokaler Kompaktentwurf bleibt420×260; sämtliche vier vorhandenen Register sowie Rückklappen/Max-Restore mit erhaltenen Feldwerten geprüft. Nach finaler Computerfeld-Marginkorrektur Input/Wrapper210×22, Pfeil18×20. Nachweise: .asset-cache/rdp-native-computer-history.png und rdp-computer-checks.json. Noch unveröffentlicht; unabhängige neue Mindestgrößen-/Tastaturmatrix und Gesamtvergleich bleiben offen.

### Aktueller Linux-Teststand22:26

Das aktuelle36-Dateien-Integrationspaket ist auf Webdock in /var/tmp/windows7-integrated-1c730c3/source vollständig durchgelaufen:332/332bestanden, keine Fehler/Skips,77,66s. Nur der isolierte Testbaum wurde geändert; produktive Quelle/Laufzeit weiterhin vorheriger Stand. Log linux-tests.log im genannten Verzeichnis; Paket-SHA96001e83dce5c7e8849272740c79efdaf85340389f8c34202f8bef87df154aaf. Dies schließt die Linux-Gesamttestlücke für genau dieses eingefrorene Paket, nicht Originaltreue-, Veröffentlichung- oder Liveprüfungen.

### Selektiv live22:29

Native aktive/inaktive Schatten, neutral inaktives transparentes Glas, schwarze inaktive Titelfarbe und Rechnerbreite228 sind als genau zwei statische Dateien veröffentlicht und produktiv nachgeprüft. Quelle/Laufzeit/öffentliche Antwort stimmen überein; Backup /var/tmp/native-frame-before-20261104.tar.gz, kein Neustart. Bericht RESULTS-NATIVE-FRAME-LIVE-20261104.md. Keine Veröffentlichung unfertiger Start-/Sprunglisten-/CPL-/Backend-Erweiterungen; neue RDP-Fassung und Himmel-Farbwert bleiben separat offen. Keine globale Originaltreue- oder Gesamtfertigmeldung.

### RDP live22:31

Kompaktentwurf1c730c3 nach unabhängiger Freeze-Funktionsprüfung separat veröffentlicht; genauJS/CSS, unveränderteHashes, Backup/var/tmp/rdp-native-before-1c730c3.tar.gz, keinRestart. Frischer eigenerLivetest420×260/Computer210×22/Form113×113, kompletter Servicehinweis, leereHistory+Escape, Optionen/Erweitert/Collapse erfolgreich. Rohbild.asset-cache/rdp-native-live-20261104.png. Neue unabhängigeLiveprüfung durchQM angefordert; keine vollständige mstsc-/Pixelidentität behauptet. GitHubveröffentlichung bleibt wegen deutlich ältererMain-Basis separat offen.

### Lokale Nacharbeit22:57

Snipping-Tool-Menüfehler gezielt korrigiert: vier Aufnahmearten im450×155-Fenster sichtbar und per Maus/Tastatur erreichbar, Randpositionierung und Fokus geprüft; zehn gezielte Tests bestanden. Commit7e09243, unabhängiger Abschlussbericht noch ausstehend, noch nicht live. Taskleisten-Gruppenpaket01f557f separat vom Sprunglisten-UI vorbereitet und mit drei Rechnerinstanzen geprüft; native echte Vorschaubilder/Peek und40px-Geometrie bleiben offen. Quelle/Hashes/Eigenbelege stehen in AUSTAUSCH; keine Gesamtfertigmeldung.

### Snipping-Menü live23:01

Popup-Clipping und fehlende Menü-Tastaturbedienung ausQM-SNIP001 separat veröffentlicht (7e09243, nurJS+Fokus-CSS), ohne Neustart. Frischer Produktivtest bestätigt vier sichtbare/hit-testbare Aufnahmearten im450×155-Fenster, erster Menüfokus, End und Tab zurück zu Optionen. Backup /var/tmp/snipping-popup-before-7e09243.tar.gz. Keine Aufnahme angefordert und keine Bild-/Lockzustandslogik geändert. Raw.asset-cache/snipping-popup-live.png; unabhängiger Live-Nachtest noch offen. Github-Branch muss dieses Zusatzpaket nach dem eingefrorenen Basisupload separat erhalten.

### Taskleistengruppen live23:12

Paketb51ca66 nach eigenem und unabhängigem Freeze-Nachtest separat veröffentlicht: sichtbare Stapelkante und korrekte Zählung für mehrere angeheftete/nicht angeheftete Instanzen, Übergabe beim Minimieren und einzelne Schließung. Frischer Produktivtest mit drei Rechnerfenstern sowie aktivem Snipping Tool bestätigt3→2 und weiter inaktive laufende Gruppe. Keine Pins im Produktivprofil verändert. Backup /var/tmp/taskbar-group-before-b51ca66.tar.gz, kein Neustart. Raw.asset-cache/taskbar-groups-live.png. Echte Miniaturvorschauen/Peek,40px-Geometrie und übrige Taskleisten-Nativeabnahme bleiben offen.

### Mailstatus live23:24

Geprüfter Stand68011324877A45608C21EC6A57724F8E8304C9E35AF73C387B8AD4B6BEB587CA separat als einzige Datei veröffentlicht. Quelle/Laufzeit/öffentliche Antwort stimmen überein, Dienst aktiv, kein Neustart. Backup /var/tmp/mail-status-before-680113.tar.gz. Eigener frischer Live-Test: Online → Kalender – Lokal → Online sowie Offline → Kalender – Lokal → Offline; anschließend wieder online gestellt und eigenes Testfenster geschlossen. Keine Nachricht geöffnet/versandt oder Kalenderdaten geändert. Screenshot .asset-cache/mail-status-live-680113.png. Verzögerte Sync-Race zusätzlich unabhängig im isolierten Fixture geprüft; keine künstliche Verzögerung im Produktivsystem. GitHub-Zusatzpaket noch ausstehend.

### Original-Mailicons live23:30

Nur die zwei Konten-Ribbon-Zuordnungen und zwei unveränderte Original-PNGs veröffentlicht: live-mail.js B650305E13FB57914A417568BB7AAF0D9F116F7A7E2F77412D2EA8C07981656F; account-add-original.png E40CB06B3A81348DAF8F21401DBF44FB8673D9C3E12EDF304217AEF7401CF489; account-properties-original.png 268740AB13A61B6916F3B81DCA05A0BC4BA129C49BE27698F6B77BFF86E78BDE. Unabhängige Originalbyte-/Ribbonprüfung bestanden. Eigener frischer Produktivtab bestätigt alle drei geladenen32pxRibbonbilder, Konten-Symbol unverändert; Screenshot .asset-cache/mail-original-icons-live.png enthält nur Ribbon, keine Postfachinhalte. Testfenster geschlossen. Backup /var/tmp/mail-icons-before-b650305e.tar.gz, kein Restart. Bestehender unschöner Zeilenumbruch von Eigenschaften und28pxDarstellungsgröße bleiben gesonderte Originaltreue-Restpunkte.

### System-/Netzwerkseiten live23:34

Abgenommener reproduzierbarer Zweidateienbuild separat veröffentlicht: control-panel.js d440be865f2c0be5a684f60cac2b025f75ac4872c0bdefd5cb37ae78f5691a3b; CSS2479733964836765fe7e49c42eedc616b518f82abbf3228a5b5ca7dc24d83f34. Quellen/Build unter scripts/cpl-release, Originalassets als unveränderte DatenURLs. Quelle/Laufzeit gleich, Backup /var/tmp/cpl-before-d440be86.tar.gz, Dienst aktiv, kein Neustart/keine neue Backendroute. Unabhängige isolierte Kontext-/Request-/Close-Races bestanden; eigener frischer Produktivdesktop bestätigt Kategorien, echte Hostgrunddaten, Originalgrafik157px, Padding0/kein horizontaler Überhang,19Hostschnittstellenzeilen, Home/Suche/Schließen. Screenshots .asset-cache/cpl-system-live-d440be86.png und cpl-network-live-d440be86.png. Unabhängiger Produktivnachtest angefragt. Nicht verfügbare Betriebssystemcontroller bleiben deaktiviert; keine vollständige Systemsteuerungs- oder native Pixelabnahme. Release-Kandidat301Tests/300pass/1Plattformskip/0fail.

### Unabhängiger CPL-Produktivnachtest

QM-CPL-002 bestätigt öffentliche HTTP200/Hashgleichheit d440be…/247973…, integrierte Systemseite mit Originalkugel, Home-Rückkehr, Netzwerksuche/Ansicht und explizit unbekannte Windows-Netzwerke/deaktivierte fehlende Aufgaben. KeineHost-/Profiländerungen, eigeneFenster/Tabgeschlossen. Nachweis frame-verification/qm-cpl-production-retest-2026-11-04.json. Enger Liveumfang bestanden; gesamte Windows-7-ToDo weiterhin offen.

## Veröffentlichungsrunde 5. November 2026
Tatsächlich live: Tray-Randwechsel B198; profilgebundener Start-/Dokumentverlauf mit Backend-Raceguards; normale horizontale40px-Taskleiste E259/Aero37CF samt CP-Arbeitsbereich; Himmelstandard0CAD; CP-Kategorien163735/da7e; Editor-PickerFE1DD, Gruppenfokus1F254, StartsuchkeyboardDEA21. Quell-/Runtime-/öffentlicheHashchecks bestätigt. Unabhängige40px-Vierkantenabnahme abgeschlossen und Prefs restauriert, Suchkeyboard-Livenachtest bestanden. Übrige engeConsumer-Livegates separat dokumentieren. Lokaler finalerBaum339Tests/338pass/1Plattformskip/0Fehler. GitHubWebsitebranchcodex/releases-20261105 ist gesichert; RuntimeCOPYfehler recent-items.mjs korrigiert, neueCI/Mainübernahme noch offen. Kein vollständigerWindows7-Abschluss. Weiter offen: PreviewLifecycle-StaleRows, echteMiniaturen/Peek, nativePixelabnahmen und alle übrigen Hauptlistenpunkte.
