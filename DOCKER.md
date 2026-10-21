# Windows 7 Desktop in Docker

Die [README](README.md) enthält die empfohlene Installation mit Host-Ordner, den automatisierten Umstieg von Explorer Share und zusätzliche Laufwerke. Für eine bestehende Explorer-Share-Instanz mit `/Explorer`-Mount verwende den dort beschriebenen Kopier-Helfer; die unten beschriebene Migration eines alten `data`-Ordners gilt nur für frühere Speicherlayouts.

Zusätzliche Platten werden über `compose.drives.yaml` nach `/Explorer/D-Name` eingebunden. Der Explorer zeigt pro Dateisystem echte Kapazitätswerte. Gelöschte Dateien bleiben zunächst im persönlichen Papierkorb auf demselben Laufwerk (`.recycle`), bis sie wiederhergestellt oder ausdrücklich endgültig gelöscht werden.

## Starten

Docker mit Compose und Git auf dem Docker-Host installieren. Danach:

```sh
git clone https://github.com/jbroerdev/windows7-desktop.git
cd windows7-desktop
```

Im Projektordner ausführen:

```sh
docker compose up --build -d
docker compose exec explorer node scripts/setup-admin.mjs admin
```

Der zweite Befehl fragt das Passwort zweimal unsichtbar ab. Er legt nur das erste Administratorkonto an. Es werden keine Zugangsdaten ins Image eingebaut. Danach unter http://localhost:3000/login anmelden. Für einen entfernten Host entweder einen Reverse-Proxy verwenden oder die unten beschriebene Portbindung ändern. Weitere Benutzer werden dort über „Benutzer verwalten“ angelegt.

Die Ersteinrichtung per Web ist auf Loopback beschränkt. Docker-Portweiterleitungen zählen dafür nicht als lokale Verbindung; deshalb wird das erste Konto mit dem Befehl im Container eingerichtet.

## Echtes Dateisystem

Der Container bindet den echten Host-Ordner **`/Explorer`** direkt nach **`/Explorer`** ein. Es gibt keine von Docker verwalteten Volumes. Die Web-Festplatte `C:` entspricht dieser Wurzel:

```text
/Explorer/
├── .explorer/                 # Datenbank, Profilbilder, Migrationssicherungen
└── Users/
    ├── admin/
    │   ├── Desktop/
    │   ├── Downloads/
    │   ├── Documents/
    │   ├── Music/
    │   ├── Pictures/
    │   └── Videos/
    └── alice/
        ├── Desktop/
        ├── Downloads/
        ├── Documents/
        ├── Music/
        ├── Pictures/
        └── Videos/
```

Jeder neu angelegte Benutzer bekommt dieselben Grundordner. Benutzername, Ordnernamen, Unterordner und Dateinamen sind dieselben wie im privaten Web-Explorer. Uploads, Bearbeitungen und Umbenennungen arbeiten direkt auf diesen Dateien. Beispielsweise entspricht `/C/Users/admin/Documents/lol/Test.txt` der Datei `/Explorer/Users/admin/Documents/lol/Test.txt`.

`/C/Users/share/…` ist die gemeinsame öffentliche Ansicht der freigegebenen Inhalte. Sie dupliziert keine Dateien und legt keinen zweiten physischen `share`-Benutzer an. Freigaben und Internetverknüpfungen werden in der Datenbank verwaltet; Internetverknüpfungen sind keine regulären hochgeladenen Dateien.

Neue Dateien und Ordner innerhalb vorhandener Benutzerordner werden auch während des Betriebs automatisch eingelesen. Die offene Webansicht prüft alle drei Sekunden auf Änderungen; ein Container-Neustart ist nicht nötig. Dateigrößen werden ebenfalls aktualisiert. Während Schreibvorgängen der Anwendung wird die Erkennung ausgesetzt, damit laufende Uploads nicht doppelt importiert werden. Konten werden nicht automatisch aus beliebigen Verzeichnisnamen erstellt. Umbenennen und Löschen vorhandener Einträge weiterhin über die Weboberfläche durchführen. Neue Einträge haben keine eigene Freigabe, können aber eine Freigabe ihres Elternordners erben. Symbolische Links werden nicht verfolgt. Host-Dateien müssen für den Container-Benutzer (UID/GID 1000:1000) lesbar und für Bearbeitungen beschreibbar sein.

