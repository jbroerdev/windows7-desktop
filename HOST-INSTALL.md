# Desktop direkt auf dem Linux-Host

Der Desktop läuft als `windows7-desktop.service` unter einem eigenen Dienstkonto. Die Apps bleiben in Docker. Ein kleiner interner Container `windows7-host-relay` erhält die bisherige Adresse `http://explorer:3000` für Browser-Downloads und Office-Rückrufe. Der Desktop erreicht die App-Container über vom Host-Agent aktualisierte interne DNS-Aliase. App-Ports werden dadurch nicht zusätzlich öffentlich freigegeben.

## Bestehende Installation umstellen

Voraussetzungen: Linux mit systemd, Python 3 und Docker Engine; konfigurierte Desktop-/App-Container, passende CPU-Architektur und ausreichend freier Plattenplatz für den Export der Desktop-Laufzeit. Die Node-Laufzeit wird aus dem vorhandenen offiziellen Node-basierten Desktop-Image übernommen. Unter Debian/Ubuntu installiert das Skript fehlendes FFmpeg aus den Paketquellen. Auf anderen Distributionen muss FFmpeg bereits installiert sein. Windows-/BSD-Server und Linux ohne systemd sind nicht unterstützt.

Aus dem entpackten Projektverzeichnis:

```sh
sudo bash install.sh --from-container windows7-desktop-explorer-1
```

Optional: `--install-root /opt/windows7-host --port 3000 --bind 0.0.0.0`. Der Datenordner wird aus dem bestehenden Docker-Mount übernommen. Profile, Passwörter, Kalender und App-Volumes bleiben erhalten. Container-Konfiguration inklusive Zugangsdaten wird nur unter `/etc/windows7-desktop` mit Root-Leserechten gespeichert. Der alte Desktop-Container bleibt gestoppt als Rückweg erhalten und bekommt `restart=no`; die App-Container laufen weiter.

Die derzeitige Docker-Rückrufbrücke benötigt einen auf `0.0.0.0` gebundenen Desktop-Port. Den direkten externen Zugriff gegebenenfalls über die Host-Firewall auf den Reverse-Proxy beschränken. Ein ausschließlich an Loopback gebundener Desktop mit separatem Callback-Socket ist noch offen.

## Neuer Server

Docker Engine vorher entsprechend der Distribution installieren. Dann im Projektverzeichnis:

```sh
sudo bash install.sh --fresh
```

Das Skript verwendet `windows7-desktop:local`, baut es bei Bedarf aus diesem Projekt und installiert den Desktop nativ. `WINDOWS7_IMAGE` wählt ein vorhandenes kompatibles Image, `WINDOWS7_DATA` den Datenordner. Mit `WINDOWS7_ENV_FILE` kann eine vorbereitete Konfiguration für bereits eingerichtete Docker-Apps übergeben werden. Ohne App-Stack wird zunächst nur der Desktop installiert; Mail-/Discord-/Spotify-Zugangsdaten und externe Konten müssen separat eingerichtet werden. Es werden keine fremden Logins oder ROMs mitgeliefert.

Das erste Administratorkonto lokal im SSH-Terminal anlegen:

```sh
sudo /opt/windows7-host/runtime/node /opt/windows7-host/app/scripts/setup-admin.mjs
```

Den vorhandenen HTTPS-Reverse-Proxy auf den konfigurierten Desktop-Port richten. Auf einem neuen Server werden weder DNS noch Zertifikate automatisch für eine unbekannte Domain angelegt.

## Betrieb, Update und Rückweg

```sh
sudo systemctl status windows7-desktop windows7-host-agent windows7-host-monitor
sudo journalctl -u windows7-desktop -n 50 --no-pager
sudo bash scripts/update-host.sh
sudo bash scripts/rollback-host.sh
```

Das Update-Skript aktualisiert Anwendungscode bei unveränderten Node-Abhängigkeiten und legt vorher ein Code-Backup an. Für geänderte `package.json`-/Lockfile-Abhängigkeiten muss eine neue kompatible Desktop-Laufzeit gebaut und geprüft werden. App-Container werden weiterhin über Compose aktualisiert. **Nicht den alten `explorer`-Container zusätzlich starten**: Er und der Host-Dienst würden denselben Port und dieselbe Datenbank gleichzeitig verwenden.

