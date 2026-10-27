# Classic GNOME Nibbles web adaptation

The game uses the original 92 × 66 boards, all 26 levels, SVG artwork and eight Ogg sound effects from GNOME Nibbles, tag `GNOME_NIBBLES_3_8_1`:
https://github.com/GNOME/gnome-nibbles/tree/GNOME_NIBBLES_3_8_1

Authors include Sean MacIsaac, Ian Peters, Andreas Røsdal and the GNOME contributors. Original copyright and individual artwork license notices remain embedded in the SVG files. GNOME Nibbles and this adaptation are GPL-2.0-or-later; the license is in COPYING.txt. See SOURCES.json for the upstream path and SHA-256 of each imported asset and original level file. The PNG application icons in ../icons/nibbles.png and ../icons/nibbles-16.png are the 48px and 16px gnome-nibbles.png icons from the same upstream tag.

The web engine and frontend are public/nibbles-engine.js, public/nibbles.js, public/nibbles.css and public/nibbles-profile.js. The port is based on the classic rules and uses the original visual assets; browser dialogs and the outer Aero window integrate into this desktop. The AI is a new implementation using obstacle avoidance and flood-fill lookahead. Multiplayer is local on one keyboard, with up to six total worms controlled by humans or the computer. There is no network game lobby.

Settings and personal top-ten scores per speed/fake-bonus category are stored in the authenticated account. Scores are client-reported, not a competitive verified online leaderboard. Locking saves the complete game in the existing server-side workspace; restoration pauses until the player resumes. Merely refreshing without locking follows the desktop's existing workspace behavior.

Reimport original assets with `node scripts/import-nibbles.mjs`. Engine, profile and HTTP integration checks: `node --test nibbles.test.mjs`.
