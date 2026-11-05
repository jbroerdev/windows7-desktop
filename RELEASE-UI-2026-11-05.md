# Taskleiste, Arbeitsbereich und Himmel – 5. November 2026

Auf explorer.xserverx.app wurden drei zusammengehörige statische Dateien aktiviert: normale horizontale Taskleiste 40 Pixel, passende Aero-Abmessungen und die initiale Systemsteuerungsposition anhand des tatsächlichen Arbeitsbereichs. Kleine Symbole, vertikale Leisten und automatisches Ausblenden behalten ihre bisherigen Abmessungen. Anschließend wurde separat der Himmel-Standardfarbwert auf #74b8fc korrigiert. Explizit gespeicherte Profilfarben werden nicht migriert.

Geprüfte und öffentlich per HTTP200 bytegleich gelieferte Versionen:

- taskbar-state.js: e2591a710a9f727d5d0bdab919ed4aae909646af5def6475188190f8ee51278b
- aero.css: 37cf13531166340cdf9f4952a64d5504f6395dae1fa7a6f95427f4e131be37e5
- control-panel.js, System/Netzwerk mit Arbeitsbereichskorrektur: 188b4d0311db7140a34a5fa085ada1ee005adae842376602a3b5fe87090b16f8
- appearance.js: 0cad88514462636314987b3f5c809c3ea7853366908109b567b630b85ab52a3d

38 gezielte Tests der sauberen Main+Start+UI-Kombination bestanden. Die CP-Testladehilfe berücksichtigt den zusätzlichen bestehenden taskbar-state-Import. Keine Produktimporte wurden entfernt. Unabhängig liegen reale Browserprüfungen der Arbeitsbereichskombination vor. Eigene frische öffentliche Ansicht maß die Taskleiste bei 1280×720 mit x0/y680/Breite1280/Höhe40. Die unabhängige Prüfung aller Kanten auf der tatsächlichen Website läuft separat.

Quell- und Laufzeitdateien wurden mit SHA256 kontrolliert, vorher je Paket gesichert. Sicherungen liegen in /var/tmp/height40-e259-20261105 und /var/tmp/himmel-0cad-20261105. Der Desktopdienst blieb aktiv; kein Desktop- oder Appcontainerneustart war erforderlich. Die CP-CSS-Datei blieb für dieses Paket unverändert. Die nachfolgenden Kategorien sind ein separates Paket.

Offene Funktionsbefunde werden ausdrücklich nicht durch diese Geometrieabnahme geschlossen: Startsuche per Tastatur, Editor-internes Dateiöffnen im Dokumentverlauf sowie native Miniaturen/Peek. Vollständige Windows-7-Pixelgleichheit wird nicht behauptet.