## Echte Host-CMD und Rollen

`/api/host-command` prüft die angemeldete Serversitzung. Die vom Client übermittelte Rolle wird nicht übernommen. Share-/Gast-Sitzungen dürfen die Schnittstelle nicht verwenden. Der Host-Agent hört ausschließlich auf einem Unix-Socket; dieser ist nur für Root und das Desktop-Dienstkonto zugänglich.

Normale Benutzer erhalten begrenzte Host-Diagnosebefehle. Ihre Dateioperationen bleiben an die Profilrechte des Explorers gebunden. Administratoren können Host-Dateibefehle und native Linux-Programme ausführen. Änderungen zeigen zunächst den konkreten Linux-Aufruf zur Bestätigung. Ausführung erfolgt als Argumentliste ohne automatische Shell-Interpolation. Die CMD verwendet profilgebundene Host-Sitzungen mit laufender Ausgabe: 30 Sekunden für Benutzerdiagnosen, bis zu einer Stunde für Administratoren, jeweils höchstens 1 MB Ausgabe. Vier Sitzungen dürfen gleichzeitig laufen, davon höchstens zwei je Profil. Der ältere `/api/host-command`-Aufruf bleibt auf 30 Sekunden begrenzt. Voll interaktive Programme mit Standardeingabe/PTY und vollständige Windows-Batchkompatibilität sind noch nicht abgedeckt; dafür bleibt der SSH-Zugang erhalten.

Beispiele:

```text
hostname
systeminfo
tasklist
dir C:\etc
type C:\etc\os-release
systemctl status ssh --no-pager
systemctl restart Beispiel.service
```

`C:\etc` entspricht `/etc` des Linux-Hosts. Nach dem ersten Host-Verzeichniswechsel zeigt die CMD den tatsächlichen Pfad mit Windows-Trennzeichen. Linux-Werkzeuge müssen installiert sein. Nicht sinnvoll abbildbare Windows-Befehle wie `format`, `reg` oder `runas` liefern eine klare Meldung statt erfundener Ergebnisse. Der vollständige Ausbauplan steht in `WINDOWS7-TODO.md`.

### Host-Sitzungen fortsetzen und abbrechen

Die authentifizierten POST-Endpunkte `/api/host-terminal/start`, `/poll` und `/cancel` greifen ausschließlich über den privaten Unix-Socket auf den Host-Agent zu. Besitzer und Administratorstatus stammen aus der aktuellen Serversitzung. Andere Profile erhalten keine Ausgabe und können keine fremden Sitzungen abbrechen; der Entzug der Administratorrolle sperrt die Ausgabe zuvor privilegiert gestarteter Sitzungen.

Die CMD zeigt neue Ausgabe fortlaufend. Strg+C bzw. Strg+Pause und das Schließen des CMD-Fensters fordern die Beendigung der Prozessgruppe an. Der Linux-Prozessabbruch und das Fensterschließen sind geprüft; die direkte Tastenkombination benötigt noch die Abnahme in einem normalen Browser, weil die eingebettete Browsersteuerung sie selbst abfängt.

Beim Neuladen verbindet sich die CMD wieder mit ihrer Host-Sitzung. Im Browser werden nur Sitzungskennung und Arbeitsverzeichnis unter einem Profil-Schlüssel gespeichert, keine Befehlsausgabe. Beim Sperren enthält der reguläre Arbeitsstand zusätzlich den Ausgabecursor. Abgeschlossene Sitzungen bleiben höchstens 15 Minuten ohne Abruf erhalten, insgesamt höchstens 32 Sitzungen. Ein Neustart des Host-Agent beendet laufende Jobs und verwirft diese Ausgabe; das ist noch keine dauerhafte Terminalverwaltung. Verschachtelte Batch-/Pipelinezustände werden dabei noch nicht vollständig wiederhergestellt.

### Host-Dateien im Explorer

Administratoren finden das echte Host-Dateisystem unter **Netzwerk → Hostsystem**. Die Oberfläche verwendet dieselben Explorer-, Editor- und Eigenschaftskomponenten. Gäste, Share-Sitzungen und normale Nutzer erhalten über `/api/host-files/` keinen Zugriff; ihre bisherigen Profilrechte bleiben bestehen. Der private Agent benötigt dafür zusätzlich `host_files.py`; Installation und Update kopieren das Modul mit und sichern es für einen fehlgeschlagenen Update-Versuch.

