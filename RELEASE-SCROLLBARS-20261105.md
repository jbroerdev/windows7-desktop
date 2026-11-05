# Selective Windows 7 scrollbar release

The Explorer, text editor, shared file picker and network Status/Details dialogs use a scoped native scrollbar skin. The native controls retain scrolling, keyboard handling and focus. Read-only CodeMirror receives a tab stop so Ctrl+End can navigate without enabling edits.

The rollout is restricted to #explorer-window, .text-app-window, .win7-file-picker and .network-status-window. Document viewport and frame adoption are disabled. Other application groups remain unchanged and require separate verification.

Validation: 19 isolated actual-app checks; 17 Chromium integration checks; four component checks; 363 existing Node checks (362 passed, one skipped). Independent review verified all eight product hashes and the four app surfaces, with no observed outside-scope skin. The local source archive lacked 139 original wallpaper JPEGs; existing original assets were restored for the complete local suite. This is test preparation, not a product change.

Remaining limits: Chromium native arrow movement is 40 pixels versus the observed Windows ListView 17 pixels. Full pressed/autorepeat/forced-color and Firefox behavior, the other 13 app groups, and production acceptance remain separate gates. No networking or host-write changes are included.