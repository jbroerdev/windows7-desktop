# Fenster, Taskleiste und Systemsteuerung: erstes Prioritätspaket

Stand 2026-11-04, ca.19:32 MEZ. UI-Ziel bleibt aktiv. Dieses Paket wird separat integriert; native Taskleisten-Eigenschaften und zusätzliche Taskleistenoptionen folgen parallel abgestimmt.

## Referenzen und Geometrie

- Bereitgestellte echte deutsche Windows7 Home Premium SP1 VM, 100%, Aero. [Kategorieübersicht](frame-verification/vm-control-panel-1189.png), [frisch geöffnete Anpassung](frame-verification/vm-personalization-624.png).
- Browser/VM haben im laufenden Vergleich unterschiedliche effektive Viewports geliefert (Web1280×720, aktuelle VM624×846). Komponentenmaße wurden unskaliert verglichen; kein ungeprüfter Vollbild-Pixelvergleich oder behauptetes identisches Layout über verschiedene Breiten.
- Normale gemeinsame Caption28px und Controls19px; Rechner behält seine bereits gemessenen lokalen Maße. Maximiert: Caption23px, keine äußere Größenänderungsbordüre. CPL-Navigation dann33px, Clientstart56px wie im frisch maximierten Original.
- CP-Standardfenster800×601; acht Kategorien in zwei unabhängigen Spalten, Überschrift und Anzeigeauswahl auf gemeinsamer Zeile. Iconposition relativ zum Fenster ca.81px, Beschriftung141px, zweite Spalte401px wie Referenz.

## Umsetzung

1. Kategorienamen und Originalreihenfolge; konkrete vorhandene Einstellungen behalten ihre bisherigen Aktionen und Administratorbeschränkungen. Kategorien ohne implementierte Einstellungen lassen sich öffnen und benennen die fehlende Funktion ehrlich.
2. Acht48px-Kategorieicons aus der bereits vorhandenen Eigentümer-VM-Aufnahme übernommen, plus zwei48px-Originalgrafiken für Sounds/Bildschirmschoner aus der aktuellen Anpassungsaufnahme. `public/icons/control-panel/SOURCE.json` dokumentiert Aufnahmehashes und Ausschnittrechtecke. Dies sind Screenshot-Ausschnitte mit weißem Hintergrund, keine behaupteten aus DLLs extrahierten PNGs.
3. Explorerartige Systemsteuerung besitzt eine leere sichtbare Glascaption; zugänglicher Fenstertitel und Taskleisteneintrag bleiben erhalten.
4. Designseite mit Originalüberschrift und Erklärung, Eigene Designs, sieben Aero-Designs einschließlich vorhandener Deutschland-Galerie,136×126px-Kacheln und größeren Vorschauen. Keine erfundene neue Server-Wallpaper-ID; Deutschland verwendet das bestehende Galeriedatenobjekt.
5. Ein unverändertes aktives Preset erzeugt keine zusätzliche Nicht-gespeichert-Kachel. Eigene/abgewandelte Designs behalten den bestehenden Speicherpfad. Originalnahe linke Navigation und Siehe-auch-Bereich; vorhandene Kontobildfunktion jetzt direkt erreichbar. Mauszeiger und Bildschirmschoner bleiben sichtbar als nicht implementiert deaktiviert.
6. Vorhandene Taskleisten-Zustandsgrafiken und Textur statt überlagerter neuer Gradienten. Laufmarkierung bleibt gemäß früherem Nutzerwunsch erhalten, ist jetzt eine dezente1px-Unterkante. Uhrdatum mit führenden Nullen.
7. Zusätzlicher Erstöffnungsfall: Kaskadierung darf ein arbeitsflächenhohes Paintfenster nicht hinter die Taskleiste schieben. Erste show()-Position verwendet ebenfalls den bereits abgestimmten fitBounds-Pfad.

## Ausgeführte Prüfungen

`node --test control-panel-ui.test.mjs personalization-ui.test.mjs appearance.test.mjs windows.test.mjs calculator-ui.test.mjs desktop.test.mjs workspace.test.mjs paint.test.mjs`: **39/39 bestanden**.

Neue Tests prüfen acht Kategorien, bestehende Anpassungsnavigation und Administratorgrenzen; Preset-/Unsaved-Zustand, Deutschland-Datenvertrag; tatsächliches createDesktop.show() mit einer zweiten hohen Anwendung.

Browser mit echten Shell-/Frame-/ControlPanel-/Account-/Personalization-/Paint-Modulen; nur Profil-/Galerie-API im isolierten Testserver durch eigene Testdaten ersetzt. Keine Aussage über eine neue Backend-Persistenzprüfung daraus ableiten; API/Rechte unverändert und bisherige Backendtests bestanden.

- [Normale Kategorieansicht](frame-verification/control-panel-after.png), [maximiert](frame-verification/control-panel-maximized.png), [Designseite](frame-verification/personalization-after.png).
- [Paint-Frame](frame-verification/paint-frame-after.png): nach Erstöffnung `[102,0,1120,678]` bei1280×720, Footer `[y645,h25,bottom670]`, Taskleistenbeginn678. Vor Korrektur frameTop16 und Unterkante694.
- [Fokusmessung](frame-verification/frame-focus.json): Frame und Titelrechteck bleiben beim Aktivieren der anderen Anwendung identisch. Painttitel `[134,7.5,977,15]` in beiden Zuständen.
- Maximierte CPL-Kontur `[0,0,1280,678]`, Caption23, Navigationy23/h33, Clienty56.
- Farbvorschau Rubin setzt echte DOM-Aerovariablen auf `183 68 68`; Abbrechen stellt `105 164 201` wieder her und entfernt das Previewattribut. Keine Produktionsprofile geändert.

## Verbleibende Arbeit

- Native Taskleisten-Eigenschaften sowie Position/kleineSymbole/Ausblenden/Gruppierungsvarianten sind ein eigenes abgestimmtes Folgepaket; Backend-/Verhaltensmodell beim zentralen Agenten, UI hier.
- Netzwerk-/Programme-/Bedienungshilfe-Kategorien haben noch keine vollständigen Windows-Systemfunktionen. Keine aktiven dekorativen Ersatzaktionen behauptet. Linux-/Webprodukt wird nicht durch Beschriftungen zu Windows.
- Basis-/Hochkontrastdesigns, Mauszeiger- und Bildschirmschonerdialog fehlen weiterhin. Regionale Zusatzdesigns bleiben als bestehende Produkterweiterung erhalten.
- Native ClearType-/DWM-Renderingunterschiede, profilspezifische Aero-Farbe/Transparenz und weitere Appvarianten brauchen weitere Vergleichsabnahmen. Keine pauschale1:1-Fertigmeldung.
- Externer Link 'Weitere Designs online beziehen' führt zur aktuell verifizierten [Microsoft-Designinformation](https://support.microsoft.com/en-gb/windows/experience/personalization/personalize-your-windows-experience-with-themes); automatischer Import fremder Theme-Pakete ist damit nicht implementiert.
- Veröffentlichung zentral durch den anderen Agenten; kein paralleler Push/Deployment aus diesem Worktree.
