# Task-Manager und Host-Daten

Der Task-Manager enthält Anwendungen, Prozesse, Dienste, Leistung, Netzwerk und Benutzer.
Anwendungen sind die tatsächlich geöffneten Fenster des aktuellen Browser-Desktops, einschließlich minimierter Instanzen. „Task beenden“ schließt ein Fenster über dessen normale Schließen-Funktion; vorhandene Rückfragen zu ungespeicherten Dokumenten gelten weiterhin. „Neuer Task“ öffnet Programme und Dateien über die Eingabeaufforderung.

Ohne Host-Monitor zeigt die Anmeldung Messwerte der Laufzeitumgebung. Das ist im Docker-Betrieb nicht automatisch der vollständige Docker-Host. CPU-Werte basieren auf Messdifferenzen, nicht auf der Systemlast. Nicht verfügbare Messwerte werden als „—“ angezeigt.

## Host-Monitor unter Linux aktivieren

Auf dem Docker-Host im Projektverzeichnis ausführen:

```bash
sudo apt-get install -y python3
sudo install -m 755 scripts/host-monitor.py /usr/local/lib/windows7-host-monitor.py
sudo install -m 644 scripts/windows7-host-monitor.service /etc/systemd/system/windows7-host-monitor.service
sudo systemctl daemon-reload
sudo systemctl enable --now windows7-host-monitor.service
sudo systemctl status windows7-host-monitor.service --no-pager
```

Der Standardpfad ist `/Explorer/.explorer/host-monitor.json`. Bei anderem Speicherpfad muss `--output` und `ReadWritePaths` in der Unit angepasst werden. Die Datei wird alle zwei Sekunden atomar mit Besitzer `root`, Gruppe `1000` und Modus `0640` ersetzt. Die Web-App liest sie aus ihrem bestehenden Daten-Bind-Mount; zusätzliche Mounts oder der Docker-Socket im Webcontainer sind nicht nötig. Snapshots älter als 15 Sekunden werden verworfen.

Der Monitor liest CPU, Speicher, Prozessnamen (ohne Argumente), Netzwerkzähler und `docker ps -a`. Er startet, stoppt und verändert keine Container. Docker-Container einschließlich gestoppter Container werden im Reiter Dienste ausschließlich Administratoren angezeigt. Die Benutzerliste zeigt aktive Web-Anmeldungen, keine Linux-Konten. Administratoren sehen alle angemeldeten Konten, Benutzer nur ihr eigenes. Browser-Schließen beendet die serverseitige Anmeldung nicht sofort.

In Proxmox CT 108 ist der Docker-Host der LXC-Container. Die Messwerte sind die dort vom Linux-Kernel bereitgestellten Werte; sie können je nach LXC-Konfiguration physische CPU-Kerne und Host-Zähler enthalten. Sie sind keine Verwaltung des Proxmox-Knotens oder anderer LXC-Container.

Nach Änderungen am Monitor dessen Dateien erneut installieren und den Dienst neu starten:

```bash
sudo systemctl restart windows7-host-monitor.service
```
