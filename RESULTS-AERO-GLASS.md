# Aero-Material, Glas und Schatten

Stand2026-11-04. Direkte neue Nutzerpriorität: Fenster/Taskleiste sollen wieder als transparente Glasflächen wirken; harte weiße Striche überdecken den bisherigen Eindruck.

## Befund und Änderung

- Bestehende Taskbartexture.png hat Alpha255-Spitzen: deckend weiße Diagonalbänder. Im bisherigen Frame lagen außerdem harte Gradientwechsel bei23/24,37/38 und67/68Prozent über der transparenten Fläche. Die vorhandene Hintergrundunschärfe war bereits real, wurde aber von diesen Überlagerungen sichtbar überdeckt.
- Entfernt die Taskleisten-Textur aus der Materialdarstellung; das Asset wird nicht gelöscht. Taskleiste verwendet jetzt die vorhandene profilabhängige halbtransparente Farbe, echten Backdrop-Blur und eine schwache durchgehende vertikale Schattierung.
- Frame behält ebenfalls echtes Backdrop-Glas und Profilfarbe. Harte Diagonalstreifen sind durch eine sehr schwache breite Reflexion und weiches oberes Randlicht ersetzt. Gleichmäßig kräftige weiße Innenumrandung ersetzt durch schwächeres, nach Kante abgestuftes Licht.
- Aktive Fenster erhalten dunkleren Kontaktschatten plus breiteren weichen Außenschatten; inaktive Fenster einen zurückgenommenen Schatten. Die Oberfläche wird nicht über globale Fenster-opacity transparent gemacht; Appinhalte bleiben deckend.
- Eine bestehende Spezifitätslücke korrigiert: Die Regel für maximierte Fenster konnte den spezifischeren Shell-Schatten nicht überstimmen. Maximierte Fenster haben nun tatsächlich computed box-shadow:none, ohne Größen-/Titelleistenänderung.
- Ausschließlich public/aero.css geändert. appearance.js, Präferenzen, Intensitätskurve, Farben, Transparenzschalter, Backend und Fensterlogik bleiben unverändert.

## Prüfung

21/21 vorhandene gezielte Tests: appearance.test.mjs, windows.test.mjs, screens.test.mjs. Eine reine CSS-Ausnahme wird nicht durch einen Test abgesichert, der nur ihre Zeichenfolge wiederholt; stattdessen reale Browserabnahme mit den tatsächlich geladenen Modulen.

Reproduzierbare isolierte Szene1280×720: Paint[120,70,800,520], Rechner[800,180,227,322]. Vorher/Nachher identische Geometrien und Hintergrund, Appinhalte bleiben deckend. Aktivierung von Paint tauscht active/inactive-Schatten ohne Bewegung. Maximierung liefert[0,0,1280,678], Caption23px und computedShadow none. Transparenz aus liefert deckende RGB-Flächen und blur(0px); Rubin liefert rgba(183,68,68,.46) für Fenster und rgba(79,29,29,.576) für Taskleiste. Kein Produktionsprofil für diese Materialvarianten geändert.

Nachweise: glass-before.png, glass-after.png, glass-focus-paint.png, glass-off.png, glass-rubin.png; dazu glass-material.json, glass-maximized.json, glass-off.json und glass-pixels.json. Linke/rechte Rechner-Rail über Paint/Wallpaper sind zusätzlich als Pixelproben erfasst. Die native Win7-VM und vorhandene Referenzsammlung wurden als visueller Maßstab verwendet; diese Aufnahmen sind keine Behauptung eines byteidentischen DWM-Shaders.

## Integration / Grenzen

Nur diesen separaten Commit übertragen. Unfertiger notification-area-properties.js-Prototyp, dessen na-CSS und Symbolausschnitte bleiben draußen. Zentrale Tray-/Backendpakete nicht aus diesem Worktree überkopieren. Keine neue Route/Abhängigkeit; Browser muss aktualisiertes aero.css laden. Veröffentlichung weiterhin zentral.

Die Profilwerte bestimmen weiterhin die gewünschte Glasstärke. Browser-Backdrop-Filter und Windows-DWM unterscheiden sich technisch; weitere visuelle Abnahme auf Benutzerhintergründen und unterschiedlichen Intensitäten bleibt Teil des Gesamtziels. Keine vollständige1:1-Fertigmeldung.
# Follow-up: compositing candidate

Integration rejected the first image-layer candidate: the initial restore sequence passed, but a subsequent minimize/reopen sequence again produced an empty white CPL client. The previous CSS passed that extended sequence. The next diagnostic candidate restores the previous active/inactive window box-shadow values and the previous 1.3 backdrop saturation, while retaining the soft background layers, stripe-free taskbar and maximized shadow specificity fix. No full rendering acceptance is claimed until the extended live comparison passes. More accurate directional shadow calibration stays private and is not mixed into this diagnostic change.

The live integration exposed a regression after restoring a maximized cross-origin browser window and reactivating Control Panel: the DOM remained present but its white client surface could omit its contents. The integration agent reproduced this with the new material and not with the previous CSS, and rolled the runtime CSS back. The initial isolated checks therefore did not establish rendering parity.

The follow-up keeps the same tint, alpha, soft reflections and shadows, but places the tint in the bottom background-image layer and leaves background-color transparent, matching the previous rendering structure. This applies explicitly to active and inactive frames, and consistently to the taskbar. It introduces no forced repaints, transforms or will-change workarounds.

Local verification: 21 appearance/window/screen tests pass. With real CPL/Paint/Calculator modules and a separate cross-origin browser iframe, the sequence browser maximize → CPL activate → browser restore → CPL activate retains all eight CPL categories; `frame-verification/glass-layer-restore.png` records the result. Computed background-color is transparent, with the preserved 0.46 tint in the bottom image layer and blur 14px. Since the local fixture did not reproduce the original regression, this is a candidate requiring the integration agent's decisive live comparison, not a proven live fix.

