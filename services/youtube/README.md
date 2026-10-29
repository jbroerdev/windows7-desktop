# YouTube im Desktop-Browser

Die Eingabe von `youtube.com`, `www.youtube.com` und `youtu.be` im Desktop-Browser öffnet yt2009 über `/api/youtube/site`. Die sichtbare Adresse bleibt eine YouTube-Adresse. Der Dienst läuft separat auf Port 3005 im internen Docker-Netz; der eigentliche yt2009-Server ist innerhalb des Containers an 127.0.0.1:3006 gebunden.

## Einrichtung

1. `node scripts/build-youtube.mjs` baut den geprüften yt2009-Quellstand und die Schnittstelle. Docker und die installierten Projekt-Abhängigkeiten werden benötigt. Der erste Bau lädt Fonts, FFmpeg und die zusätzlichen yt2009-Ressourcen.
2. In `.env` einen zufälligen `YOUTUBE_SERVICE_SECRET` mit mindestens 32 Zeichen setzen. Das Geheimnis bleibt ausschließlich auf dem Server.
3. `compose.youtube.yaml` an die bestehende `COMPOSE_FILE`-Liste anhängen und `docker compose up -d --build youtube explorer` ausführen.

Die benannten Volumes enthalten Konfiguration, Ressourcen und den begrenzten Mediencache. `YOUTUBE_CACHE_GB` begrenzt den Cache (Standard: 2 GB). Der Dienst hat keinen veröffentlichten Host-Port. Die Desktop-Schnittstelle signiert alle Zugriffe mit HMAC und leitet keine Desktop-Anmeldecookies weiter.

## Persönliche Abos

Abos liegen im Desktop-Datenverzeichnis unter `youtube/<SHA256-Nutzer-ID>.json`, gehören in das normale Datenbackup und überleben Container-Neustarts. Die Nutzer-ID stammt aus der angemeldeten Desktop-Sitzung. Abonnieren und Abbestellen erfolgen als einzelne, serialisierte Änderungen, damit parallele Tabs keine vollständigen Listen gegenseitig überschreiben. Die Cookie-/LocalStorage-Schnittstellen des alten Frontends werden nur im Arbeitsspeicher nachgebildet; sie speichern die Aboliste nicht im Browser. Gäste und Share-Sitzungen können ansehen, aber keine persönlichen Abos speichern. Es handelt sich um Desktop-Abos, nicht um eine Synchronisierung mit einem Google-Konto.

## Upstream und Wartung

Basis: [ftde0/yt2009](https://github.com/ftde0/yt2009), Apache-2.0, Version 1.32.4. Der Build prüft das SHA-256 des Quellarchivs. Änderungen an YouTube können Suche oder Videowiedergabe beeinträchtigen; ein gesunder Container allein bestätigt keine erfolgreiche Wiedergabe. Nach Updates daher Suche, Watch-Seite und tatsächlichen Videostream testen. Keine Google-Zugangsdaten oder Cookies in die Konfiguration übernehmen.

Prüfungen: `node --test youtube.test.mjs`.
