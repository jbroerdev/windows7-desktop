# Isoliertes CPL-Integrationspaket, Worker 2

Nur Zentral integriert/veröffentlicht. Keine Produktdatei wurde überschrieben und keine Backendroute/Rechteprüfung geändert.

## Ausgabe

- `control-panel.js`: SHA256 `d440be865f2c0be5a684f60cac2b025f75ac4872c0bdefd5cb37ae78f5691a3b`
- `control-panel.css`: SHA256 `2479733964836765fe7e49c42eedc616b518f82abbf3228a5b5ca7dc24d83f34`
- Exakte Basis-/Modul-/Assethashes und externe Importe: `manifest.json`.

Bestätigte Produktionsbasis JS C8BC56FB…/CSS07B131C3…; aktuelle Root-control-panel.js/css werden niemals gelesen. Netzwerkquelle8a8a9cb, Systemquelle27BEF33D…/568E8915… . Originalgrafiken werden unverändert als Daten-URLs eingebettet: Logo1050/157×151 und expliziter UAC32bit/16×16. Nur das Integrationszwischenmodul erhält diese Grafikergänzungen; getrennte Produktquellen bleiben unverändert.

## Reproduzierbarer Build und Überführung

`node scripts/cpl-release/build.mjs` aus dem Repository. Benötigt nur Node und die bereits vorhandene esbuild-Abhängigkeit. Alle8Quellinputs liegen vollständig unter `sources/base`, `sources/modules`, `sources/assets`, mit identischen Bytes und streng geprüften Hashes. Beim erneuten Build werden ausschließlich diese Snapshots gelesen; die ursprünglichen Dateien in production-release-base werden nicht benötigt. `entry.mjs`, `system-source.mjs`, `network-source.mjs` sind generierte lesbare Zwischenstände. Zwei aufeinanderfolgende Builds aus den Quellsnapshots lieferten identische Ausgabehashes. `absWorkingDir` verhindert ortsabhängige esbuild-Quellpfadkommentare.

Konkreter versionierbarer Überführungsvorschlag für Zentral: **diesen vollständigen Paketordner nach `scripts/cpl-release/` kopieren**, inklusive `build.mjs`, `sources/`, `README.md`, `manifest.json`; dann `node scripts/cpl-release/build.mjs`. Die Verzeichnistiefe bleibt gleich, vorhandenes Repository-esbuild wird weiter gefunden. Für denselben Output `absWorkingDir` auf dem Paketordner belassen. Produktion erhält weiterhin nur die zwei bekannten control-panel.js/css-Routen. Ein automatisches Kopieren in `public/`, Backendpatch oder Deployment ist absichtlich nicht Teil des Builds. Keine dauerhafte Abhängigkeit von ignorierter production-release-base erforderlich.

## Hostvertrag

Neue Seiten-IDs `system-info` und `network-center`; erreichbar als direkte open-Ziele, in den bestehenden Kategorien System und Sicherheit/Netzwerk und Internet und in der vorhandenen Suche/Symbolansicht. Keine Übernahme des ungeprüften aktuellen Kategorie-/Start-/Sprunglistenpakets.

Vorhandenes `GET /api/task-manager`, ausschließlich persönliche authenticated Rollenuser/admin, nichtreadonly/nichtshare. Renderer erhalten nur Home als verfügbares Ziel; Leistungsindex/Remote/Firewall/usw. bleiben inaktiv. Host-Sidebar aus, .cp-content Padding0 nur bei eigenem Modul; vorhandenes Padding bei Rückkehr wiederhergestellt. CSS-Hostoverride folgt den Basisregeln und überschreibt das gleich spezifische .cp-content:has(.cp-subpage).

Jeder Render invalidiert die vorige Anfrage und erhöht den Requesttoken. Jede Antwort muss Token, Profilkontext und aktuelle Seite weiterhin treffen; Context beinhaltet userId/authenticated/readonly/shareEditing/role. AbortController zusätzlich. Close leert Moduldaten/invaldiert; refresh bei Profilwechsel leert sofort und rendert mit aktuellem Kontext neu. Keine globale Snapshotcache. Der vorhandene Apphost muss refresh wie bisher beim Sitzungs-/Profilneuladen aufrufen. Die serverseitigen Berechtigungen bleiben unverändert.

## Eng ausgeführte Browserprüfung

`node scripts/cpl-release/preview.mjs`, GET-only Helper4184. Tatsächlicher Produktions-Control-Panel-Code samt gebündelten Modulen und Basis-CSS, synthetischeAPI und kleiner Desktop-/Accounts-Hostshim. **Keine vollständige produktive Desktopsitzung oder native Pixelabnahme.**

`browser-checks.json` dokumentiert: Hostsidebar hidden/Padding0; beideHome-Rückwege/Polsterungsrestaurierung; persönlicheStandardbenutzerdaten; System→readonly während1,5sAntwortverzögerung mit sofortiger und nachfolgender Datenentfernung; Netzwerk→Suche, Close und Logout mit verspäteten Antworten ohne erneuteModul-/Datenanzeige. Netzwerkmodulbreiten883/603/423px ohne horizontalenModulüberhang; natürlicheOriginalgrafikmaße157×151/16×16 und Daten-URLs. `system-integrated.png`, `network-440-logout.png` sind Browserbelege mit synthetischen Daten. Browserwarnungen/Fehler0. `browser-requests.json` enthält alle tatsächlich angefragten Pfade; keine neuen System-/Netzwerk-JS-/CSS-/Originalgrafikrequests.

Nach diesen Verhaltensprüfungen änderte sich ausschließlich der generierte esbuild-Quellpfadkommentar durch absWorkingDir; Syntaxprüfung und zwei identische Rebuilds erfolgten auf dem finalen Ausgabehash. Keine erneute pauschale Gesamtsuite behauptet. Netzwerkquelltests5/5 und bestehende Modulbelege sind getrennt dokumentiert.

Offen: unabhängige Paketprüfung, vollständiger realer Desktop-/Sitzungsnachtest durch Zentral, Produktivassetabgleich und Veröffentlichung. Keine neuen Netzwerk-/OScontroller und keine komplette Systemsteuerung.
