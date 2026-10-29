# Remotedesktopverbindung

Eigene Anwendung im Windows-Desktop, erreichbar über `/rdp`, `/mstsc` oder das Startmenü. Die Oberfläche orientiert sich an Windows 7. Der separate Node-Dienst verwaltet Profile und Sitzungen; Apache Guacamole (`guacd`) übernimmt das RDP-Protokoll. Der Desktop bindet ausschließlich die authentifizierte HTTP-Schnittstelle ein. Weder `guacd` noch der RDP-Dienst veröffentlichen einen Host-Port.

## Start

In der vorhandenen, nicht versionierten `.env` setzen:

```dotenv
RDP_SERVICE_SECRET=<mindestens 32 zufällige Zeichen>
RDP_ALLOWED_TARGETS=mein-pc.example.net:3389,192.168.1.20:3389
```

Das Geheimnis beispielsweise mit `openssl rand -hex 32` erzeugen. `compose.rdp.yaml` zusätzlich zu den vorhandenen Compose-Dateien aktivieren. Beispiel für den Desktop allein:

```sh
docker compose -f compose.yaml -f compose.rdp.yaml up -d --build
```

Bei vorhandenem `COMPOSE_FILE` die Datei mit Doppelpunkt ergänzen. Leere Ziel-Liste erlaubt keine Verbindungen. Namen und Ports müssen exakt übereinstimmen. `*` erlaubt ausdrücklich beliebige Ziele und sollte nur in einer dafür vorgesehenen Umgebung verwendet werden. Die Zielcomputer müssen vom Docker-Host erreichbar sein und RDP erlauben; ein Browser kann keinen privaten Rechner erreichen, auf den der Server keinen Netzwerkzugriff hat.

Ein Reverse-Proxy muss `/api/rdp/stream` ohne Pufferung und Kompression durchreichen und lang laufende Antworten zulassen (`proxy_buffering off`, `proxy_read_timeout 9h` bei nginx). Die Anwendung sendet `X-Accel-Buffering: no` und `Cache-Control: no-transform`. TLS für den öffentlichen Desktop verwenden.

## Funktionen

- Profile pro persönlichem Desktop-Konto; Share-Gäste erhalten keinen Zugriff.
- Computer, Port, Benutzer, Domäne, Auflösung, Farbtiefe und NLA/TLS-Auswahl.
- Kennwort nur auf Wunsch speichern. Profile liegen mit AES-256-GCM verschlüsselt im Volume; den Schlüssel im selben Volume bei Backups mitnehmen. Kennwörter werden niemals an den Browser zurückgegeben. Bei Wechsel von Ziel oder Benutzer wird ein gespeichertes Kennwort nicht übernommen.
- `.rdp` öffnen und ohne Kennwort exportieren.
- Tastatur/Maus, Vollbild, Strg+Alt+Entf, optionale Text-Zwischenablage und Ton.
- Verbindung bei Sperren, Abmelden oder Schließen beenden. Die Arbeitsstand-Wiederherstellung öffnet den Dialog mit Einstellungen, ohne Kennwort und ohne automatische Neuverbindung.

Zertifikatsprüfung ist standardmäßig aktiv. Für selbst signierte Zertifikate muss der Benutzer die entsprechende Option bewusst einschalten. Dateiübertragung, Drucker, Mikrofon und Smartcards sind nicht implementiert. Computeradressen unterstützen derzeit Hostnamen und IPv4. Dies ist eine Webanwendung mit Guacamole, keine Ausführung von `mstsc.exe` im Browser.

## Prüfung

```sh
node --test services/remote-desktop/test.mjs
```

Die Tests prüfen verschlüsselte Speicherung, Benutzertrennung, Ziel-Freigaben, signierte API-Anfragen und die Guacamole-TCP-Aushandlung. Ein Protokoll-Test ersetzt keinen Verbindungstest mit einem echten RDP-Server.

Guacamole-JavaScript 1.6.0 ist unter Apache-2.0 eingebunden; Herkunft und Lizenz befinden sich in `public/guacamole/`.

## Isolierter echter RDP-Test

`compose.rdp-test.yaml` startet einen wegwerfbaren xrdp-Server mit xterm, Guacamole und dem Broker in einem internen Docker-Netz ohne veröffentlichte Ports. Die bekannten Test-Zugangsdaten gelten nur für diesen Container. Nicht für echte Daten verwenden.

```sh
docker compose -p rdp-integration -f compose.rdp-test.yaml up -d --build
# Nach dem Start der Dienste:
docker compose -p rdp-integration -f compose.rdp-test.yaml exec -T remote-desktop node --input-type=module < scripts/rdp-smoke.mjs
docker compose -p rdp-integration -f compose.rdp-test.yaml down
```

Validiert am 29.10.2026: 114 Desktop-Tests, fünf RDP-Diensttests und 25 Mail-/Messenger-Tests erfolgreich. Zusätzlich erfolgreicher Login gegen den isolierten xrdp-Testserver über Guacamole 1.6.0, Bildschirm-Synchronisierung und Tastatureingabe. Ein echter Windows-Zielrechner stand für den Test nicht zur Verfügung.