Unterstützt sind Ordnernavigation, Textdateien lesen/speichern, Ordner erstellen, Umbenennen ohne Überschreiben, Downloads und ein eigener Host-Papierkorb. Änderungen zeigen den konkreten Zielpfad. Ein Versionsvergleich verhindert das Überschreiben zwischenzeitlich geänderter Dateien. Vor dem Speichern entsteht eine Sicherung; Eigentümer und Modus bleiben erhalten. Die angezeigten UID/GID und Linux-Rechte sind echte Host-Daten.

Das Journal liegt rootprivat unter `/var/lib/windows7-host-files`. Bei Dateien auf einem anderen eingehängten Dateisystem liegt der Inhalt im rootprivaten Verzeichnis `.windows7-host-trash-0` auf diesem Datenträger; das Journal verweist darauf. So erfolgt Löschen als Umbenennen auf demselben Dateisystem. Beide Bereiche sind über die Dateiansicht gegen versehentliche Änderung geschützt. Alte Sicherungen mit zentral abgelegtem Inhalt können ebenfalls wiederhergestellt werden. Ein vorhandenes Wiederherstellungsziel wird nicht überschrieben; fehlende ursprüngliche Elternordner müssen derzeit zuerst wiederhergestellt werden.

Textdateien sind auf 2 MB begrenzt (UTF-8 bzw. UTF-16 LE, BOM bleibt erhalten). Verzeichnisse werden bis 5.000 Einträge angezeigt. Downloads laufen in 256-KB-Blöcken mit Versionsprüfung, als Anhang und ohne öffentliches Caching. Geräte/FIFOs werden nicht geöffnet; Änderungen an Kernelpfaden und das Verschieben wesentlicher Systemwurzelordner werden abgewiesen. Frei konfigurierbare Host-ACLs, Host-Uploads, neue Textdateien und Übertragungen zwischen Host und Profil sind noch offen. Die vollständige Liste steht in `WINDOWS7-TODO.md`.

### Host-Uploads

Der Host-Explorer unterstützt Datei-Uploads und neue Textdateien. Namenskonflikte bieten Ersetzen, Überspringen oder Beide behalten; zusätzlich wird die konkrete Host-Änderung bestätigt. Der private Agent schreibt zunächst in eine ausgeblendete Datei auf dem Zieldatenträger. Erst nach vollständiger Größen- und SHA-256-Prüfung wird sie atomisch veröffentlicht. Ein vorhandenes Ziel wird versionsgeprüft und vor dem Ersetzen im privaten Host-Papierkorb gesichert; Besitzer und Dateimodus bleiben erhalten. Neue Dateien erhalten zunächst Modus 0600.

`host_uploads.py` wird neben `host_files.py` installiert und beim Update gesichert. Uploads gehören zur authentifizierten Profil-ID: maximal vier insgesamt und zwei pro Profil. Abbruch entfernt nur die jeweilige unvollständige Übertragung; bereits veröffentlichte Dateien bleiben erhalten. Nach 30 Minuten ohne Aktivität räumt der Agent temporäre Uploads auf. Das private Journal ermöglicht Aufräumen bei einem Agent-Neustart und bewahrt bei unterbrochenem Ersetzen das Original. Es gibt keine Wiederaufnahme teilweise hochgeladener Daten nach einem Neustart. Rekursive Übertragungen sind unten beschrieben; vollständiges Undo/Redo bleibt offen.

Prüfung am 4. November 2026: 162 Node-Tests, 23 Linux-Tests (davon neun Upload-Tests), live zusätzlich Beide behalten, Ersetzen samt Prüfung des gesicherten Originalinhalts und neue leere Textdatei.

### Kopieren und Verschieben zwischen Host und Profil

Administratoren können reguläre Dateien per Ausschneiden/Kopieren und Einfügen zwischen Host-Explorer und Profil sowie zwischen Host-Ordnern übertragen. `/api/host-transfer` akzeptiert Explorer-IDs; physische Profilpfade und Dateibesitzer werden serverseitig aufgelöst. Die bisherigen Profil-Schreibrechte gelten auch für Administratoren. Quelle, Zielversion, Sitzung und Rollen-/Profilrechte werden vor und während der Übertragung geprüft. Daten laufen in 256-KB-Blöcken über den privaten Host-Agent; Fortschritt wird als NDJSON ausgegeben. Die Veröffentlichung verwendet denselben Upload-Journal-, Prüfsummen- und Sicherungsweg wie Host-Uploads.

