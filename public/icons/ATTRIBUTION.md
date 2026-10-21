# Windows 7 icons

Desktop artwork imported from the user-provided `Windows_7_Icon-Pack.zip`, “Biggest Windows 7's icons pack created by NhatPG”. Original Windows imagery; no ownership is claimed. The selection and source numbers are recorded in `scripts/import-desktop-icons.py`. Large images and 16px variants are generated from that selection.

Task button states and Show Desktop graphics: https://github.com/ramensoftware/windows-11-taskbar-styling-guide/tree/main/Themes/Windows7/ThemeResources . Based on the resource URLs supplied with this project; XAML configuration is not executed.

Start-menu background: https://github.com/Xalalau/Windows-7-Theme-Cinnamon/blob/master/cinnamon/menu-assets/menu-bg.png . B00merang/Xalalau theme, GPL v3; see CINNAMON-LICENSE.txt. Used as a background texture; the browser layout and interaction are implemented separately.

Taskbar texture and Start button sprite: https://github.com/EJSnow/Windows-7-skin (Taskbar_texture_bottom.png and Windows 7 start button 100%.png). Windows 7 lookalike artwork for Open-Shell; original sources and contributors are documented in the upstream README. These are visual assets; Open-Shell code is not embedded.

Source: https://github.com/B00merang-Artwork/Windows-7
Commit: b1577ced806262ae0caad89ed183d1d5b0336852
Original Win2-7 icon theme, contributors credited in the upstream README.

Reference navigation icons and Desktop/Downloads images: https://mirrors.equipable.org/ (Windows 7 imagery).

Windows 7 account pictures: https://archive.org/details/windows-7-user-account-pictures (BMP files converted to PNG, Microsoft Windows imagery).
Login background: https://github.com/TheJustRun/Dildows-7/blob/main/assets/logon.png (Windows 7 imagery).

Editor toolbar: Notepad++ official repository, PowerEditor/src/icons/standard/toolbar/*.bmp, converted to transparent PNG. Source: https://github.com/notepad-plus-plus/notepad-plus-plus . License: GNU GPL Version 3 with the clarifications and exceptions in NOTEPAD-PLUS-PLUS-LICENSE.txt. The editor's browser engine is CodeMirror (MIT); Notepad++ source code is not embedded as an application.

VLC cone: https://github.com/videolan/vlc/blob/master/share/icons/128x128/vlc.png . VideoLAN VLC, see VLC-COPYING.txt (GNU GPL v2 or later). Browser playback is implemented with HTMLMediaElement; libVLC is not embedded. QA video: MDN CC0 flower sample, https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4 (temporary test asset only).

Aero window decorations and toolbar: `icons/aero/` from Xalalau/Windows-7-Theme-Cinnamon (`metacity-1`, `gtk-2.0/Toolbar`), GPL-3.0. Import with `scripts/import-aero-assets.mjs`. License: `CINNAMON-LICENSE.txt`.

Explorer navigation buttons, search and refresh: `icons/aero/nav-*.png` from the previously supplied B00merang-Artwork/Windows-7 icon source (`actions/25` and `actions/16`).

Explorer command bar, hover/selection surfaces and details pane: `icons/aero/command-*.png`, `item-*.png`, `details-pane.png` from https://mirrors.equipable.org/ (Windows 7 interface imagery supplied as a project reference). Import: `scripts/import-explorer-surfaces.mjs`.

The 16px library document, music, pictures and videos symbols use the native small variants `filesystems/16/folder-*-2` (`folder-documents2.png`, etc.) from B00merang-Artwork/Windows-7, rather than scaled user-folder images.

Caption glyphs (`icons/aero/caption-*.png`) and search-vector artwork from https://github.com/khang-nd/7.css (`gui/icon`), MIT license, retained in `7CSS-LICENSE.txt`. The controls use separate glyphs and backgrounds to preserve original-size symbols and Windows 7 button proportions.

Navigation sprite (`icons/aero/navigation-states.png`): https://github.com/yuvia08/rinfox_updated, `rinfox/English/chrome/images/navigation.png`, original RinFox artwork credited upstream to travis. Normal, hover/pressed and disabled states are selected from the sprite; the dark blue state is used on hover. Import with `scripts/import-navigation-sprite.mjs`.
