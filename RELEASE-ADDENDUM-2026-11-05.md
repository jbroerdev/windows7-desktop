# Veröffentlichter Abschlussstand der Runde vom 5. November 2026

Maßgeblicher Produktstand: Main7a20077572251a343d0978ebd920c17331d3bd53, übernommen über [PR6](https://github.com/jbroerdev/windows7-desktop/pull/6). Vor dem Merge bestanden die vollständigen Docker-/Browser-/RDP-/Smoke-Prüfungen sowohl für den Push als auch für den Pull Request. Die zuvor fehlende Docker-Laufzeitabhängigkeit recent-items.mjs ist enthalten.

Der tatsächliche native Host und die öffentliche Webseite enthalten die freigegebenen Änderungen. Vierzehn öffentliche Laufzeitdateien wurden zum Abschluss mit HTTP200 exakt bytegleich zum lokalen Release verglichen; persönlicher Verlauf bleibt anonym mit401 geschützt, Share ist deaktiviert. Der Login-Link ist initial verborgen und wird nur bei shareEnabled=true eingeblendet. Fünfzig begrenzte Quell-, Test-, Build- und Reportdateien wurden zusätzlich mit Sicherung und vollständigem SHA-Abgleich auf dem Host angeglichen. Keine privaten Daten oder Konfigurationsgeheimnisse gehören zu diesem Paket. Die Apps bleiben Dockercontainer.

Das über die GitHub-Website geladene Brancharchiv stimmt bei allen44 geprüften Quelldateien bytegenau überein. Der Kategorienbuild aus diesem Archiv erzeugt erneut genau die veröffentlichten Ausgaben163735454633af775441abbd9c918e378be99095f84c0541efa16b8c6965c2c4 und da7e8c9a7a39ec04c3ee28b85f5d73f9fc44c1756a2b3a68e086cfe5648e6389. Gesamter lokaler Releasebaum:339Tests,338bestanden,1Windows-Plattformskip,0Fehler.

Die zuvor noch ausstehenden engen Website-Nachtests sind abgeschlossen:

- Taskleisten-Arbeitsbereich: vier Kanten, initiale CP-Position, Maximieren und Wiederherstellen; ursprüngliche Einstellungen danach restauriert.
- Kategorien: tatsächliches Home/Kategorie/System/Netzwerk/Zurück, Suche und Arbeitsbereich geprüft. Fehlende aktive Windows-Netzwerkdaten werden nicht erfunden.
- Gruppenfokus: zwei eigene leere Editorfenster, aktive Auswahl nach Klick, Escape und Timer zurück zum Anker; Hover erhält externen Editorfokus.
- Startsuche: Pfeilauswahl, Enter mit genau einem neuen Rechner, Tab/ShiftTab, Escape und Nulltreffer ohne Appstart.
- Editor-Dateiöffnen: nach vollständiger frischer Desktopnavigation erscheinen Dokument und Anheften-Aktion sowohl unter Documents als auch am ursprünglichen Desktop-Dateipfad. Beide Datenschutzeinstellungen wurden nur gelesen. Der frühere negative Nachtest ist dadurch eingegrenzt; eine alleinige Cacheursache wird nicht behauptet. Eigene QA-Dateien wurden nur in den Papierkorb verschoben, eigene Fenster geschlossen und die beobachtete Lautstärke70 wiederhergestellt. Datei-Pin und Persistenz sind zusätzlich im unabhängigen synthetischen echten Desktop nachgewiesen.

Der ergänzende tatsächliche Live-Pin-Zyklus ist ebenfalls bestätigt: eigene QA-Datei anheften, Sprungliste erneut öffnen und Eintrag unter „Angeheftet“ sehen; lösen und erneut öffnen, danach ausschließlich „Zuletzt verwendet“. Der eigene Pin wurde entfernt und die eigene Datei recoverable in den Papierkorb verschoben. Andere Pins und Privacyoptionen blieben unverändert.

Offen bleiben der separate Befund veralteter Gruppenvorschauzeilen nach externen Fensterschließungen, native Miniaturen/Peek sowie alle weiteren unerledigten Punkte der Windows7-TODO. Die Runde ist keine vollständige 1:1-Abnahme des gesamten Desktops. Ältere Berichte dokumentieren ihren damaligen Prüfzeitpunkt; dieser Nachtrag ergänzt die danach eingetroffenen Live-Nachweise.

Main-/Image-CI: [Lauf158](https://github.com/jbroerdev/windows7-desktop/actions/runs/41995424283) für 7a20077572251a343d0978ebd920c17331d3bd53 erfolgreich abgeschlossen, 4m38s. Die Imageveröffentlichung lief erfolgreich in8s; anschließend bestanden Containerstart/Healthcheck und HTTP-/Dateisystem-Smoke. Die Images tragen latest und den vollständigen Codecommit. Vorher ebenfalls erfolgreich: Pushlauf156 und PR-Lauf157. Der nachfolgende Dokumentationsnachtrag ändert keine Produktdatei und benötigt keinen erneuten Imagebuild.