Beim Verschieben wird die Quelle erst nach vollständig veröffentlichter Kopie in den passenden Profil- oder Host-Papierkorb gelegt. Misslingt der letzte Schritt, nennt die Fehlermeldung die bereits vollständig kopierte Zieldatei; eine geänderte Quelle bleibt erhalten. Neue Profil-Dateien erhalten Besitzer/Gruppe des Profil-Zielordners und Modus 0600. Symbolische Links bleiben in diesem Übertragungsweg ausgeschlossen; rekursive reguläre Dateibäume sind unten beschrieben. Ein Agent-/Desktop-Neustart setzt laufende Transfers nicht fort; bisherige vollständige Dateien und Original-Sicherungen bleiben erhalten.

Live am 4. November 2026: 1-MB-Binärdatei vom Host ins Profil bytegleich, Profil-Dateibesitzer UID/GID 982 geprüft; zurück auf den Host verschoben und Profil-Original im Papierkorb bytegleich geprüft; Host→Host-Verschieben mit Beide behalten und erst anschließend entfernter Quelle geprüft. 170 Node-Tests und 24 Linux-Tests erfolgreich. Ordnerzusammenführung ist im folgenden Ausbau ergänzt; vollständiges Undo/Redo und Abnahme auf externen Datenträgern bleiben offen.

### Rekursive Ordnerübertragungen

Der gemeinsame Host-Transfer unterstützt reguläre Dateibäume mit Unterordnern und leeren Ordnern. Bestehende Zielordner werden zusammengeführt; Namenskonflikte einzelner Dateien werden vor Beginn entschieden. Ein Quellbaum-Fingerabdruck erkennt Änderungen zwischen Vorbereitung und Bestätigung. Dateien werden weiterhin einzeln mit Prüfsumme, Versionsprüfung und atomischer Veröffentlichung übertragen. Beim Verschieben wird jede fertige Quelle wiederherstellbar entfernt; übersprungene oder noch nicht fertig übertragene Dateien bleiben erhalten. Anschließend werden ausschließlich leere Quellordner in den jeweiligen Papierkorb gelegt.

Profil-Zielpfade werden aus Datenbank-IDs aufgelöst; die Rollen-/Profilrechte und Office-Sperren für enthaltene Einträge werden geprüft. Neue Profil-Ordner und Dateien erhalten den Linux-Besitzer des Zielprofils. Ein Ziel innerhalb der Quelle wird auch anhand aufgelöster Pfade abgefangen. Grenzen: 10.000 Einträge / 128 Ebenen, weiterhin 5.000 Einträge pro einzelner Host-Ordnerliste. Symlinks, Spezialdateien und die Serialisierung von Desktop-Verknüpfungen werden ausdrücklich abgelehnt. Mehrere Quelleinträge mit demselben Zielnamen müssen vorher umbenannt werden. Rückgängigmachen einer kompletten Übertragung, reine Profil-Konfliktabläufe und externe Datenträger sind noch nicht vollständig abgenommen.

Prüfstand: 178 Node-Tests auf Linux, 25 Python-Tests und sichtbare Ordnerzusammenführung mit innere-Datei-Konflikt, Beide behalten, Erhalt fremder Zieleinträge und leerem Ordner. Der Browser-Docker-Dienst enthält außerdem den im Gesamttest gefundenen Download-Aufräumfix mit persistentem Übergabebeleg.

### Konflikte bei reinen Profil-Transfers

Der Explorer verwendet für persönliche und freigegebene Profil-Dateien `/api/profile-transfer` mit den bisherigen Lese-/Schreibrechten. Host-Rechte werden dafür nicht vergeben. Der Server erfasst die Quelle, prüft Versionen, bereitet den Zielbaum ohne physische Ordner anzulegen und lässt Konflikte über den gemeinsamen Windows-7-Dialog entscheiden. Neue Ziele werden ohne Überschreiben veröffentlicht; beim Ersetzen wird zuvor eine wiederherstellbare Kopie im Papierkorb des handelnden Benutzers gespeichert. Sicherungseinträge besitzen eigene Datei-IDs, damit eine spätere Wiederherstellung keine doppelten IDs erzeugt. Bei fehlendem ursprünglichem Zugriff kann eine Sicherung in die eigenen Dokumente wiederhergestellt werden.

