# Taskleiste, Arbeitsbereich und Himmel – 5. November 2026

Auf explorer.xserverx.app wurden drei zusammengehörige statische Dateien aktiviert: normale horizontale Taskleiste 40 Pixel, passende Aero-Abmessungen und die initiale Systemsteuerungsposition anhand des tatsächlichen Arbeitsbereichs. Kleine Symbole, vertikale Leisten und automatisches Ausblenden behalten ihre bisherigen Abmessungen. Anschließend wurde separat der Himmel-Standardfarbwert auf #74b8fc korrigiert. Explizit gespeicherte Profilfarben werden nicht migriert.

Geprüfte und öffentlich per HTTP200 bytegleich gelieferte Versionen:

- taskbar-state.js: e2591a710a9f727d5d0bdab919ed4aae909646af5def6475188190f8ee51278b
- aero.css: 37cf13531166340cdf9f4952a64d5504f6395dae1fa7a6f95427f4e131be37e5
- control-panel.js, System/Netzwerk mit Arbeitsbereichskorrektur: 188b4d0311db7140a34a5fa085ada1ee005adae842376602a3b5fe87090b16f8
- appearance.js: 0cad88514462636314987b3f5c809c3ea7853366908109b567b630b85ab52a3d

38 gezielte Tests der sauberen Main+Start+UI-Kombination bestanden. Die CP-Testladehilfe berücksichtigt den zusätzlichen bestehenden taskbar-state-Import. Keine Produktimporte wurden entfernt. Unabhängig liegen reale Browserprüfungen der Arbeitsbereichskombination vor. Eigene frische öffentliche Ansicht maß die Taskleiste bei 1280×720 mit x0/y680/Breite1280/Höhe40. Die unabhängige Prüfung aller Kanten auf der tatsächlichen Website läuft separat.

Quell- und Laufzeitdateien wurden mit SHA256 kontrolliert, vorher je Paket gesichert. Sicherungen liegen in /var/tmp/height40-e259-20261105 und /var/tmp/himmel-0cad-20261105. Der Desktopdienst blieb aktiv; kein Desktop- oder Appcontainerneustart war erforderlich. Die CP-CSS-Datei blieb für dieses Paket unverändert. Die nachfolgenden Kategorien sind ein separates Paket.

Die unabhängige tatsächliche Websiteprüfung bestätigte anschließend alle vier Taskleistenkanten, CP-Maximieren und Wiederherstellen. Sämtliche geänderten Einstellungen wurden auf die ursprüngliche untere Position zurückgestellt. Danach wurde separat das Kategorienpaket mit CP-JS163735454633af775441abbd9c918e378be99095f84c0541efa16b8c6965c2c4 und CSSda7e8c9a7a39ec04c3ee28b85f5d73f9fc44c1756a2b3a68e086cfe5648e6389 aktiviert; Quelle, Runtime und HTTP stimmen überein. Sicherung: /var/tmp/categories-163735-20261105. Der versionierte Build erzeugt beide Ausgaben bytegenau aus seinen unveränderlichen Quellen. Der separate QM-Consumercheck auf der Website folgt.

Startsuche und Editor-Dateiöffnen wurden anschließend separat korrigiert; siehe RELEASE-FUNCTIONS-2026-11-05.md. Native Miniaturen/Peek und vollständige Windows-7-Pixelgleichheit bleiben offen.
