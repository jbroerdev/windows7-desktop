# Minesweeper

The user's reference is classic Windows Minesweeper: gray raised squares, red seven-segment counters, a yellow reset face inside the shared Windows 7 Aero frame. The frontend recreates this in CSS/SVG. It uses the existing desktop.register window manager, taskbar, resize handles, display transfer and server-side workspace persistence. No independent window manager is added.

Beginner: 9 × 9 / 10 mines; intermediate: 16 × 16 / 40; expert: 30 × 16 / 99. Custom fields support 9–30 columns, 9–24 rows and 10–668 mines, limited further to leave nine safe squares. A first click opens an empty area. Right-click or Shift+click cycles flags/question marks; double-click, middle-click and simultaneous buttons chord. Arrow keys select, Space/Enter reveal, F marks, C chords. Long touch marks a square. F2 starts a game, F4 opens statistics, F5 options, F7 appearance and F1 help.

The classic appearance is the default. Optional blue/green tiles and flowers remain available through appearance settings. All SVG artwork and the synthetic sound cues are authored for this implementation. PNG application icons are rasterizations of public/icons/minesweeper.svg, reproducible using scripts/render-minesweeper-icon.mjs with sharp available. Visual references: the user-provided classic screenshot, and the Windows 7 options screenshots at https://www.kodyaz.com/articles/how-to-change-appearence-windows-minesweeper-game-style.aspx . This is a web recreation, not the Windows executable or original game assets/audio.

Authenticated preferences, personal statistics and explicitly saved games use /api/minesweeper. Profile locking captures the complete board, marks, elapsed active time and window geometry using the shared workspace API. Restored games pause until resumed. Save-on-exit and continue-saved-game options are supported. Guests play without persistent statistics. Each result is deduplicated by game id; records are client-reported and not an anti-cheat online leaderboard. Statistics include games/wins, percentage, winning/losing streaks and five best times per difficulty. Resetting statistics requires confirmation.

Tests: node --test minesweeper.test.mjs .

Additional visual/interaction inspiration supplied by the user: https://github.com/nickarocho/minesweeper/blob/master/readme.md . The port keeps its own game engine, artwork and desktop integration; no repository code or font files are copied.