## Eigenen Host-Ordner einbinden

Standardmäßig nutzt Compose einen Host-Bind-Mount unter `/Explorer`. Der Ordner muss vorher existieren und UID/GID 1000:1000 gehören. Die bisherige Zusatzdatei bleibt für ältere Startbefehle kompatibel:

```sh
docker compose -f compose.yaml -f compose.bind.yaml up --build -d
```

Der Inhalt liegt auf dem Host unter `/Explorer` und im Container ebenfalls unter `/Explorer`. Den Pfad kann man über `EXPLORER_PATH` in einer `.env` ändern; eine Vorlage liegt in `.env.example`. Unter Linux muss dieser Ordner für UID/GID **1000:1000** beschreibbar sein, da der Container als Benutzer `node` läuft. Ein Named Volume und ein Host-Bind-Mount sind getrennte Speicherorte; ein Wechsel kopiert keine vorhandenen Daten automatisch.

## Port und HTTPS

Für direkten Zugriff im eigenen LAN eine .env im Projektordner anlegen, beispielsweise:

```dotenv
EXPLORER_BIND_ADDRESS=0.0.0.0
EXPLORER_PORT=3000
```

Danach ist die Anwendung unter http://HOST-IP:3000 und die Anmeldung unter http://HOST-IP:3000/login erreichbar. Für öffentlichen Betrieb HTTPS am Reverse-Proxy verwenden.

Der Port ist standardmäßig nur an `127.0.0.1:3000` gebunden. In `.env` können `EXPLORER_PORT` und `EXPLORER_BIND_ADDRESS` geändert werden. Hinter einem HTTPS-Reverse-Proxy `COOKIE_SECURE=1` setzen. Eine bereits lokal auf Port 3000 laufende Entwicklungsinstanz muss vorher beendet oder der Docker-Host-Port geändert werden.

## Bestehende Daten übernehmen

Das Image enthält absichtlich keine lokalen Dateien, Benutzer oder Passwörter. Vor der Übernahme die alte Anwendung stoppen und den vollständigen bisherigen `data`-Ordner sichern. Dessen Inhalt gehört vor dem ersten Start in den neuen Speicher unter `/Explorer/.explorer`. Er muss für UID/GID 1000:1000 beschreibbar sein. Bei der Standardkonfiguration entspricht das `/Explorer/.explorer` auf dem Host.

Die Anwendung übernimmt die bestehenden Dateien aus `files/<ID>` bzw. aus `Explorer/Users/…` des bisherigen lokalen Datenordners in die echte Struktur unter `/Explorer/Users/…`. Ursprüngliche ID-Dateien bleiben als Sicherung erhalten. Bestehende Zieldateien werden nicht überschrieben. Die gesamte Wurzel `/Explorer` einschließlich `.explorer` zusammen sichern.

## Prüfen und aktualisieren

```sh
docker compose ps
docker compose logs --tail=100 explorer
git pull --ff-only
docker compose up --build -d
```

Der Docker-Build baut den Editor und führt die Integrations- und Dateisystemtests aus. Das Runtime-Image läuft ohne Root-Rechte und hat einen HTTP-Healthcheck. Docker wurde in der aktuellen Entwicklungsumgebung nicht gefunden; ein tatsächlicher Image-Build/Containerstart konnte hier daher nicht überprüft werden.

Der GitHub-Workflow „Docker build and smoke test“ baut das Image bei Änderungen, führt die Tests im Build aus und prüft anschließend den Containerstart samt Healthcheck. Ein erfolgreicher Workflow wird im Actions-Tab angezeigt.
