const action=(label,target)=>({label,target});
const text=label=>({label});

// German Home-Premium labels in the parent view are transcribed from the
// owner-provided Windows 7 SP1 screenshot. Deeper links follow the same
// German Windows 7 category names; edition-specific items are labelled.
export const controlPanelCategories={
 system:{title:'System und Sicherheit',icon:'/icons/control-panel/system.png',groups:[
  {title:'Wartungscenter',items:[action('Status des Computers überprüfen','maintenance'),action('Einstellungen der Benutzerkontensteuerung ändern','uac'),action('Probleme erkennen und beheben','troubleshooting')]},
  {title:'Windows-Firewall',items:[action('Firewallstatus überprüfen','firewall'),action('Programm über die Windows-Firewall kommunizieren lassen','firewall-apps')]},
  {title:'System',items:[action('Arbeitsspeicher und Prozessorgeschwindigkeit anzeigen','system-info'),action('Remotezugriff zulassen','remote-access'),action('Computernamen anzeigen','system-info')]},
  {title:'Windows Update',items:[action('Automatische Updates aktivieren oder deaktivieren','windows-update'),action('Installierte Updates anzeigen','installed-updates')]},
  {title:'Energieoptionen',items:[action('Energiesparmodus ändern','power'),action('Energieoptionen ändern','power')]},
  {title:'Sichern und Wiederherstellen',items:[action('Sicherung des Computers erstellen','backup'),action('Dateien aus einer Sicherung wiederherstellen','restore')]},
  {title:'Verwaltung',items:[action('Festplattenpartitionen erstellen und formatieren','disk-management'),action('Ereignisprotokolle anzeigen','event-viewer')]}
 ]},
 network:{title:'Netzwerk und Internet',icon:'/icons/control-panel/network.png',groups:[
  {title:'Netzwerk- und Freigabecenter',items:[action('Netzwerkstatus und -aufgaben anzeigen','network-center'),action('Verbindung mit einem Netzwerk herstellen','connect-network'),action('Heimnetzgruppen- und Freigabeoptionen auswählen','sharing')]},
  {title:'Heimnetzgruppe',items:[action('Kennwort für die Heimnetzgruppe anzeigen','homegroup'),action('Erweiterte Freigabeeinstellungen ändern','sharing')]},
  {title:'Internetoptionen',items:[action('Startseite ändern','internet-options'),action('Browser-Add-Ons verwalten','internet-options'),action('Browserverlauf und Cookies löschen','internet-options')]}
 ]},
 hardware:{title:'Hardware und Sound',icon:'/icons/control-panel/hardware.png',groups:[
  {title:'Geräte und Drucker',items:[action('Geräte und Drucker anzeigen','devices'),action('Gerät hinzufügen','add-device'),action('Erweiterte Druckereinrichtung','printers')]},
  {title:'Automatische Wiedergabe',items:[action('Medien oder Geräte automatisch wiedergeben','autoplay')]},
  {title:'Sound',items:[action('Lautstärke anpassen','sound'),action('Audiogeräte verwalten','sound'),action('Systemklänge ändern','sound')]},
  {title:'Energieoptionen',items:[action('Energiesparmodus ändern','power')]},
  {title:'Anzeige',items:[action('Bildschirmauflösung anpassen','display')]}
 ]},
 programs:{title:'Programme',icon:'/icons/control-panel/programs.png',groups:[
  {title:'Programme und Funktionen',items:[action('Programm deinstallieren','programs'),action('Installierte Updates anzeigen','installed-updates'),action('Windows-Funktionen aktivieren oder deaktivieren','windows-features')]},
  {title:'Standardprogramme',items:[action('Standardprogramme festlegen','default-programs'),action('Dateityp immer mit einem bestimmten Programm öffnen','file-associations'),action('Einstellungen für automatische Wiedergabe ändern','autoplay')]},
  {title:'Desktopgadgets',items:[action('Desktopgadgets anzeigen und verwalten','gadgets')]}
 ]},
 accounts:{title:'Benutzerkonten und Jugendschutz',icon:'/icons/control-panel/accounts.png',groups:[
  {title:'Benutzerkonten',items:[action('Benutzerkonten hinzufügen oder entfernen','accounts'),action('Kontotyp ändern','accounts'),action('Anmeldekennwort ändern','accounts')]},
  {title:'Anmeldeinformationsverwaltung',items:[action('Web- und Windows-Anmeldeinformationen verwalten','credentials')]},
  {title:'Jugendschutz',items:[action('Jugendschutz für beliebige Benutzer einrichten','parental-controls')]}
 ]},
 appearance:{title:'Darstellung und Anpassung',icon:'/icons/control-panel/appearance.png',groups:[
  {title:'Anpassung',items:[action('Design ändern','background'),action('Desktophintergrund ändern','wallpapers'),action('Fensterfarben ändern','colors'),action('Bildschirmschoner ändern','screensaver')]},
  {title:'Anzeige',items:[action('Text und andere Elemente vergrößern oder verkleinern','display'),action('Bildschirmauflösung anpassen','display'),action('Anzeigegeräte verbinden','display')]},
  {title:'Taskleiste und Startmenü',items:[action('Taskleiste anpassen','taskbar')]},
  {title:'Center für erleichterte Bedienung',items:[action('Visuelle Darstellung des Bildschirms optimieren','access')]}
 ]},
 region:{title:'Zeit, Sprache und Region',icon:'/icons/control-panel/region.png',groups:[
  {title:'Datum und Uhrzeit',items:[action('Datum und Uhrzeit einstellen','date-time'),action('Zeitzone ändern','date-time'),action('Uhrzeit für verschiedene Zeitzonen hinzufügen','date-time')]},
  {title:'Region und Sprache',items:[action('Tastaturen und Eingabemethoden ändern','input-methods'),action('Anzeigesprache ändern','display-language'),action('Datums-, Uhrzeit- oder Zahlenformat ändern','regional-format')]}
 ]},
 access:{title:'Erleichterte Bedienung',icon:'/icons/control-panel/access.png',groups:[
  {title:'Center für erleichterte Bedienung',items:[action('Einstellungen empfehlen lassen','access-wizard'),action('Visuelle Darstellung des Bildschirms optimieren','access-display'),action('Computer ohne Bildschirm verwenden','narrator'),action('Computer ohne Maus oder Tastatur verwenden','on-screen-keyboard'),action('Mausbedienung erleichtern','mouse-keys'),action('Tastaturbedienung erleichtern','keyboard-access'),action('Text oder visuelle Alternativen für Sounds verwenden','sound-access')]},
  {title:'Spracherkennung',items:[action('Spracherkennung starten','speech-recognition'),action('Mikrofon einrichten','microphone-setup')]}
 ]}
};

export function getControlPanelCategory(categoryId){return Object.prototype.hasOwnProperty.call(controlPanelCategories,categoryId)?controlPanelCategories[categoryId]:null;}
