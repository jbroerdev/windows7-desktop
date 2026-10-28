# Windows Live Mail 2012

Eigenständiger IMAP/SMTP-Dienst mit einer in den Windows-Desktop integrierten Oberfläche. Messenger und Discord gehören nicht zu diesem Dienst.

## Start in Docker

1. Einen zufälligen gemeinsamen Schlüssel erzeugen, z. B. `openssl rand -hex 32`.
2. Den Wert als `MAIL_SERVICE_SECRET` in der bestehenden `.env` hinterlegen. Er gehört ausschließlich in die Serverkonfiguration.
3. `docker compose -f compose.yaml -f compose.mail.yaml up -d --build` ausführen.

Der Mail-Dienst benötigt keine öffentlich freigegebenen Ports und keine zusätzliche Domain. Der Desktop vermittelt die Anfragen über `/api/live-mail/`. Der Dienst ist im Compose-Netz unter `live-mail:3001` erreichbar. Zugangsdaten dürfen nur über HTTPS oder einen vertrauenswürdigen lokalen Zugang eingegeben werden.

Die Oberfläche startet über **Windows Live Mail** im Startmenü oder `/live-mail` bzw. `/wlmail`. Ein persönliches Windows-Benutzerkonto ist erforderlich; der öffentliche Share-Desktop erhält keinen Zugriff auf Postfächer.

## Postfach einrichten

Unter **Konten → E-Mail** Adresse, Kennwort, Anzeigename und anschließend die Server eintragen. Unterstützt werden:

- IMAP mit SSL/TLS oder verpflichtendem STARTTLS.
- SMTP mit SSL/TLS oder verpflichtendem STARTTLS, denselben Zugangsdaten wie IMAP.
- Mehrere Konten pro Windows-Benutzer.
- Speicherung des Kennworts oder nur temporäre Aufbewahrung bis zum Neustart des Mail-Dienstes.

Es wird eine Verbindung zu beiden Servern geprüft, bevor das Konto gespeichert wird. Bei deaktiviertem „Kennwort speichern“ muss nach einem Dienstneustart über die Kontoeigenschaften das Kennwort erneut eingetragen werden.

Microsoft-/Google-OAuth, getrennte SMTP-Zugangsdaten, POP3, Kontakte, Feeds und Newsgroups sind noch nicht implementiert. Kalender werden lokal geführt und können zum Abonnieren veröffentlicht werden; ein Google-Kalender wird nicht über das Mail-App-Passwort synchronisiert. Die alten Windows-Live-/DeltaSync-Dienste werden nicht verwendet. Für Anbieter, die ein App-Kennwort unterstützen, kann dieses bei IMAP/SMTP verwendet werden; sonst ist eine zusätzliche OAuth-Anbindung erforderlich.

Die Kontoeigenschaften bieten die Registerkarten Allgemein, Server, Sicherheit, Erweitert und IMAP. Kontoname, Absender, Server, Ports und Verschlüsselung sind bearbeitbar; spezielle Ordner für Gesendet, Papierkorb und Junk können ausgewählt werden. Externe aktive Inhalte bleiben aus Sicherheitsgründen blockiert. Das Dateimenü enthält Neu, Speichern/EML-Export, Drucken, EML-Import, Optionen → E-Mail-Konten, Info und Beenden. IMAP-Import schreibt die ausgewählten Dateien in den gewählten Serverordner und erfordert einen Klick auf „Importieren“. Teilweise abgeschlossene Importe werden als solche gemeldet. Die Ansicht bietet das Lesebereich-Menü, Kalenderbereich, kompakte Ansicht, Schnellansichten und Statusleiste.

## Lokale Kalender und Abonnements

Die Kalenderansicht funktioniert auch ohne eingerichtetes Mailkonto. Pro Windows-Benutzer gibt es einen voreingestellten lokalen Kalender; weitere Kalender mit Name, Farbe und Zeitzone lassen sich hinzufügen. Termine lassen sich in Monats-, Wochen- und Tagesansicht erstellen, bearbeiten, einem Kalender zuordnen, löschen und über „Rückgängig“ wiederherstellen. Beim Erstellen wird der Zielkalender gewählt. Ganztägige Termine haben ein exklusives Enddatum (der erste Tag nach dem Termin). Wiederholungsregeln, Einladungen und Erinnerungen sind noch nicht implementiert.

