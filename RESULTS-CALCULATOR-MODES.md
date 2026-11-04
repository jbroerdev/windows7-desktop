# Rechner: wissenschaftliche und Programmierer-Ansicht

Stand 2026-11-04. Isoliertes Folgepaket zum Standardrechner, mit zentralem Agenten abgestimmt. Rechenengine bleibt unverändert.

## Originalvergleich

Referenz: bereitgestellte deutsche Windows 7 Home Premium SP1 VM, 100 %, Aero. Aufnahmen `docs/windows7-reference/images/calculator-scientific.png` und `calculator-programmer.png` (1189×902). Beide Originalansichten wurden zusätzlich im laufenden VM-Konsolentab erneut geöffnet. Die aktuelle schmale Browserkonsole skaliert die Gastansicht auf etwa 0,525; diese Neuaufnahme dient der Zustandsbestätigung, die unskalierten Referenzbilder dienen den Pixelmaßen. Originalaufnahme: [aktuelle VM](calculator-verification/vm-programmer-current.png).

## Änderungen

- Wissenschaftlich 422×322 statt 486×354; Programmierer 422×388 statt 440×392.
- Bestehende lokal isolierte Frame-Maße des Standardrechners auf beide Modi übertragen; gemeinsame Frame-/CSS-Dateien unberührt.
- Wissenschaftliche Tasten in Originalreihenfolge und 34×27-Raster angeordnet, inklusive der deaktivierten leeren Position. Winkelgruppe Deg/Rad/Grad wie Referenz und 190 Pixel breit; Anzeige 385 Pixel breit.
- Programmierer: Zahlensystem/Wortgröße 73 Pixel breit, Operatoren 73, Hexspalte 34. RoL/RoR an den Referenzpositionen.
- Bitübersicht 385×60, 64 Stellen und korrekte Positionszeilen 63/47/32 und 31/15/0. Nicht zur Wortbreite gehörige Bitgruppen werden gedimmt. Keine Änderung an der Integer-Rechnung.
- Verlauf vergrößert nun alle Modi um 106 Pixel; bisher waren wissenschaftliche/Programmierer-Ansichten trotz eingeblendetem Verlauf nicht höher.

## Geometrie, relativ zum Außenrahmen

| Modus / Teil | x | y | Breite | Höhe |
|---|---:|---:|---:|---:|
| Wissenschaftlich / Anzeige |19|60|385|50|
| Winkelgruppe |19|115|190|27|
| Wissenschaftliche Tasten |19|147|190|155|
| MC |214|115|34|27|
| 0 |214|275|73|27|
| Programmierer / Anzeige |19|60|385|50|
| Bits |19|115|385|60|
| Optionsgruppen |19|181|73|187|
| Operatoren + Hex |97|181|112|187|
| Hexspalte |175|181|34|187|
| MC |214|181|34|27|
| 0 |214|341|73|27|

DOM-Messungen: [Wissenschaftlich](calculator-verification/scientific-geometry.json), [Programmierer](calculator-verification/programmer-geometry.json).

Bilder: [Wissenschaftlich](calculator-verification/scientific.png), [Programmierer](calculator-verification/programmer.png). Die Größe der umgebenden Desktopaufnahme kann abweichen; maßgeblich sind die Fensterkontur und relativen Maße. Profilhintergründe sind keine Sollvorgabe.

## Prüfung

- `node --test calculator.test.mjs calculator-ui.test.mjs`: **11/11 bestanden**.
- Neue Eventtests prüfen Sinusfunktion nach Tasten-Neuanordnung, Modusgrößen, Verlaufshöhe und Bitpositionszeilen.
- Isolierter Browser mit echtem `createDesktop()`, `style.css`, `aero.css`: alle drei Modi geöffnet, sichtbare Struktur und DOM-Rechtecke kontrolliert.
- Erneuter direkter Blick auf wissenschaftliche und Programmierer-Ansicht der echten VM.

## Grenzen / Folgearbeit

- Statistik-UI bleibt gemäß Abstimmung deaktiviert; zentraler Agent bearbeitet die Statistikengine.
- Gemeinsames Aero-Material, Glow, Titeltext und vorhandenes Rechner-SVG sind hier nicht überarbeitet. Das ist ein eigenes abgestimmtes Folgepaket.
- Keine vollständige Abnahme sämtlicher wissenschaftlicher Rechenoperationen; Engine unverändert, bestehende Tests weiterhin grün.
- Kleine Viewports und randnahe Fenster erfordern noch das gemeinsame Erreichbarkeits-/Fensterpaket UI-02.
- Kein paralleles Deployment oder GitHub-Push. Zentrale Integration und Live-Abnahme folgen im anderen Chat.
