# Windows Live Messenger / Discord

Der Messenger läuft als eigener Node-/Docker-Dienst. Der Desktop vermittelt ausschließlich signierte Anfragen und bestimmt die Identität aus der Windows-Sitzung. Discord-Zugangsdaten gelangen nicht in den Browser. Live Mail bleibt ein eigener Dienst.

## Discord einrichten

1. Im [Discord Developer Portal](https://discord.com/developers/applications) eine Anwendung mit Bot erstellen. Unter **Bot → Privileged Gateway Intents** den **Message Content Intent** und **Server Members Intent** einschalten. Der erste erlaubt Kanalnachrichten zu lesen; der zweite liefert die Mitglieder für die Kontaktliste.
2. Den Bot auf den gewünschten Server einladen. Benötigte Rechte: **View Channels, Send Messages, Read Message History, Manage Webhooks, Manage Channels**. Keine Administratorrechte erforderlich. Für den bereits übergebenen Bot: [Einladungslink](https://discord.com/oauth2/authorize?client_id=1565001509752676382&scope=bot&permissions=536939536).
3. Zwei verschiedene Textkanäle anlegen, z. B. `desktop-community` und `share-community`. Kanalberechtigungen passend setzen; auch Discord-Mitglieder mit Kanalzugriff können dort mitlesen. Der Bot muss beide Kanäle sehen können.
4. In Discord den Entwicklermodus aktivieren, je Kanal **Kanal-ID kopieren**. Die IDs in `.env` hinterlegen:

```dotenv
MESSENGER_SERVICE_SECRET=<mindestens 32 zufällige Zeichen, für Desktop und Dienst gleich>
MESSENGER_PUBLIC_URL=https://desktop.example.org
DISCORD_BOT_TOKEN=<Bot-Token>
DISCORD_PERSONAL_CHANNEL_ID=<persönlicher Community-Kanal>
DISCORD_SHARE_CHANNEL_ID=<Share-Gast-Kanal>
```

Der übergebene Bot-Token liegt bereits in der lokal ignorierten `.env`. Nicht in Git übernehmen. Der Dienst erzeugt pro Kanal einen eigenen Webhook. Damit erscheinen ausgehende Nachrichten mit dem Windows-Profilnamen bzw. `[Gast] Wunschname`. Profilbilder werden beim Senden vom Desktop-Server aus dem vertrauenswürdigen Profil geladen und über den Bot bei Discord hinterlegt. Dafür ist keine öffentliche Desktop-URL nötig. Der Webhook sendet jede Nachricht mit der zu diesem Bild gehörenden Discord-Avatar-URL, sodass parallele Nutzer nicht das Bild des jeweils anderen erhalten. Bilder werden im Dienst nach ihrem Inhalt zwischengespeichert. Optional kann `MESSENGER_PUBLIC_URL` als öffentliche HTTPS-Adresse für die Profilbild-URLs gesetzt werden.


## Starten

```sh
docker compose -f compose.yaml -f compose.mail.yaml -f compose.messenger.yaml up -d --build
```

Ohne Live Mail `-f compose.mail.yaml` weglassen. Der Messenger benötigt keinen veröffentlichten Host-Port. Sein persistentes Volume enthält einen verschlüsselten Verlauf, Gastnamen und den zugehörigen Schlüssel. Für eine Wiederherstellung das gesamte Volume sichern. Der Desktop benötigt den Dienst über `MESSENGER_SERVICE_URL` und denselben `MESSENGER_SERVICE_SECRET`.

Anwendung im Startmenü **Windows Live Messenger**, oder über `/messenger`, `/live-messenger`, `/msn`, `/wlm`. Persönliche Nutzer verwenden ihren Windows-Namen und ihr Profilbild. Der Share-Desktop verwendet den separaten Gastkanal, auch wenn ein angemeldeter Nutzer ihn öffnet; vor dem Schreiben ist ein Gastname erforderlich. Bei deaktiviertem Share-Desktop sind Gastzugriffe gesperrt.

Die beiden Ausgangskanäle bleiben als gemeinsame Community-Chats erhalten. Zusätzlich erscheinen Desktop-Kontakte (nach ihrer ersten Messenger-Nutzung) und Discord-Mitglieder, die den jeweiligen Ausgangskanal sehen dürfen. Ein Klick auf einen Kontakt erstellt ein Einzelgespräch. Pro Teilnehmerpaar wird ein eigener Textkanal angelegt und wiederverwendet. Desktop-Teilnehmer müssen im selben persönlichen/Share-Bereich liegen. Discord-Kanäle verweigern `@everyone` den Zugriff und erlauben den Bot sowie den ausgewählten Discord-Teilnehmer. Discord-Administratoren können weiterhin alle Gesprächskanäle einsehen; es handelt sich nicht um Ende-zu-Ende-Verschlüsselung.

Der Dienst verwaltet maximal 200 Einzelgespräche, höchstens 100 pro Desktop-Teilnehmer. Im Gesprächsfenster und im Kontextmenü der Unterhaltung kann ein Teilnehmer die Sitzung nach einer Bestätigung endgültig löschen. Dabei werden Discord-Kanal und gespeicherter Messenger-Verlauf entfernt. `/deletesession` bietet in Discord dieselbe Funktion mit einer nur für den Aufrufer sichtbaren Bestätigung; zugelassen sind der angeschriebene Discord-Nutzer und Administratoren. Ein manuell in Discord gelöschter Gesprächskanal wird ebenfalls aus dem Messenger entfernt. Die gemeinsamen Ausgangskanäle sind von der Messenger-Löschfunktion ausgenommen. Die Oberfläche erlaubt acht gleichzeitig geöffnete Unterhaltungen. Die Kontaktliste zeigt bis zu 1.000 Discord-Mitglieder; große Server erfordern eine gezielte Kontaktsuche statt dieser einfachen Liste. Textnachrichten und eingehende Discord-Anhänge werden unterstützt. Bilder erscheinen als Vorschau, MP4/WebM/unterstützte Videos und Audiodateien mit Browser-Wiedergabesteuerung; andere Formate bleiben über einen Dateilink erreichbar. Nicht jeder Browser unterstützt jedes Videoformat. Abgelaufene Discord-Anhangslinks werden beim Öffnen serverseitig erneuert; Zugriff auf private Anhänge setzt dieselbe Gesprächsmitgliedschaft voraus wie der Verlauf. Discord-Bearbeitungen und Löschungen werden übernommen. Sprach-/Videoanrufe und ausgehende Datei-Uploads sind noch nicht implementiert.

## Ungelesen und Benachrichtigungen

Ungelesene Nachrichten werden pro Windows-Nutzer bzw. Gast und Unterhaltung gespeichert und in der Kontaktübersicht angezeigt. Nur eine sichtbare, aktive Unterhaltung gilt als gelesen; minimierte und geschlossene Gespräche behalten ihre Zähler. Eingehende Nachrichten in nicht aktiven Gesprächen spielen den unter **Sounds → Messenger: Nachricht empfangen** eingestellten Ton (Standard: Windows Chimes, klassisch). Stummschaltung und Systemlautstärke gelten weiterhin. Browser benötigen für die Audiowiedergabe gegebenenfalls eine vorherige Benutzerinteraktion.

Der Hintergrundabgleich läuft auch ohne geöffnetes Messenger-Fenster. Bei ungelesenen Nachrichten erscheint ggf. ein Messenger-Taskleistensymbol mit Zähler, blinkt begrenzt orange und bleibt anschließend hervorgehoben. Mehrere Tabs desselben Browserprofils koordinieren den Ton. Neue Nachrichten können unter einem anderen Browserprofil/Gerät weiterhin separat benachrichtigen. Der lokale Desktop muss für diese Benachrichtigungen geöffnet sein; native Betriebssystem-Pushnachrichten sind nicht eingerichtet.

## Synchronisierung und Grenzen

Beim Start liest der Bot die letzten 50 Nachrichten pro Community- und gespeichertem Gesprächskanal ein. Danach übernimmt er neue Nachrichten, Bearbeitungen und Löschungen über das Discord Gateway. Der Dienst hält bis zu 500 Nachrichten pro Kanal vor; die Oberfläche lädt anfangs die letzten 100 und danach nur Änderungen alle drei Sekunden. Änderungen/Löschungen während einer vollständigen Dienstunterbrechung werden nicht vollständig nachträglich abgeglichen. Namen und Bilder bereits gesendeter Beiträge bleiben dem damaligen Profil zugeordnet.

Ohne gültigen Bot und zwei erreichbare Kanäle bleibt die Anwendung im Einrichtungszustand und sendet keine Nachrichten. Kanal-IDs müssen verschieden sein. Einzelgespräche werden im Server und ggf. der Kategorie des jeweiligen Ausgangskanals angelegt. Nach Änderungen an Token, Rechten oder IDs den Messenger-Dienst neu starten. Bei fehlenden Rechten erscheint der Einrichtungsstatus; Zugangsdaten und Discord-Fehlerdetails werden nicht an den Browser gegeben.

## Lokal entwickeln und prüfen

```sh
pnpm --dir services/live-messenger install --ignore-workspace
pnpm test:messenger
node --test messenger-gateway.test.mjs
```

Für den lokalen Dienst `MESSENGER_SERVICE_SECRET`, `MESSENGER_PORT` (Standard 3002) und optional `MESSENGER_DATA_DIR` setzen, dann `node services/live-messenger/server.mjs`. Beim Desktop `MESSENGER_SERVICE_URL=http://127.0.0.1:3002` und denselben Schlüssel setzen. Ein ausdrücklich aktiviertes `MESSENGER_LOCAL_MODE=1` ermöglicht isolierte Tests ohne Discord; die Oberfläche kennzeichnet dies als lokalen Testbetrieb. Die Compose-Datei aktiviert diesen Modus nicht.

## Referenzen und Grafiken

Visuelle Vorlagen: [clrgia/windows-live-messenger](https://github.com/clrgia/windows-live-messenger) und [j0nat/Windows-Live-Messenger](https://github.com/j0nat/Windows-Live-Messenger). Die Anwendung ist eine eigenständige Webimplementierung. Die übernommenen originalen Microsoft-Messenger-Grafiken unter `public/icons/messenger/` stammen aus den `public/assets` der ersten Referenz; Microsoft-Produktgrafiken bleiben deren jeweiliges Eigentum. Es wird keine zusätzliche Lizenz für diese Grafiken behauptet. Dateiliste und Prüfsummen stehen in `scripts/messenger-assets.json`.

Discord-Implementierung nach [Webhooks](https://docs.discord.com/developers/resources/webhook) und [Gateway](https://docs.discord.com/developers/events/gateway).
