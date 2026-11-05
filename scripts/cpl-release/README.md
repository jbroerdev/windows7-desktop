# Reproduzierbarer Systemsteuerungs-Build

Vom Repository-Stamm nach Installation der Projektabhängigkeiten ausführen:

```sh
node scripts/cpl-release/build.mjs
```

Der Build liest die unveränderlichen Quellsnapshots und Originalgrafiken unter `sources/`, prüft deren SHA256-Werte und schreibt `control-panel.js`, `control-panel.css` und `manifest.json` in dieses Verzeichnis. Er übernimmt keine aktuellen, möglicherweise unfertigen Dateien aus `public/`. Ausgaben erst nach Prüfung in `public/` übernehmen.

Veröffentlichte Ausgaben vom 5. November 2026:

- JavaScript: `163735454633af775441abbd9c918e378be99095f84c0541efa16b8c6965c2c4`
- CSS: `da7e8c9a7a39ec04c3ee28b85f5d73f9fc44c1756a2b3a68e086cfe5648e6389`

Das Bundle enthält die Kategorien sowie die vorhandenen System- und Netzwerkseiten. Die initiale Fensterposition nutzt den tatsächlichen Taskleisten-Arbeitsbereich. Unverändert externe Module sind notification-area-properties.js, taskbar-properties.js, date-time.js und taskbar-state.js. Zusätzliche öffentliche Backendrouten für Kategoriequellen sind nicht erforderlich. Profil- und Requestguards bleiben Bestandteil der Integration; nicht implementierte Ziele bleiben deaktiviert.

Die Kombination wurde mit dem 40-Pixel-Arbeitsbereich in 70 echten Browserchecks geprüft; die ältere 42-Pixel-Basis separat in 69 Checks. Diese Funktions- und Geometrieprüfungen sind keine vollständige native Pixelabnahme. Aktuelle Live- und Releasegrenzen stehen im Nachtrag RELEASE-ADDENDUM-2026-11-05.md im Repository-Stamm.
