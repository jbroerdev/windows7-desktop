# Windows 7 Desktop

Ein Desktop im Stil von Windows 7 für den Browser: mit Startmenü, Taskleiste, Explorer, Fotoanzeige, VLC-artigem Medienplayer und Notepad++-artigem Editor. Benutzer können Dateien hochladen, verwalten und öffentlich freigeben. Dieses eigenständige Projekt basiert auf [Explorer Share](https://github.com/jbroerdev/explorer-share); das ursprüngliche Repository bleibt separat bestehen.

**Die Anwendung läuft mit Docker Compose.** Docker baut das Image direkt aus diesem Repository. Node.js und pnpm musst du auf deinem Server nicht zusätzlich installieren.

## Voraussetzungen

Du brauchst einen Server mit **Docker, dem Compose-Plugin und Git** sowie Terminal-Zugriff. Zum Anlegen des Datenordners benötigst du `sudo`-Rechte.

Die folgenden Befehle sind für einen **Linux-Docker-Host** gedacht. Führe sie im Terminal dieses Servers aus.

## Installation

### 1. Projekt herunterladen

```bash
git clone https://github.com/jbroerdev/windows7-desktop.git
cd windows7-desktop
```

Führe alle weiteren Compose-Befehle in diesem Projektordner aus.

### 2. Datenordner auf dem Server anlegen

In dieser Anleitung liegen deine Daten im echten Host-Ordner **`/Explorer`**:

```bash
sudo mkdir -p /Explorer
sudo chown 1000:1000 /Explorer
```

Der Container läuft mit der Benutzer- und Gruppen-ID `1000:1000`. Dieser Benutzer braucht Schreibrechte auf den Ordner.

### 3. Einstellungen anlegen

Kopiere bei der ersten Installation die Vorlage:

```bash
cp .env.example .env
```

Öffne die neue Datei `.env` mit einem Texteditor und ersetze ihren Inhalt durch:

```dotenv
EXPLORER_PATH=/Explorer
EXPLORER_BIND_ADDRESS=0.0.0.0
EXPLORER_PORT=3000
COOKIE_SECURE=0
```

| Einstellung | Bedeutung |
| --- | --- |
| `EXPLORER_PATH` | Ordner auf deinem Server für Dateien und Kontodaten. |
| `EXPLORER_BIND_ADDRESS` | `0.0.0.0` erlaubt Zugriff über die Server-IP. `127.0.0.1` beschränkt den Zugriff auf den Server selbst. |
| `EXPLORER_PORT` | Port der Anwendung. Ist `3000` belegt, wähle beispielsweise `8080`. |
| `COOKIE_SECURE` | Für direkten HTTP-Zugriff `0`; bei Betrieb über HTTPS am Reverse-Proxy `1`. |

### 4. Container bauen und starten

```bash
docker compose -f compose.yaml -f compose.bind.yaml up --build -d
```

Beim ersten Start lädt Docker die benötigten Pakete herunter, führt Tests aus und baut das Image. Das kann einige Minuten dauern. `-d` lässt die Anwendung im Hintergrund laufen.

**Verwende beide Compose-Dateien:** Die zweite Datei bindet deinen Host-Ordner `/Explorer` ein. Ohne sie verwendet die Standardkonfiguration ein von Docker verwaltetes Volume. Beim Wechsel zwischen diesen Speicherarten werden vorhandene Daten nicht automatisch kopiert.

### 5. Erstes Administratorkonto anlegen

```bash
docker compose -f compose.yaml -f compose.bind.yaml exec explorer node scripts/setup-admin.mjs admin
```

Gib dein gewünschtes Passwort zweimal ein. Die Eingabe wird nicht angezeigt; das ist normal. Das Passwort muss mindestens **12 Zeichen** lang sein. `admin` ist der Benutzername und kann vor der Einrichtung durch einen anderen Namen ersetzt werden.

Es gibt keine voreingestellten Zugangsdaten. Dieser Befehl erstellt nur das erste Administratorkonto. Er wird im Container ausgeführt, weil die Ersteinrichtung auf lokale Verbindungen beschränkt ist.

### 6. Im Browser öffnen

Ersetze `SERVER-IP` durch die IP-Adresse deines Docker-Hosts:

- Öffentliche Dateiansicht: `http://SERVER-IP:3000/`
- Anmeldung und Kontoverwaltung: `http://SERVER-IP:3000/login`

Hast du den Port geändert, ersetze auch `3000`. Auf demselben Rechner kannst du statt `SERVER-IP` auch `localhost` verwenden.

Die öffentliche Ansicht ist anfangs leer. Melde dich unter `/login` an, um eigene Dateien zu verwalten. In der öffentlichen Ansicht gibt es absichtlich keinen Login-Knopf.

## Wo liegen meine Dateien?

Der Host-Ordner `/Explorer` wird im Container ebenfalls als `/Explorer` eingebunden. Die Web-Festplatte **Windows (C:)** zeigt die Benutzerstruktur:

```text
/Explorer/
├── .explorer/          Kontodaten, Freigaben und Profilbilder
└── Users/
    └── admin/
        ├── Desktop/
        ├── Downloads/
        ├── Documents/
        ├── Music/
        ├── Pictures/
        └── Videos/
```

Jeder Benutzer bekommt diese sechs Grundordner automatisch. Beispiel:

| Ansicht | Pfad |
| --- | --- |
| Auf deinem Server | `/Explorer/Users/admin/Documents/Projekt/Notiz.txt` |
| Im privaten Web-Explorer | `/C/Users/admin/Documents/Projekt/Notiz.txt` |

Neue Dateien und Ordner, die du direkt auf dem Host in vorhandenen Benutzerverzeichnissen anlegst, erscheinen normalerweise innerhalb weniger Sekunden im Web. Ein Container-Neustart ist nicht nötig. Sie müssen für den Container-Benutzer lesbar und für Bearbeitungen beschreibbar sein. Umbenennen und Löschen vorhandener Einträge solltest du über den Web-Explorer erledigen.

Ein neuer Host-Ordner unter `Users` erstellt **kein Benutzerkonto**. Lege Konten über die Anwendung an.

## Benutzer und Freigaben

### Weitere Benutzer anlegen

Melde dich als Administrator unter `/login` an und öffne **„Benutzer verwalten“**. Jeder Benutzer verwaltet seine eigenen privaten Dateien. Profilbilder lassen sich ebenfalls auf der Login-Seite ändern.

### Dateien öffentlich freigeben

1. Melde dich an und öffne den gewünschten Ordner.
2. Klicke mit der rechten Maustaste auf eine Datei oder einen Ordner.
3. Wähle **„Freigeben …“**, aktiviere die öffentliche Freigabe und speichere.
4. Kopiere den angezeigten öffentlichen Link.

Eine Ordnerfreigabe gilt auch für enthaltene und später hinzugefügte Dateien und Unterordner – einschließlich neuer Dateien vom Host. Mit **„Freigabe zurücknehmen“** kannst du einzelne Einträge davon ausnehmen. Bei einem Ordner werden dabei auch die Freigaben seiner enthaltenen Einträge zurückgenommen.

Die öffentliche Ansicht liegt unter `/C/Users/share/…` und zeigt nur freigegebene Inhalte. `share` ist eine gemeinsame Ansicht, kein zweiter Speicherordner. Neue Einträge erhalten keine eigene Freigabe; eine bestehende Ordnerfreigabe können sie erben.

## Dateien im Web-Explorer verwalten

| Aktion | So geht es |
| --- | --- |
| Öffnen | Doppelklick auf eine Datei oder einen Ordner. |
| Hochladen | Nach dem Login „Hochladen“ wählen oder Dateien vom eigenen Rechner in die Dateifläche ziehen. |
| Neuer Ordner oder neue Verknüpfung | Rechtsklick auf eine freie Stelle. Verknüpfungen können ein eigenes Icon bekommen. |
| Mehrere Einträge auswählen | Ziehrahmen auf freier Fläche, Strg-Klick, Umschalt-Klick oder Strg+A. |
| Verschieben | Strg+X zum Ausschneiden, Zielordner öffnen und Strg+V zum Einfügen. Alternativ auf einen Zielordner ziehen. |
| Umbenennen oder Löschen | Rechtsklick auf den Eintrag; Löschen auch mit Entf und Bestätigung. Es gibt keinen Papierkorb. |
| ZIP erstellen oder entpacken | Rechtsklick auf Datei, Ordner oder ZIP-Archiv. |
| Text oder Programmcode bearbeiten | Rechtsklick → „Bearbeiten“, speichern mit Strg+S. |

Fotoanzeige, Editor und Medienplayer öffnen als verschiebbare Fenster. Ziehe die Titelleiste zum Verschieben und die Ränder oder Ecken zum Ändern der Größe. Ein Doppelklick auf die Titelleiste maximiert das Fenster oder stellt es wieder her. Minimierte Fenster lassen sich über die Leiste am unteren Rand wieder öffnen. Mehrere dieser Ansichten können gleichzeitig geöffnet sein. Textdateien öffnen in unabhängigen Editorfenstern, auch mehrere Instanzen derselben Datei. Ziehe ein Fenster an den linken oder rechten Bildschirmrand, um es auf die entsprechende Hälfte anzudocken; eine Vorschau zeigt die Zielgröße. So können zwei Fenster nebeneinander arbeiten.

Bei Internetverknüpfungen wählst du beim Erstellen oder Bearbeiten mit dem Häkchen **„Im eigenen Fenster innerhalb des Explorers öffnen“**, ob die Website in einem solchen Fenster erscheint. Mit dem zusätzlichen Häkchen **„Als App öffnen (nur Fensterrahmen)“** entfallen die Adress- und Werkzeugleiste. Damit kannst du auch andere bereits laufende Docker-Webapps über ihre im Browser erreichbare URL einbinden. Im App-Modus bietet ein Rechtsklick auf die Titelleiste „Extern öffnen“. Ohne das erste Häkchen öffnet die Verknüpfung in einem externen Tab. Manche Websites verhindern eine Einbettung; im Fenster gibt es dafür immer „Extern öffnen“.

Bilder öffnen in der Fotoanzeige mit Zoomregler, Originalgröße, Einpassen, Drehen, Bildwechsel und Diashow. Das Mausrad zoomt zum Mauszeiger; vergrößerte Bilder können mit der Maus verschoben werden. Drehen verändert nur die Ansicht. Musik und Videos öffnen im Medienplayer; unterstützte Formate hängen von den Codecs des Browsers ab. HTML und PHP öffnen als isolierte Website-Vorschau. Die PHP-Vorschau ersetzt keinen vollständigen Webhost mit Datenbank oder dauerhaften Sitzungen.

Beim Verschieben bleiben eigene Freigaben erhalten; geerbte Freigaben richten sich nach dem neuen Elternordner. Namenskonflikte werden ohne Überschreiben abgewiesen. Die sechs Grundordner können nicht verschoben werden.

## Updates installieren

Wechsle im Terminal in deinen bestehenden Projektordner:

```bash
git pull --ff-only
docker compose -f compose.yaml -f compose.bind.yaml up --build -d
```

Deine `.env` und der Datenordner `/Explorer` bleiben erhalten. Das Administratorkonto wird nicht erneut angelegt. Nach einem Neustart melden sich Benutzer erneut an. Lade bereits geöffnete Browserseiten neu.

## Datensicherung

Sichere **den vollständigen Ordner `/Explorer`**, einschließlich des versteckten Unterordners `.explorer`. Nur `Users` zu sichern reicht nicht aus, um auch Benutzerkonten und Freigaben wiederherzustellen.

Stoppe die Anwendung für eine konsistente Sicherung kurz. Währenddessen sollten auch keine anderen Programme in den Host-Ordner schreiben:

```bash
docker compose -f compose.yaml -f compose.bind.yaml stop
sudo tar -czf "$HOME/explorer-backup.tar.gz" -C / Explorer
docker compose -f compose.yaml -f compose.bind.yaml up -d
```

Die Sicherung liegt danach als `explorer-backup.tar.gz` in deinem Home-Verzeichnis. Dieser Beispielname wird bei der nächsten Sicherung überschrieben; verwende für mehrere Sicherungen unterschiedliche Namen. Bewahre die Sicherung auch außerhalb des Servers auf. Sie enthält neben Dateien auch Kontodaten und Freigaben.

## Status, Logs und häufige Probleme

Status anzeigen:

```bash
docker compose -f compose.yaml -f compose.bind.yaml ps
```

Letzte Meldungen anzeigen:

```bash
docker compose -f compose.yaml -f compose.bind.yaml logs --tail=100 explorer
```

| Problem | Was du prüfen solltest |
| --- | --- |
| Die Seite ist nicht erreichbar. | Läuft der Container? Stimmen Server-IP und Port? Steht `EXPLORER_BIND_ADDRESS=0.0.0.0` in `.env`? Erlaubt die Host-Firewall den Zugriff? |
| Port 3000 ist belegt. | Ändere `EXPLORER_PORT` in `.env` und starte den Compose-Befehl erneut. |
| Dateien erscheinen nicht unter `/Explorer` auf dem Host. | Wurde mit **beiden** Compose-Dateien gestartet und ist `EXPLORER_PATH=/Explorer` gesetzt? |
| Schreiben oder Hochladen schlägt fehl. | Prüfe freien Speicher und Schreibrechte für UID/GID `1000:1000`. |
| Gäste sehen keine Dateien. | Neue Dateien sind privat, solange weder sie selbst noch ihr Elternordner freigegeben sind. |
| Das Administratorkonto existiert bereits. | Melde dich mit dem vorhandenen Konto an; der Einrichtungsbefehl ist nur für das erste Konto. |

## Eigene Domain und HTTPS

Für öffentlichen Betrieb mit eigener Domain verwende einen HTTPS-Reverse-Proxy vor dem Container. Setze dafür `COOKIE_SECURE=1` in `.env` und führe den Compose-Startbefehl erneut aus. Läuft der Proxy auf demselben Host, kann die Portbindung auf `127.0.0.1` beschränkt werden. Die direkte Verbindung zu Port 3000 bietet selbst kein HTTPS.

## Weitere Informationen

- [Docker-Details und Übernahme vorhandener Daten](DOCKER.md)
- [Automatische Docker-Builds und Tests](https://github.com/jbroerdev/windows7-desktop/actions)
- [Quellen und Lizenzhinweise zu den Grafiken](public/icons/ATTRIBUTION.md)

Die Oberfläche orientiert sich am Windows-7-Explorer und an [mirrors.equipable.org](https://mirrors.equipable.org/). Textbearbeitung nutzt CodeMirror, ZIP-Verarbeitung fflate und die PHP-Vorschau eine isolierte WebAssembly-Laufzeit.



## Desktop und Programme verwenden

- Alles im Ordner **Desktop** erscheint auch auf dem Desktop. Dateien, Ordner und Internetverknüpfungen öffnen sich per Doppelklick. Änderungen vom Host werden beim nächsten automatischen Abgleich sichtbar.
- Symbole lassen sich im Raster verschieben. Ein belegter Platz tauscht die beiden Symbole. Mit **Alt + Pfeiltasten** geht es auch per Tastatur. Die Positionen werden pro Benutzer in diesem Browser gespeichert. Rechtsklick auf den Desktop bietet eine automatische Anordnung.
- Notepad++, Fotoanzeige und VLC lassen sich im Startmenü ohne Datei starten. Über **Öffnen** oder Rechtsklick → **Datei öffnen** wählst du eine Datei aus dem Explorer-Speicher. Neue Texte werden mit **Speichern unter** in einem gewählten Ordner gespeichert.
- Unter **Computer → Windows (C:) → Programme** kannst du Internetverknüpfungen anlegen. Sie erscheinen automatisch im Startmenü, auch wenn sie in Unterordnern liegen. Die Suche findet Programme und sichtbare Dateien.
- Die Häkchen **Im eigenen Fenster** und **Als App öffnen** bestimmen, ob eine Verknüpfung im externen Tab, als Website-Fenster oder nur mit App-Fensterrahmen startet. Für andere Docker-Apps muss die URL im Browser erreichbar sein und die App eine Einbettung erlauben.
- Leere gewöhnliche Ordner und Ordner mit sichtbarem Inhalt haben unterschiedliche Symbole.

### Speicherorte und mehrere Benutzer

Die persönlichen Ordner liegen unter `/Explorer/Users/<Benutzer>/Desktop`, `Documents`, `Downloads`, `Music`, `Pictures` und `Videos`. Der neue gemeinsame Speicherbereich **C:/Programme** liegt auf dem Host unter **`/Explorer/Programme`**. Neue Einträge bleiben privat und gehören ihrem Ersteller. Freigegebene Programme erscheinen auch bei anderen Benutzern und Gästen; fremde Einträge können nicht bearbeitet werden. Direkt auf dem Host angelegte Programmdateien werden dem Besitzer des Programme-Stammordners zugeordnet. Internetverknüpfungen werden über den Explorer angelegt und in der Datenbank gespeichert.

Wenn Explorer Share und Windows 7 Desktop parallel laufen, verwende **unterschiedliche Host-Datenordner und Ports**. Zwei laufende Container dürfen nicht dieselbe Datenbank bearbeiten. Für einen Umzug zuerst den alten Container stoppen, den gesamten Datenordner sichern und die Kopie mit dem neuen Projekt starten.

Programme lassen sich per Rechtsklick im Startmenü, auf einer Verknüpfung oder auf dem laufenden Taskleistensymbol anheften. „Von Taskleiste lösen“ entfernt die Anheftung. Sie bleibt pro Benutzer in diesem Browser nach dem Neuladen erhalten. Ein Klick aktiviert ein laufendes Fenster; Rechtsklick → „Neue Instanz öffnen“ startet ein weiteres. Editor, Fotoanzeige, Medienplayer und eingebettete Verknüpfungen unterstützen unabhängige Fenster.