Die temporären Dateien liegen auf dem Zieldatenträger und werden vom Explorer-Scan ausgeblendet. Ein privates Journal unter `DATA_DIR/profile-transfers` erkennt nach einem Desktop-Neustart anhand Dateidentität, Größe und SHA-256, ob eine Datei bereits veröffentlicht war, und vervollständigt dann ihre Metadaten. Eine laufende Byteübertragung wird nach Neustart nicht fortgesetzt. Bei verändertem Ziel werden alte Journalangaben nicht blind übernommen. Während der Übertragung sind beteiligte Dateien und das Umbenennen/Verschieben/Löschen ihrer Elternordner über die normalen Datei-APIs gesperrt; andere Dateien bleiben bedienbar.

Reguläre Dateien, Unterordner, leere Ordner und Profil-Webverknüpfungen werden unterstützt. Öffentlich lesbare Verknüpfungen kopieren keine fremden Anmeldedaten in ein neues eigenes Profil. Bestehende CMD-/Legacy-API-Aufrufe behalten ihre bisherigen Schalter und werden getrennt vervollständigt. Vollständiges Undo/Redo und die Serialisierung von Verknüpfungen beim Host-Transfer sind weiterhin offen.

Prüfung: 184 Node-Tests auf Ubuntu erfolgreich; anschließend gezielte Endprüfungen. Live Ordnerzusammenführung, Ersetzen mit Original-Sicherung, Beide behalten und Überspringen geprüft. Die Apps bleiben Docker, der Desktop läuft weiterhin nativ.

### Datei-Verlauf

`file-history.mjs` verwaltet zunächst Profil-Umbenennungen. Der Verlauf liegt in der bestehenden geschützten Datenbank, getrennt nach Benutzer und persönlicher/Share-Bearbeitung, begrenzt auf 50 Befehle. `/api/session` liefert ausschließlich die beiden aktuellen Menüeinträge; `/api/file-history` nimmt POST mit Richtung und aktuellem Befehlstoken entgegen. Jede Ausführung prüft aktuelle Dateirechte und Sperren. Dateisystem-Identität verhindert das Umbenennen einer extern ersetzten Datei anhand eines alten Befehls. Ein Datenbank-Schreibfehler führt zum Versuch, die physische Umbenennung zurückzunehmen. Ein gemeinsames absturzsicheres Befehlsjournal und Verlauf für die weiteren Dateiaktionen bleiben offen.

Der Verlauf umfasst außerdem Profil-Löschen und manuelles Wiederherstellen. Die physischen Papierkorb-Dateien bleiben die wiederherstellbare Datenquelle; der Verlauf hält lediglich Kennungen und einen Fingerabdruck aus Baumstruktur/Dateisystemattributen. Metadaten-Callbacks werden vor dem gemeinsamen Datenbank-Speichern ausgeführt. Fehler während dieses Schritts verschieben die Datei zurück und stellen die passenden Metadaten her. Das ist noch kein stromausfallsicheres gemeinsames Befehlsjournal. Nach endgültigem Entfernen eines Papierkorb-Eintrags werden die zugehörigen Verlaufsreferenzen verworfen. Mehrfachaktionen und Host-Papierkorb sind noch nicht Teil dieses Verlaufs.

`/api/recycle-batch` bündelt bis zu 100 Profil-Wurzeln als eine Verlaufsaktion (POST: `action` delete/restore und `ids`). Die Gruppenkennung erzeugt ausschließlich der Server. Die Teilbefehle werden einzeln gespeichert; bei Teilfehlern bleiben erledigte und offene Anteile über Undo/Redo erreichbar. Die Aufbewahrung zählt 50 Gruppen/Aktionen statt 50 Einzeldateien. Es handelt sich weiterhin nicht um eine atomare, stromausfallsichere Gesamttransaktion. Fingerabdruck-Version 2 vergleicht Ordneridentität/Struktur sowie Dateiattribute, ohne durch bloße Ordner-Zeitstempeländerungen eigene Eltern-/Kind-Wiederherstellungen abzulehnen; ältere gespeicherte Fingerabdrücke werden weiter geprüft.