Unter **Veröffentlichen** kann der Benutzer einzelne Kalender schreibgeschützt freigeben. Die erzeugte Adresse `/caldav/<zufälliger-token>/` lässt sich als CalDAV-Kalender oder iCalendar-Abonnement verwenden. GET liefert den gesamten Kalender als ICS, GET einzelner `.ics`-Ressourcen liefert einzelne Termine. PROPFIND unterstützt Principal-/Kalendererkennung und Ressourcen mit ETags; REPORT unterstützt `calendar-query` mit Zeitfilter und `calendar-multiget`. Abonnenten erhalten nur Lesezugriff; Schreibmethoden sind gesperrt. DAV-Sync-Token, Schreibzugriff und alle erweiterten CalDAV-Berichte werden nicht unterstützt. Abfrage/Export, Benutzertrennung und Widerruf sind automatisiert getestet; eine Kompatibilitätsprüfung mit allen externen Kalenderprogrammen steht noch aus.

Die Freigabeadresse enthält einen zufälligen Zugriffsschlüssel: Wer die Adresse kennt, kann diesen Kalender einschließlich Beschreibungen und Orten lesen. Ohne ausdrückliche Freigabe ist kein Kalender öffentlich. **Freigabe beenden** widerruft die Adresse; erneutes Freigeben erzeugt eine neue. Bereits von Abonnenten heruntergeladene Kopien können nicht zurückgerufen werden.

Andere Geräte benötigen eine erreichbare HTTPS-Adresse des Desktops. Eine `127.0.0.1`-Adresse ist nur auf dem lokalen Rechner erreichbar. Reverse-Proxys müssen OPTIONS, PROPFIND und REPORT an `/caldav/` weiterreichen. Der Mail-Dienst bleibt intern; Zugang erfolgt über den bestehenden Desktop-Proxy. Lokale Kalender, Termine, Freigabezuordnung und Tokens werden im Mail-Datenvolume verschlüsselt gespeichert und zusammen mit `encryption.key` gesichert.

## Mailfunktionen

Ordner und Nachrichten werden über IMAP abgeglichen und im persönlichen verschlüsselten Servercache gespeichert; je Seite werden 50 Nachrichten angezeigt. Suche, Gelesen/Ungelesen, Kennzeichnung, neue Ordner, Verschieben in einen gewählten Ordner oder Papierkorb, Anhänge herunterladen und Antworten/Allen antworten/Weiterleiten sind vorhanden. Weiterleiten übernimmt die Anhänge. Entwürfe liegen verschlüsselt im persönlichen Dienstspeicher; während des Schreibens sowie beim Schließen und Sperren wird automatisch ein Entwurf gespeichert. Anhänge: höchstens 20 Dateien und zusammen 20 MB. Empfangene vollständige Nachrichten: höchstens 30 MB.

## Cache und Hintergrundabgleich

Beim Öffnen einer Nachrichtenliste lädt der Dienst die neuesten zehn Nachrichten bis jeweils 2 MB im Hintergrund vor, einschließlich ihrer MIME-Inhalte. Das verändert keine Gelesen-Markierung. Größere und ältere Nachrichten werden beim ersten Öffnen heruntergeladen und anschließend ebenfalls gecacht. Der erste Abruf eines noch nicht gecachten großen Anhangs benötigt weiterhin die Übertragung vom Mailanbieter. Ein vollständiger Download aller Postfächer beim Windows-Login findet nicht statt.

Nachrichtenlisten und Ordner erscheinen bei weiteren Aufrufen aus dem Cache. Listen werden nach 15 Sekunden, Ordner nach 60 Sekunden im Hintergrund erneuert. Die geöffnete und sichtbare Mail-App fragt alle zehn Sekunden nach; „Senden/Empfangen“ erzwingt den Listenabgleich. Dabei werden UIDs auf Zugänge und entfernte Nachrichten geprüft, vorhandene Kopfzeilen wiederverwendet und nur fehlende Kopfzeilen sowie aktuelle Flags übertragen. Es handelt sich um einen UID-basierten Abgleich, nicht um einen vollständigen CONDSTORE/QRESYNC-Synchronisierer. UIDVALIDITY trennt neu aufgebaute Postfächer von alten Cacheinhalten.

IMAP-Verbindungen werden wiederverwendet und nach 20 Sekunden ohne Auftrag geschlossen. Vorabdownloads verwenden eine eigene Verbindung, damit sie das Öffnen anderer Mails nicht blockieren. Bereits gecachte MIME-Inhalte werden für Anzeige, Anhänge und Weiterleitung gemeinsam verwendet. Gelesen-Markierungen werden beim Öffnen im Hintergrund übertragen.

