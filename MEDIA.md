# VLC und FFmpeg

Der Player startet mit der vorhandenen Dateiliste. Der Abgleich mit lokalen Dateien und SMB-Laufwerken läuft im Hintergrund. Eingebettete App-Fenster werden erst angezeigt, wenn ihre Oberfläche bereit ist.

MP4, MP3 und andere vom Browser unterstützte Formate werden direkt wiedergegeben. Bei nicht unterstützten Containern oder einem Decoderfehler übernimmt FFmpeg. MKV mit lediglich unsicherer Browser-Unterstützung wird direkt umgewandelt. Die Ausgabe ist fragmentiertes MP4 mit H.264, 8-Bit-YUV420 und AAC-Stereo; Untertitel- und Datenströme werden nicht automatisch übernommen. Die Originaldatei wird nicht verändert.

In `.env` konfigurierbar (anschließend Compose neu starten):

```dotenv
FFMPEG_ENABLED=1
FFMPEG_THREADS=2
FFMPEG_MAX_WIDTH=1280
FFMPEG_MAX_HEIGHT=720
FFMPEG_MAX_PROCESSES=2
FFMPEG_STARTUP_TIMEOUT=30
```

Die Größen begrenzen ausschließlich die transcodierte Wiedergabe, nicht die Originaldatei oder direkte Wiedergabe. Für höhere Qualität können z. B. `1920` und `1080` verwendet werden, sofern die CPU schnell genug ist. Das Encoding läuft auf der CPU. Wird das Fenster geschlossen oder die Datei gewechselt, wird der zugehörige FFmpeg-Prozess beendet. Bei belegten Transcoding-Plätzen oder einem Startfehler antwortet der Server mit einem Fehlerstatus, statt einen leeren erfolgreichen Stream zu liefern.

Beim transcodierten Stream ist kein beliebiges Springen an noch nicht erzeugte Positionen möglich. Die Wiedergabe unterstützt Dateien, deren Decoder im mitgelieferten FFmpeg vorhanden ist; beschädigte oder verschlüsselte Dateien sind dadurch nicht automatisch abspielbar.

## Echter Codec-Test im fertigen Container

```bash
docker exec -i windows7-desktop-explorer-1 node --input-type=module < scripts/media-smoke.mjs
```

Der Test erzeugt in einem temporären Verzeichnis eine 10-Bit-MKV mit FFV1/PCM, lädt sie in eine isolierte Testdatenbank hoch und prüft die Ausgabe der echten HTTP-Transcoding-Route mit `ffprobe`. Zusätzlich wird geprüft, dass ein nicht angemeldeter Zugriff auf die private Testdatei abgelehnt wird. Produktive Dateien und Benutzer werden nicht verwendet.
