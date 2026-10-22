# Office im Windows-7-Desktop (optional)

Die optionale Integration verwendet Collabora Online Development Edition (CODE).
Word-, Excel-, PowerPoint- und OpenDocument-Dateien können damit in einem eigenen Desktop-Fenster
geöffnet werden. Speichern schreibt die Datei in ihren ursprünglichen Explorer-Ordner zurück.
Es wird keine Microsoft-Office-Installation benötigt.

**Teststand:** Die WOPI-Schnittstelle wird automatisiert mit einem Discovery-Testserver getestet:
Dateirechte, Speichern, Sperren, externe Änderungen, Freigabewiderruf und Abmelden.
In der lokalen Entwicklungsumgebung ist Docker nicht installiert. Ein vollständiger Test mit dem
echten CODE-Container, Dokumentdarstellung, Formularaufruf und WebSockets steht daher noch aus.
Die Office-Anbindung ist optional und wird mit `compose.office.yaml` eingeschaltet.
CODE ist die Entwicklungsedition von Collabora; siehe die [Herstellerinformationen](https://www.collaboraonline.com/de/code/).

## Später mit office.xserverx.app starten

Die bestehende Explorer-Installation und ihre Daten bleiben erhalten. Ergänze in ihrer `.env`:

```dotenv
OFFICE_URL=https://office.xserverx.app
EXPLORER_PUBLIC_URL=https://explorer.xserverx.app
COLLABORA_SERVER_NAME=office.xserverx.app
COLLABORA_BIND_ADDRESS=127.0.0.1
COLLABORA_PORT=9980
COLLABORA_SSL_TERMINATION=true
```

Beide öffentlichen Adressen müssen genau der Adresse entsprechen, die du im Browser verwendest.
Nicht zwischen HTTP-IP-Adresse und HTTPS-Domain wechseln, wenn du Office testest.

Starte aus dem Projektordner:

```bash
docker compose -f compose.yaml -f compose.office.yaml up --build -d
```

Verwendest du weitere Dateien, beispielsweise `compose.bind.yaml` oder `compose.drives.yaml`,
gib diese wie bisher zusätzlich an. **Bei späteren Updates und Neustarts die Office-Datei immer mit angeben.**
Der CODE-Container ist auf eine konkrete Image-Version mit Prüfsumme festgelegt.
Er benötigt kein direktes Mount des Explorer-Datenordners und kein Docker-Datenvolume.

Lege anschließend den DNS-Eintrag `office.xserverx.app` für deinen Server an und richte im
vorhandenen Reverse-Proxy einen HTTPS-Host ein:

- Domain: `office.xserverx.app`
- Ziel: HTTP, Docker-Host, Port `9980`
- WebSockets einschalten; alle Pfade unverändert weiterleiten, einschließlich `/browser`, `/hosting` und `/cool`.
- HTTPS-Zertifikat aktivieren; ausreichend lange WebSocket-Zeitlimits verwenden.

Die voreingestellte Bind-Adresse `127.0.0.1` funktioniert, wenn der Reverse-Proxy direkt auf dem
Docker-Host läuft. Läuft er selbst in einem anderen Container oder auf einem anderen Rechner,
verwende eine passende erreichbare Host-Bind-Adresse oder ein gemeinsames Docker-Netzwerk.
`127.0.0.1` innerhalb eines Reverse-Proxy-Containers ist dessen eigene Loopback-Adresse.

Der Explorer erreicht Collabora intern über `http://collabora:9980/hosting/discovery`.
Collabora liest und speichert Dateien intern über `http://explorer:3000/wopi/files/...`.
Diese internen Adressen sind auf das Compose-Netz beschränkt; der Browser verwendet die Office-Domain.
Der konfigurierte WOPI-Host ist fest erlaubt. Eine beliebige LAN-Proxy-Funktion wird nicht eingebaut.

## Auf einem Docker-Host ohne Domain lokal ausprobieren

Für einen LAN-Test kannst du in `.env` stattdessen beispielsweise diese Werte eintragen.
Ersetze `192.168.1.50` durch die LAN-IP deines Docker-Hosts und passe Port `3000` an deine Installation an:

```dotenv
EXPLORER_BIND_ADDRESS=0.0.0.0
OFFICE_URL=http://192.168.1.50:9980
EXPLORER_PUBLIC_URL=http://192.168.1.50:3000
COLLABORA_SERVER_NAME=192.168.1.50:9980
COLLABORA_BIND_ADDRESS=0.0.0.0
COLLABORA_PORT=9980
COLLABORA_SSL_TERMINATION=false
```

Für die Anmeldung über HTTP muss `COOKIE_SECURE=0` sein. Danach den Compose-Startbefehl oben verwenden
und `http://192.168.1.50:3000` öffnen. Beim späteren Umstieg auf HTTPS die Domain-Werte verwenden.

## Benutzung und Dateirechte

- Office-Dateien mit Doppelklick öffnen. Ohne Office-Konfiguration bleibt der Dateidownload verfügbar.
- Im Startmenü erscheinen Word, Excel und PowerPoint.
  Der Start öffnet ein temporäres neues Dokument. Neue Dateien werden als `.odt`, `.ods` und `.odp` angelegt.
  Word-, Excel- und PowerPoint-Dateien behalten beim Bearbeiten ihre vorhandene Dateiendung.
- Die unterstützten Formate werden zusätzlich anhand der Collabora-Discovery geprüft.
  Makros und die originalgetreue Darstellung komplexer Microsoft-Office-Dateien sind nicht garantiert.
- Der Besitzer kann bearbeiten. Administratoren lesen fremde Benutzerdateien wie bisher schreibgeschützt.
  Im ausdrücklich aktivierten Share-Bearbeitungsmodus können öffentliche Dateien bearbeitet werden.
- Gäste erhalten nur Lesezugriff auf freigegebene Dateien. Aufheben der Freigabe beendet diesen Zugriff.
  Abmelden beendet die zugehörigen angemeldeten Office-Berechtigungen.
- **Speichern** übernimmt die Arbeitskopie in den gewählten Ordner bzw. das vorhandene Original.
  Nach Änderungen fragt der Schließen-Knopf nach Speichern, Nicht speichern oder Abbrechen.
  Bei einem Speicherfehler bleibt das Fenster offen.
- Die Office-Berechtigung gilt höchstens acht Stunden und endet spätestens mit der Explorer-Anmeldung.
  Bei Ablauf die Datei nach erneuter Anmeldung wieder öffnen.
- Die Dateigröße ist auf 64 MB begrenzt. Gleichzeitiges Bearbeiten von Host-Dateien außerhalb des Explorers
  wird nicht gesperrt; vor dem nächsten Office-Speichern erkennt ein Inhaltsvergleich solche Änderungen
  und verweigert das Überschreiben.

## Wo die Daten liegen

Dokumente bleiben im bisherigen Host-Pfad unter `/Explorer`, auch auf eingebundenen Zusatzlaufwerken.
Office-Schreibsperren liegen in `/Explorer/.explorer/office-locks.json` und werden mitgesichert.
Es wird kein zweiter Dokumentbestand bei Collabora angelegt. Dessen Verarbeitungscaches sind temporär.

Während eine Datei in Office gesperrt ist, sind Schreiben im normalen Editor sowie Umbenennen,
Verschieben und Löschen der Datei oder ihres übergeordneten Ordners blockiert. Die Sperre ist
standardmäßig 30 Minuten gültig und wird vom Office-Client erneuert. Nach einem unerwarteten
Container-Neustart kann eine Sperre bis zu ihrem Ablauf bestehen bleiben.
Lesezugriff und Kopieren sind weiterhin möglich. Vor Updates alle Office-Dokumente speichern und schließen.

## Prüfen und Fehler eingrenzen

```bash
docker compose -f compose.yaml -f compose.office.yaml ps
docker compose -f compose.yaml -f compose.office.yaml logs --tail=100 collabora explorer
curl --fail https://office.xserverx.app/hosting/discovery
```

Für den ersten echten Test: kleine `.docx`, `.xlsx` und `.pptx` hochladen, jeweils öffnen, ändern,
speichern und erneut herunterladen. Zusätzlich neue `.odt`, `.ods` und `.odp` erstellen und erneut öffnen.
Danach als nicht angemeldeter Besucher prüfen, dass eine freigegebene Datei nur lesbar ist.

**Office noch nicht erreichbar:** Office-Adresse, laufenden Container und Discovery prüfen.
**Leeres oder blockiertes Fenster:** DNS, HTTPS und erlaubte Einbettung prüfen. In der Compose-Datei wird
der Explorer-Ursprung als `net.frame_ancestors` übergeben; die Kompatibilität mit der festgelegten
CODE-Version muss beim ersten echten Container-Test geprüft werden.
**Dokument lädt, Verbindung bricht ab:** WebSocket-Unterstützung und Zeitlimits des Reverse-Proxys prüfen.
**Sperrkonflikt:** Andere Office-Sitzung ordentlich schließen; nach einem Absturz den Ablauf abwarten.

Für die Schnittstelle gelten die [WOPI-Operationen](https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/rest/)
und die [Collabora-Integrationshinweise](https://www.collaboraonline.com/integrate-collabora-online/).

## Neue Dokumente und Vorlagen

Die Programme heißen Word, Excel und PowerPoint; die Bearbeitung übernimmt Collabora Online. Beim Start als angemeldeter Benutzer öffnet sich sofort ein neues temporäres ODT-, ODS- oder ODP-Dokument. Erst Datei → Speichern fragt nach Dateiname und Zielordner. Automatische Zwischenspeicherungen legen keine sichtbaren Explorer-Dateien an.

Datei → Aus Vorlage öffnet eine vorhandene passende ODT-/OTT-, ODS-/OTS- oder ODP-/OTP-Datei als neue Kopie. Der vorherige Entwurf wird nach Bestätigung verworfen; die Vorlage bleibt unverändert. Nicht gespeicherte Entwürfe werden beim Schließen verworfen, nach Abmeldung bereinigt und spätestens beim Serverneustart entfernt. Öffentliche Besucher können weiterhin nur freigegebene Dateien lesen.

Direktstart: `/word`, `/excel`, `/powerpoint`; die bisherigen Aliase `/writer`, `/calc`, `/impress` bleiben verfügbar.

Ohne Änderungen schließt das Fenster direkt. Nach Änderungen fragt es nach Speichern, Nicht speichern oder Abbrechen. Auch vorhandene bearbeitbare Dateien werden zunächst als private Arbeitskopie geöffnet: Nicht speichern lässt das Original unverändert. Beim ausdrücklichen Speichern werden zwischenzeitliche Änderungen erkannt und nicht überschrieben.