### Übertragungsbelege als Grundlage für vollständiges Undo

`transfer-receipts.mjs` speichert unter `transferReceipts` in der vorhandenen Datenbank Fakten über tatsächlich abgeschlossene Profil-Teilschritte: neue Ziele, ersetzte Ziele/Sicherungen und gesicherte Originale beim Verschieben. Vorbereitungen/übersprungene Elemente erzeugen keinen falschen Eintrag. Reguläre Datei-Veröffentlichungsjournale enthalten eine minimale Belegbeschreibung für die Wiederherstellung nach einem Metadatenfehler. Belege bleiben bei Abbruch als partiell bzw. nach Neustart als unterbrochen erkennbar.

`transfer-receipt.key` im Datenverzeichnis ist ein privater 32-Byte-HMAC-Schlüssel (0600). Er muss zusammen mit der Datenbank gesichert werden; ein ungültiger Schlüssel wird nicht still ersetzt. Belege enthalten keine Verknüpfungskennwörter. Persönliche und Share-Bearbeitung sind getrennt, maximal 50 ganze Vorgänge bzw. 20000 Teilschritte je Kontext werden aufbewahrt. Bestätigte Profil-Übertragungen teilen sich die bestehende Verlaufssperre, damit ihre Metadatenänderungen keine gleichzeitig gespeicherten Undo-Aktionen verdrängen. Die eigentliche Transfer-Undo-Ausführung und weitere Absturzjournale sind noch offen.

### Übertragungen rückgängig machen

`transfer-replay.mjs` verwendet die gespeicherten Profil-Belege für neue Kopier-/Verschiebeaktionen. Neue Ziele werden rückwärts wiederherstellbar entfernt, gesicherte Originale eines Moves an ihre genauen Eltern zurückgebracht und ersetzte Datei-/Link-Inhalte umgeschaltet. Zielkennungen und aktuelle Freigabefelder bleiben erhalten. Der Verlauf speichert pro erfolgreichem Schritt die neue Position; Teilkonflikte lassen übrige Schritte verfügbar.

Beim Ersetzen liegt vor dem atomaren Dateiaustausch eine unabhängige Sicherung im privaten Papierkorbspeicher vor. Ein privater Hardlink-Anker erlaubt das Zurücksetzen eines fehlgeschlagenen Metadaten-Commits auf dieselbe ursprüngliche Inode. Auf Dateisystemen ohne passende Hardlink-Unterstützung wird dieser Ersetzen-Schritt vor der Veröffentlichung abgewiesen. Vollständige Stromausfall-/Replay-Journale und Anker-Aufräumung nach Abstürzen bleiben offen; Sicherungen allein sind kein vollständiges Fortschrittsjournal. Interne Sicherungen werden weiterhin aufbewahrt und können im Papierkorb sichtbar sein. Manuell verbrauchte oder veränderte Sicherungen werden nicht stillschweigend ersetzt. Mehrfach-Quellwurzeln sowie alte CMD-/COPY-/MOVE- und Host-Wege sind noch nicht vollständig an diesen Verlauf angebunden.


Mehrfachauswahlen im Explorer teilen für zusammenhängende Profil-Übertragungen eine Vorgangskennung. Der Verlauf und die Belegaufbewahrung behandeln alle Quellwurzeln als eine Aktion. Andere zwischenzeitliche Verlaufseinträge trennen die Gruppe; bereits erledigte Teilaktionen bleiben bei Abbruch oder Konflikt verfügbar. Host-Transfers und ältere CMD-Kopierwege sind noch nicht in diese Gruppierung eingebunden.


Der Desktop-CMD verwendet für COPY/XCOPY/MOVE/REPLACE innerhalb des Profils ebenfalls `/api/profile-transfer`. Dadurch gelten die aktuellen Profilrechte, Versionsprüfungen, ersetzten Originalsicherungen und der Explorer-Verlauf. Die neue Browser-Datei `public/cmd-transfer.js` gehört zum nativen Desktop-Update; App-Container benötigen dafür keinen Neubau. Direkte ältere `/api/copy`-/`/api/move`-Aufrufer und Host-Dateibefehle sind noch separat anzubinden.
