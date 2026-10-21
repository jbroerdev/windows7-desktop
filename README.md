# Windows 7 Desktop

Ein Desktop im Stil von Windows 7 für den Browser: mit Startmenü, Taskleiste, Explorer, Fotoanzeige, VLC-artigem Medienplayer und Notepad++-artigem Editor. Benutzer können Dateien hochladen, verwalten und öffentlich freigeben. Dieses eigenständige Projekt basiert auf [Explorer Share](https://github.com/jbroerdev/explorer-share); das ursprüngliche Repository bleibt separat bestehen.

**Die Anwendung läuft mit Docker Compose.** Docker baut das Image direkt aus diesem Repository. Node.js und pnpm musst du auf deinem Server nicht zusätzlich installieren.

Schon Explorer Share installiert? Siehe [Umstieg mit Übernahme der Daten](#von-explorer-share-umsteigen).

## Von Explorer Share umsteigen

Der Umstieg übernimmt Konten, Passwörter, Freigaben und Dateien aus einer bestehenden Docker-Instanz mit `/Explorer`-Mount. Das alte Repository bleibt unverändert. Der Helfer baut zuerst das neue Image, stoppt dann den alten Container und **kopiert** den gesamten Speicher in einen neuen Host-Ordner. Dafür brauchst du ausreichend Platz für eine vollständige zweite Kopie. Sichere die alten Daten vorher separat.

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
git clone https://github.com/jbroerdev/windows7-desktop.git
cd windows7-desktop
sudo bash scripts/upgrade-from-explorer-share.sh ALTER-CONTAINER /Explorer 3000
```

Ersetze `ALTER-CONTAINER` durch den Namen aus der ersten Ausgabe. `/Explorer` muss neu oder leer sein. Falls die alte Instanz diesen Host-Ordner bereits verwendet, wähle für die sichere Kopie zunächst einen anderen Zielordner; der Helfer überschreibt keine vorhandenen Daten. `3000` ist der gewünschte Port. Verwende einen frischen Projektordner ohne `.env`. Bei HTTPS muss dein Reverse-Proxy anschließend auf diesen Port zeigen. Du meldest dich mit deinen bisherigen Zugangsdaten an; lege kein neues erstes Administratorkonto an.

Während der Kopie ist die Anwendung kurz nicht erreichbar. Danach bleibt der alte Container gestoppt und sein ursprünglicher Speicher erhalten. Bei einem Startfehler versucht das Skript automatisch, ihn wieder zu starten. Für eine spätere Rückkehr:

```bash
docker compose -f compose.yaml -f compose.bind.yaml down
docker start ALTER-CONTAINER
```

Änderungen, die du inzwischen im neuen Desktop gemacht hast, werden nicht zurück in die alte Kopie übertragen. Niemals beide Anwendungen gleichzeitig auf dieselbe Datenbank zugreifen lassen. Das Skript unterstützt alte Installationen mit einem Bind-Mount oder Docker-Volume an `/Explorer`; andere Speicherlayouts benötigen eine manuelle vollständige Datenübernahme.

## Zusätzliche Festplatten einbinden

Jedes zusätzliche Laufwerk erhält im Container einen Ordner **`/Explorer/BUCHSTABE-Name`**, zum Beispiel `/Explorer/D-Daten`. C: bleibt der Hauptspeicher. Verwende je Buchstabe nur einen Mount; möglich sind A, B und D bis Z.

```bash
cp compose.drives.example.yaml compose.drives.yaml
```

Passe in `compose.drives.yaml` die Host-Pfade an deine bereits eingehängten Platten an, zum Beispiel:

```yaml
services:
  explorer:
    volumes:
      - type: bind
        source: /Explorer/D-Daten
        target: /Explorer/D-Daten
        bind:
          create_host_path: false
```

Die Quelle muss vorhanden und für UID/GID `1000:1000` lesbar sowie für Änderungen beschreibbar sein. `create_host_path: false` verhindert, dass ein Tippfehler unbemerkt einen neuen Host-Ordner anlegt. Anschließend immer alle verwendeten Compose-Dateien angeben:

```bash
docker compose -f compose.yaml -f compose.bind.yaml -f compose.drives.yaml up --build -d
```

Der Inhalt erscheint als **Daten (D:)** unter Computer. Die Balken zeigen den echten freien und gesamten Speicher des jeweiligen Dateisystems. Mehrere Ordner auf derselben Platte zeigen entsprechend dieselbe Kapazität. Dateien vom Host werden automatisch eingelesen. Angemeldete Benutzer können Zusatzlaufwerke lesen und eigene Einträge anlegen; ändern und löschen darf der jeweilige Besitzer. Vom Host importierte Einträge gehören dem ersten vorhandenen Administrator. Gäste sehen nur ausdrücklich freigegebene Inhalte. Sichere zusätzliche Platten ebenfalls; eine Sicherung des Hauptordners allein reicht bei separaten Mounts nicht aus.

## Papierkorb

Löschen öffnet einen eigenen Ja/Nein-Dialog und verschiebt Einträge in den persönlichen Papierkorb. Öffne das Desktop-Symbol **Papierkorb**, um sie wiederherzustellen oder endgültig zu löschen. Bei Namenskonflikten wird nichts überschrieben. Der Papierkorb liegt versteckt unter `.recycle` auf dem ursprünglichen Laufwerk und belegt dort weiterhin Speicher. Erst endgültiges Löschen gibt den Platz frei. Ein nicht eingebundenes Laufwerk muss für Wiederherstellung und endgültiges Löschen wieder verfügbar sein.

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

**Alle Daten liegen auf dem Host unter `/Explorer`.** Bereits `compose.yaml` verwendet dafür einen Bind-Mount; es werden keine benannten oder anonymen Docker-Volumes angelegt. `compose.bind.yaml` bleibt als kompatibler Zusatz für ältere Befehle erhalten. Der Host-Ordner muss vorher existieren.

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

Die öffentliche Ansicht zeigt nur freigegebene Dateien. Über Start → Login meldest du dich an.

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

Jeder Benutzer bekommt diese Grundordner und den persönlichen Ordner Programme automatisch. Beispiel:

| Ansicht | Pfad |
| --- | --- |
| Auf deinem Server | `/Explorer/Users/admin/Documents/Projekt/Notiz.txt` |
| Im privaten Web-Explorer | `/C/Users/admin/Documents/Projekt/Notiz.txt` |

Neue Dateien und Ordner, die du direkt auf dem Host in vorhandenen Benutzerverzeichnissen anlegst, erscheinen normalerweise innerhalb weniger Sekunden im Web. Ein Container-Neustart ist nicht nötig. Sie müssen für den Container-Benutzer lesbar und für Bearbeitungen beschreibbar sein. Umbenennen und Löschen vorhandener Einträge solltest du über den Web-Explorer erledigen.

Ein neuer Host-Ordner unter `Users` erstellt **kein Benutzerkonto**. Lege Konten über die Anwendung an.

## Benutzer und Freigaben

### Weitere Benutzer anlegen

Melde dich als Administrator an und öffne **Start → Benutzerkonto**. Dort kannst du Konten anlegen, entfernen und ihre Kontogruppe ändern. Jeder Benutzer verwaltet seine eigenen privaten Dateien und sein Profilbild.

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
| Kopieren | Strg+C, Zielordner öffnen und Strg+V; alternativ Rechtsklick oder Menü „Bearbeiten“. |
| Verschieben | Strg+X zum Ausschneiden, Zielordner öffnen und Strg+V zum Einfügen. Alternativ auf einen Zielordner ziehen. |
| Umbenennen oder Löschen | Rechtsklick auf den Eintrag; Löschen auch mit Entf und Bestätigung. Gelöschte Einträge landen zunächst im persönlichen Papierkorb. |
| ZIP erstellen oder entpacken | Rechtsklick auf Datei, Ordner oder ZIP-Archiv. |
| Text oder Programmcode bearbeiten | Rechtsklick → „Bearbeiten“, speichern mit Strg+S. |

Fotoanzeige, Editor und Medienplayer öffnen als verschiebbare Fenster. Ziehe die Titelleiste zum Verschieben und die Ränder oder Ecken zum Ändern der Größe. Ein Doppelklick auf die Titelleiste maximiert das Fenster oder stellt es wieder her. Minimierte Fenster lassen sich über die Leiste am unteren Rand wieder öffnen. Mehrere dieser Ansichten können gleichzeitig geöffnet sein. Textdateien öffnen in unabhängigen Editorfenstern, auch mehrere Instanzen derselben Datei. Ziehe ein Fenster an den linken oder rechten Bildschirmrand, um es auf die entsprechende Hälfte anzudocken; eine Vorschau zeigt die Zielgröße. So können zwei Fenster nebeneinander arbeiten.

Bei Internetverknüpfungen wählst du beim Erstellen oder Bearbeiten mit dem Häkchen **„Im eigenen Fenster innerhalb des Explorers öffnen“**, ob die Website in einem solchen Fenster erscheint. Mit dem zusätzlichen Häkchen **„Als App öffnen (nur Fensterrahmen)“** entfallen die Adress- und Werkzeugleiste. Damit kannst du auch andere bereits laufende Docker-Webapps über ihre im Browser erreichbare URL einbinden. Im App-Modus bietet ein Rechtsklick auf die Titelleiste „Extern öffnen“. Ohne das erste Häkchen öffnet die Verknüpfung in einem externen Tab. Manche Websites verhindern eine Einbettung; im Fenster gibt es dafür immer „Extern öffnen“.

Bilder öffnen in der Fotoanzeige mit Zoomregler, Originalgröße, Einpassen, Drehen, Bildwechsel und Diashow. Das Mausrad zoomt zum Mauszeiger; vergrößerte Bilder können mit der Maus verschoben werden. Drehen verändert nur die Ansicht. Musik und Videos öffnen im Medienplayer; unterstützte Formate hängen von den Codecs des Browsers ab. HTML und PHP öffnen als isolierte Website-Vorschau. Die PHP-Vorschau ersetzt keinen vollständigen Webhost mit Datenbank oder dauerhaften Sitzungen.

Beim Verschieben bleiben eigene Freigaben erhalten; geerbte Freigaben richten sich nach dem neuen Elternordner. Namenskonflikte werden ohne Überschreiben abgewiesen. Die Grundordner einschließlich des persönlichen Programme-Ordners können nicht verschoben werden.

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
| Dateien erscheinen nicht unter `/Explorer` auf dem Host. | Ist `EXPLORER_PATH=/Explorer` gesetzt und existiert der Host-Ordner mit passenden Schreibrechten? |
| Schreiben oder Hochladen schlägt fehl. | Prüfe freien Speicher und Schreibrechte für UID/GID `1000:1000`. |
| Gäste sehen keine Dateien. | Neue Dateien sind privat, solange weder sie selbst noch ihr Elternordner freigegeben sind. |
| Das Administratorkonto existiert bereits. | Melde dich mit dem vorhandenen Konto an; der Einrichtungsbefehl ist nur für das erste Konto. |

## Eigene Domain und HTTPS

Für öffentlichen Betrieb mit eigener Domain verwende einen HTTPS-Reverse-Proxy vor dem Container. Setze dafür `COOKIE_SECURE=1` in `.env` und führe den Compose-Startbefehl erneut aus. Läuft der Proxy auf demselben Host, kann die Portbindung auf `127.0.0.1` beschränkt werden. Die direkte Verbindung zu Port 3000 bietet selbst kein HTTPS.

## Weitere Informationen

- [Docker-Details und Übernahme vorhandener Daten](DOCKER.md)
- [Automatische Docker-Builds und Tests](https://github.com/jbroerdev/windows7-desktop/actions)
- [Quellen und Lizenzhinweise zu den Grafiken](public/icons/ATTRIBUTION.md)

Die IndexedDB-Kompatibilität nutzt [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) mit einer eigenen persistenten Ablage; [Lizenz](public/proxy-runtime.LICENSE.txt).

Die Oberfläche orientiert sich am Windows-7-Explorer und an [mirrors.equipable.org](https://mirrors.equipable.org/). Textbearbeitung nutzt CodeMirror, ZIP-Verarbeitung fflate und die PHP-Vorschau eine isolierte WebAssembly-Laufzeit.



## Desktop und Programme verwenden

### Interne Apps über den Server-Proxy

Nur Administratoren sehen in einer Internetverknüpfung **„Über Server-Proxy öffnen“**. Das Häkchen aktiviert Fenster- und App-Modus. Als Ziel kannst du eine interne HTTP-/HTTPS-Adresse eintragen, die der Container erreichen kann. Die Verknüpfung öffnet dann unter **`/app/<appname>/` auf derselben Explorer-Domain**; zusätzliche Domains, DNS-Einträge oder Reverse-Proxy-Regeln sind nicht nötig. Ohne Proxy-Häkchen bleibt der bisherige direkte Aufruf unverändert.

Der Zugriff folgt den normalen Dateirechten und Freigaben: Ein öffentlich freigegebener Proxy-Link macht auch den Zugriff auf diese interne App öffentlich möglich. Eine eigene Anmeldung der Ziel-App bleibt erhalten. Beim Zurücknehmen der Freigabe, Löschen der Verknüpfung oder Abmelden des zugehörigen Explorer-Benutzers endet der Zugriff. Normale Benutzer können weder den Proxy aktivieren noch sein Ziel ändern. Beim Kopieren durch normale Benutzer wird die Proxy-Einstellung entfernt und muss gegebenenfalls erneut durch einen Administrator eingerichtet werden.

Die Proxy-Seite läuft isoliert vom Explorer. `localStorage` wird je angemeldetem Benutzer und Verknüpfung unter **`/Explorer/.explorer/proxy-storage/`** gespeichert, maximal 5 MB je App. `sessionStorage` bleibt je geöffnetem App-Fenster getrennt. Bei Gästen bleibt dieser Speicher auf die jeweilige Proxy-Sitzung begrenzt. Diese Speicheradapter geben Apps keinen Zugriff auf Explorer-Anmeldedaten. IndexedDB wird über einen getrennten Adapter angebunden, auch in klassischen WebWorkern. Binäre Datensätze und abgeschlossene Schreibtransaktionen werden unter demselben Host-Verzeichnis gespeichert (maximal 128 MB je App-Datenbank). Die Einbettung erhält dadurch keinen Zugriff auf die nativen Explorer-Datenbanken. Diese Kompatibilitätsschicht ersetzt keine vollständige Browser-Umgebung; insbesondere spezielle Speicher- und Worker-Funktionen einer App können weitere Anpassungen benötigen.

HTTP-Anfragen, Formulare, Cookies und WebSockets werden weitergeleitet; viele Pfade in HTML, CSS, Fetch und XMLHttpRequest werden angepasst. Nicht jede Webapp lässt sich unverändert unter einem Unterpfad betreiben. Manche benötigen eine passende Basis-URL oder Anpassungen für die isolierte Einbettung.

**Docker-Netzwerk:** `127.0.0.1` bezeichnet im Container den Container selbst. Für einen Dienst auf dem Docker-Host verwende eine vom Container erreichbare Host-/LAN-Adresse oder einen entsprechend eingerichteten Hostnamen. Andere Docker-Dienste lassen sich über ein gemeinsames Docker-Netzwerk und ihren Servicenamen erreichen. Die lokale Vorschau ohne Container kann dagegen `127.0.0.1` des Rechners direkt verwenden.

### Administratorzugriff auf Benutzerverzeichnisse

Unter **Computer → Windows (C:) → Users** sehen Administratoren auch die Verzeichnisse anderer aktiver Benutzer. Sie können diese öffnen und Dateien ansehen. Fremde Dateien bleiben schreibgeschützt. Normale Benutzer sehen weiterhin nur ihre eigenen privaten Verzeichnisse und die sonst für sie freigegebenen Bereiche. Persönliche Programme anderer Benutzer erscheinen dadurch nicht automatisch im eigenen Startmenü.

Die Adresse `/` öffnet nur den Desktop. Apps lassen sich direkt starten: `/explorer`, `/notepad`, `/vlc`, `/fotoanzeige`, `/browser` und `/papierkorb`. Ein vollständiger Dateipfad dahinter öffnet den Inhalt in der gewählten App, zum Beispiel `/notepad/C/Users/admin/Documents/Notiz.txt` oder `/vlc/D/Filme/Video.mp4`. Leerzeichen werden in Links als `%20` geschrieben. Anmeldung und Freigaberechte gelten unverändert.

- Alles im Ordner **Desktop** erscheint auch auf dem Desktop. Dateien, Ordner und Internetverknüpfungen öffnen sich per Doppelklick. Änderungen vom Host werden beim nächsten automatischen Abgleich sichtbar.
- Symbole lassen sich im Raster verschieben. Ein belegter Platz tauscht die beiden Symbole. Mit **Alt + Pfeiltasten** geht es auch per Tastatur. Die Positionen werden im Benutzerkonto gespeichert und nach dem Anmelden wiederhergestellt. Rechtsklick auf den Desktop bietet eine automatische Anordnung.
- Notepad++, Fotoanzeige und VLC lassen sich im Startmenü ohne Datei starten. Über **Öffnen** oder Rechtsklick → **Datei öffnen** wählst du eine Datei aus dem Explorer-Speicher. Neue Texte werden mit **Speichern unter** in einem gewählten Ordner gespeichert.
- Unter **Computer → Windows (C:) → Programme** kannst du Internetverknüpfungen anlegen. Sie erscheinen automatisch im Startmenü, auch wenn sie in Unterordnern liegen. Die Suche findet Programme und sichtbare Dateien.
- Die Häkchen **Im eigenen Fenster** und **Als App öffnen** bestimmen, ob eine Verknüpfung im externen Tab, als Website-Fenster oder nur mit App-Fensterrahmen startet. Für andere Docker-Apps muss die URL im Browser erreichbar sein und die App eine Einbettung erlauben.
- Leere gewöhnliche Ordner und Ordner mit sichtbarem Inhalt haben unterschiedliche Symbole.

### Speicherorte und mehrere Benutzer

Die persönlichen Ordner liegen unter `/Explorer/Users/<Benutzer>/Desktop`, `Documents`, `Downloads`, `Music`, `Pictures`, `Videos` und `Programme`. Der neue gemeinsame Speicherbereich **C:/Programme** liegt auf dem Host unter **`/Explorer/Programme`**. Die Programme unter **C:/Programme** erscheinen für alle angemeldeten Benutzer im Startmenü. Unter **C:/Users/<Benutzer>/Programme** liegen persönliche Programme, die nur im Startmenü dieses Benutzers erscheinen. Öffentliche Gäste sehen weiterhin ausschließlich freigegebene Einträge; fremde Einträge können nicht bearbeitet werden. Direkt auf dem Host angelegte Programmdateien werden dem Besitzer des Programme-Stammordners zugeordnet. Internetverknüpfungen werden über den Explorer angelegt und in der Datenbank gespeichert.

Wenn Explorer Share und Windows 7 Desktop parallel laufen, verwende **unterschiedliche Host-Datenordner und Ports**. Zwei laufende Container dürfen nicht dieselbe Datenbank bearbeiten. Für einen Umzug zuerst den alten Container stoppen, den gesamten Datenordner sichern und die Kopie mit dem neuen Projekt starten.

Programme lassen sich per Rechtsklick im Startmenü, auf einer Verknüpfung oder auf dem laufenden Taskleistensymbol anheften. „Von Taskleiste lösen“ entfernt die Anheftung. Sie bleibt pro Benutzer in diesem Browser nach dem Neuladen erhalten. Ein Klick aktiviert ein laufendes Fenster; Rechtsklick → „Neue Instanz öffnen“ startet ein weiteres. Editor, Fotoanzeige, Medienplayer und eingebettete Verknüpfungen unterstützen unabhängige Fenster.

Die Explorer-Pfadleiste bietet anklickbare Ordner, Unterordner-Menüs, Zurück/Vorwärts und eine Suche im aktuellen Ordner. Mit F4 in der Adressleiste oder einem Doppelklick auf ihre freie Fläche kannst du einen vorhandenen Pfad eingeben. Titelleisten, Fensterknöpfe und Rahmen verwenden Grafiken des Cinnamon-Themes; Quellen und Lizenz stehen in den Grafikhinweisen.

Die klassische Menüzeile lässt sich mit Alt oder über „Organisieren“ ein- und ausblenden. „Ansicht ändern“ wechselt zwischen Symbolen und Detailspalten. Unter „Computer“ erscheint das virtuelle Laufwerk C: als eigene Laufwerkskachel.

### Benutzerkonten und Hintergrund

Öffne **Start → Benutzerkonto**. Jeder Benutzer kann dort sein Kontobild auswählen oder ein eigenes Bild hochladen und seinen Desktop-Hintergrund ändern. Der Hintergrund und die Symbolpositionen werden im Konto gespeichert. Über **Rechtsklick auf den Desktop → Anpassen: Desktop-Hintergrund** erreichst du die Hintergrundauswahl direkt.

Administratoren sehen alle Konten, können neue Konten erstellen und zwischen den Gruppen **Benutzer** und **Administratoren** wechseln. Zum Entfernen eines Kontos wählst du das Konto und anschließend **Konto löschen**. Die Anmeldung und seine öffentlichen Freigaben werden gesperrt. Die Dateien unter `/Explorer/Users/<Benutzer>` bleiben auf dem Host erhalten. Das eigene Konto kann nicht gelöscht werden; mindestens ein Administrator bleibt erhalten.

### Internet Explorer im Desktop

**Internet Explorer** lässt sich direkt im Startmenü öffnen und per Rechtsklick an die Taskleiste anheften. Über **Neue Instanz öffnen** startest du ein weiteres Browserfenster. Die gemeinsame Startseite und die Home-Tasten führen zu `https://xserverx.app/`. Verknüpfungen im Fenstermodus öffnen ihre eigene Adresse; im App-Modus bleibt nur der Rahmen sichtbar.

Favoriten sind nach Benutzer getrennt und werden bei angemeldeten Benutzern im Konto gespeichert. Über den Stern öffnest du die Favoritenliste; das **× neben einem Favoriten** entfernt ihn wieder. Gäste verwenden eine getrennte Favoritenliste in ihrem Browser.

### Öffentlicher Share-Desktop

Der öffentliche Desktop unter `/C/Users/share/` zeigt im Startmenü **Login**. Besucher können Programme und freigegebene Dateien öffnen, aber keine Symbole verschieben, Programme anheften oder den Hintergrund ändern. Alte lokale Anpassungen von Gästen werden ignoriert. **Abmelden** führt zur Login-Seite; dort öffnet **Öffentlichen Share-Desktop öffnen** die Besucheransicht.

Zum Gestalten des gemeinsamen Desktops meldest du dich mit deinem Administratorkonto an und wählst auf der Login-Seite **Share-Desktop bearbeiten**. In diesem Modus werden Anordnung, Hintergrund und angeheftete Programme als gemeinsame Vorgabe gespeichert. Erkennbar ist er an **share (Bearbeitung)** im Startmenü. Es gibt kein öffentliches Share-Kennwort. Die Dateien der Share-Ansicht werden weiterhin über die Freigaben der persönlichen Konten verwaltet.

Der Explorer unterstützt mehrere unabhängige Fenster. Starte ihn erneut im Startmenü, nutze **Rechtsklick auf sein Taskleistensymbol → Neue Instanz öffnen**, **Datei → Neues Explorer-Fenster** oder **Strg+N**. Jedes Fenster behält seine eigene Navigation, Suche und Auswahl; geöffnete Dateien erscheinen als eigene App-Fenster auf dem Desktop.

### Echter Speicherplatz bei C:

Unter **Computer → Windows (C:)** zeigt der Explorer Gesamtgröße und freien Speicher des Dateisystems an, auf dem der konfigurierte Explorer-Datenordner liegt. Der Balken stellt die Belegung dar und wird ab 90 % rot. Bei einem Bind-Mount `/Explorer:/Explorer` stammen die Werte vom zugehörigen Host-Dateisystem; es ist keine Summe der hochgeladenen Dateien. Berücksichtigt wird der für den Container-Benutzer verfügbare Speicher. Die Anzeige aktualisiert sich beim Öffnen und bei sichtbarer Computer-Ansicht etwa alle 30 Sekunden.

Die Hintergrundauswahl unter **Anpassung** zeigt mitgelieferte Motive und bereits verwendete eigene Bilder als Vorschaukacheln. Hochgeladene Hintergründe liegen im Metadatenordner unter `wallpapers/` und bleiben mit der vollständigen `/Explorer`-Sicherung erhalten. Eigene Galerien sind pro Konto geschützt; beim Share-Desktop ist nur der aktuell ausgewählte Hintergrund öffentlich abrufbar. Die Pfadleiste und die Zurück-Schaltfläche der Benutzerverwaltung führen zwischen den Ansichten zurück.

Die Galerie enthält außerdem die 31 regulären und 108 regionalen Original-Windows-7-Hintergründe aus dem referenzierten Windows-UI-Assets-Archiv. Über **Bildkategorie** filterst du z. B. Natur, Landschaften oder ein Land. Die Auswahl lädt kleine Vorschauen und verwendet beim Anwenden die unveränderte Originaldatei.

Eigene hochgeladene Hintergründe lassen sich in **Anpassung → Eigene Hintergründe → Aus Auswahl löschen** entfernen. Mitgelieferte Motive haben keine Löschfunktion. Die Aktion betrifft nur die jeweilige Galerie. Wird der gerade aktive eigene Hintergrund entfernt, stellt die Anwendung den Windows-7-Standardhintergrund wieder her.