Der Cache bleibt über Dienstneustarts erhalten und liegt unter `MAIL_DATA_DIR/cache`, mit AES-256-GCM verschlüsselt und nach Windows-Benutzer und Mailkonto getrennt. Pro Windows-Benutzer werden höchstens 128 MB verschlüsselte Cachedateien und 2.000 Einträge gehalten; bei Erreichen der Grenze entfallen die ältesten Einträge und werden bei Bedarf erneut heruntergeladen. Kontoeigenschaften ändern oder ein Konto aus der App entfernen verwirft dessen Cache. Bei einem Konto ohne gespeichertes Kennwort ist nach einem Dienstneustart auch für Cachezugriffe eine erneute Anmeldung erforderlich.

Der Versand erfolgt über SMTP. Anschließend wird eine Kopie per IMAP in „Gesendet“ abgelegt. Scheitert nur das Ablegen, wird der bereits erfolgte Versand klar gemeldet und nicht automatisch wiederholt. Es gibt keine automatische Versandwiederholung.

Nachrichten-HTML wird serverseitig bereinigt und in einem gesonderten Sandbox-Frame dargestellt. Externe Bilder, Skripte und Formulare sind gesperrt. Entwürfe und Konten werden nie an andere Windows-Benutzer ausgegeben. Der Ordner „Entwürfe“ der App ist lokal; serverseitige IMAP-Entwürfe werden als zusätzlicher normaler Ordner angezeigt.

## Speicherung und Sicherung

Das Docker-Volume `live-mail-data` enthält pro Benutzer eine mit AES-256-GCM verschlüsselte Datei. Der Dienst erzeugt einmalig `encryption.key`. **Volume und Schlüssel zusammen sichern**; ohne diesen Schlüssel können vorhandene Konten und Entwürfe nicht entschlüsselt werden. Der Schlüssel liegt im persistenten Dienstvolume, nicht im Browser oder Quellcode. Die Verschlüsselung schützt Dateien im Ruhezustand; ein Administrator mit Zugriff auf Dienst und Schlüssel kann sie entschlüsseln.

Interne Anfragen sind per HMAC an Benutzerkennung, Zeit, Methode, Pfad und Inhalt gebunden. Die Benutzerkennung stammt aus der geprüften Windows-Sitzung und kann nicht im Browser frei gewählt werden. Der Dienst verwirft unsignierte oder mehr als 30 Sekunden alte Anfragen.

## Entwicklung und Tests

`pnpm --dir services/live-mail install --ignore-workspace`

`node --test services/live-mail/test.mjs`

`MAIL_SERVICE_SECRET` identisch für Desktop und Dienst setzen, `MAIL_SERVICE_URL` im Desktop auf den Dienst richten. Der Dienst verwendet `MAIL_PORT` (Standard 3001), `MAIL_HOST` und `MAIL_DATA_DIR`.

Die Diensttests verwenden kontrollierte IMAP-/SMTP-Adapter und prüfen Benutzertrennung, verschlüsselte Speicherung, Wiederöffnung, MIME/Anhänge, Entwürfe, Flags, Papierkorb, Versand und Signaturen. Eine echte Zustellung an einen externen Anbieter ist erst nach Einrichtung eines echten Postfachs prüfbar.

Primärdokumentation: [ImapFlow](https://imapflow.com/docs/api/imapflow-client/), [Nodemailer SMTP](https://nodemailer.com/smtp), [MailParser](https://nodemailer.com/extras/mailparser).

Die Docker-Konfiguration wurde vorbereitet; ein Docker-Build konnte auf dem lokalen Windows-Arbeitsplatz ohne Docker-CLI nicht ausgeführt werden. Die lokale Vorschau läuft als zwei getrennte Node-Prozesse.

## Gmail mit App-Passwort

Adressen mit `@gmail.com` oder `@googlemail.com` werden automatisch erkannt. Für Google Workspace mit eigener Domain im Assistenten „Gmail (App-Passwort)“ wählen. Voreinstellung: `imap.gmail.com:993` mit SSL/TLS und `smtp.gmail.com:587` mit STARTTLS; Benutzername ist die vollständige E-Mail-Adresse. Gruppen-Leerzeichen beim eingefügten App-Passwort werden entfernt.

Gmail erfordert hier ein App-Passwort statt des normalen Google-Kennworts. Dafür muss die Bestätigung in zwei Schritten aktiv sein; nicht alle verwalteten oder besonders geschützten Konten erlauben App-Passwörter. Die Option „Dieses Kennwort speichern“ steuert weiterhin die dauerhafte verschlüsselte Speicherung. Google widerruft App-Passwörter beim Ändern des Google-Kennworts.

Quellen: [Google: App-Passwörter](https://support.google.com/mail/answer/185833?hl=de), [Google: IMAP und SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp).
