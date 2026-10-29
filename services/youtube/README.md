# YouTube im Desktop-Browser

Die Eingabe von `youtube.com`, `www.youtube.com` und `youtu.be` im Desktop-Browser Ã¶ffnet yt2009 Ã¼ber `/api/youtube/site`. Die sichtbare Adresse bleibt eine YouTube-Adresse. Der Dienst lÃ¤uft separat auf Port 3005 im internen Docker-Netz; der eigentliche yt2009-Server ist innerhalb des Containers an 127.0.0.1:3006 gebunden.

## Einrichtung

1. `node scripts/build-youtube.mjs` baut den geprÃ¼ften yt2009-Quellstand und die Schnittstelle. Docker und die installierten Projekt-AbhÃ¤ngigkeiten werden benÃ¶tigt. Der erste Bau lÃ¤dt Fonts, FFmpeg und die zusÃ¤tzlichen yt2009-Ressourcen.
2. In `.env` einen zufÃ¤lligen `YOUTUBE_SERVICE_SECRET` mit mindestens 32 Zeichen setzen. Das Geheimnis bleibt ausschlieÃŸlich auf dem Server.
3. `compose.youtube.yaml` an die bestehende `COMPOSE_FILE`-Liste anhÃ¤ngen und `docker compose up -d --build youtube explorer` ausfÃ¼hren.

Die benannten Volumes enthalten Konfiguration, Ressourcen und den begrenzten Mediencache. `YOUTUBE_CACHE_GB` begrenzt den Cache (Standard: 2 GB). Der Dienst hat keinen verÃ¶ffentlichten Host-Port. Die Desktop-Schnittstelle signiert alle Zugriffe mit HMAC und leitet keine Desktop-Anmeldecookies weiter.

## PersÃ¶nliche Abos

Abos liegen im Desktop-Datenverzeichnis unter `youtube/<SHA256-Nutzer-ID>.json`, gehÃ¶ren in das normale Datenbackup und Ã¼berleben Container-Neustarts. Die Nutzer-ID stammt aus der angemeldeten Desktop-Sitzung. Abonnieren und Abbestellen erfolgen als einzelne, serialisierte Ã„nderungen, damit parallele Tabs keine vollstÃ¤ndigen Listen gegenseitig Ã¼berschreiben. Die Cookie-/LocalStorage-Schnittstellen des alten Frontends werden nur im Arbeitsspeicher nachgebildet; sie speichern die Aboliste nicht im Browser. GÃ¤ste und Share-Sitzungen kÃ¶nnen ansehen, aber keine persÃ¶nlichen Abos speichern. Der Kopf der Seite zeigt „Signed in as“ mit dem Desktop-Benutzernamen. Es handelt sich um Desktop-Abos, nicht um eine Synchronisierung mit einem Google-Konto.

Die Wiedergabe verwendet standardmäßig Modern/SABR mit aktiviertem HD und bevorzugt 1080p, sofern das Video diese Auflösung anbietet. Ein Rechtsklick öffnet das Browser-Seitenmenü; Links und Bilder lassen sich darin in einer neuen Desktop-Registerkarte öffnen. Auch Strg-Klick und Mittelklick öffnen Links in Hintergrund-Tabs.

## Upstream und Wartung

Basis: [ftde0/yt2009](https://github.com/ftde0/yt2009), Apache-2.0, Version 1.32.4. Der Build prÃ¼ft das SHA-256 des Quellarchivs. Ã„nderungen an YouTube kÃ¶nnen Suche oder Videowiedergabe beeintrÃ¤chtigen; ein gesunder Container allein bestÃ¤tigt keine erfolgreiche Wiedergabe. Nach Updates daher Suche, Watch-Seite und tatsÃ¤chlichen Videostream testen. Keine Google-Zugangsdaten oder Cookies in die Konfiguration Ã¼bernehmen.

PrÃ¼fungen: `node --test youtube.test.mjs`.
