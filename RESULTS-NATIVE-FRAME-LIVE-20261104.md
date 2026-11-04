# Native frame release – 2026-11-04,22:27 MEZ

Published exactly two static files to both /opt/windows7-desktop/public and /opt/windows7-host/app/public, with no service restart. windows7-desktop remains active. App containers untouched.

- aero.css: calibrated active/inactive shadows, neutral inactive transparent glass, black inactive caption text. Excludes the five provisional grouped-task-button lines at the end of the current working copy. Personal appearance colors/defaultAppearance were not changed.
- calculator.js: standard/statistics width and registration minimum227→228. No arithmetic or other mode changes.

Production aero.css was compared to the committed baseline before publication and matched. Backup of all four original source/runtime paths: /var/tmp/native-frame-before-20261104.tar.gz. Deployed package /var/tmp/native-frame-20261104.tar.gz, SHA256942526664ba008bf8300deef3e4dcb51e2218b4110024178d3cfab82f5911358.

Exact source/runtime hashes, also matching the files actually served through the public site:
- aero.css91ebd2c4bb41fd93c709dff4768534d69ecf0b84c0845b3a334373f25959c0d7
- calculator.js1e4f2104c2399bd265dec0df3c84116733520b8f991a41b3e155aa2662351838

Prior reference evidence: RESULTS-AERO-SHADOW-CALIBRATION.md, RESULTS-AERO-INACTIVE-GLASS.md, RESULTS-AERO-CAPTION-COLOR.md, RESULTS-CALCULATOR-WIDTH.md. Integrated Windows suite331pass/1skip; isolated Linux suite332/332pass. Excluding prototype CSS did not add behavior and was independently confirmed in the served response.

Fresh authenticated production tab: opened Rechner through Start; measured228×322, active blur14+saturate1.25 and exact calibrated shadow. Opened Systemsteuerung: Rechner inactive with rgba255255255/.07, blur14 without extra saturation, black caption and calibrated inactive shadow. Both frames visually inspected in the saved raw screenshot. Evidence .asset-cache/native-frame-live-active-inactive.png and native-frame-live-check.json. Closed only the two test-opened windows and the test tab afterwards.

This is a verified selective static release, not completion of all Aero, Calculator, Start or Windows7 requirements. RDP remains1c730c3 locally pending its independent final check. Start/Jump/CPL/backend changes remain unpublished. Himmelswatch/default color remains unpublished. Existing GitHub publication requirement remains open; local git commits do not imply a website upload.
