# Spotify Desktop Player

The desktop application uses Spotify's official Web Playback SDK. Music streams directly from Spotify to the user's browser. The separate `spotify` Docker service handles OAuth PKCE, encrypted token storage and the allowlisted Spotify Web API requests. The desktop gateway authenticates each request using the current desktop session and a signed internal request. Shared/guest desktops cannot link Spotify accounts.

## Setup

1. Sign in at https://developer.spotify.com/dashboard and create an app with Web Playback SDK and Web API enabled. Accept Spotify's developer terms yourself.
2. Register exactly `https://explorer.xserverx.app/api/spotify/callback` as redirect URI. Substitute your own HTTPS hostname if deploying elsewhere.
3. Add to the server `.env`:

   ```dotenv
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_REDIRECT_URI=https://explorer.xserverx.app/api/spotify/callback
   SPOTIFY_SERVICE_SECRET=generate_a_random_secret_of_at_least_32_characters
   ```

   Generate a secret with `openssl rand -hex 32`. Preserve it with backups: it also encrypts stored refresh tokens. A Spotify client secret is not required for PKCE. Never add passwords or secrets to Git.
4. Append `compose.spotify.yaml` to the existing `COMPOSE_FILE` list. Preserve all other service entries, then run `docker compose up -d --build spotify explorer` in the deployment folder.
5. Open Spotify from the desktop Start menu or `/spotify`. Each desktop user authorizes their own Spotify account once. Spotify Premium is required for SDK music playback. Refresh tokens survive service restarts in `spotify-data`, encrypted with AES-256-GCM.

Development-mode apps have Spotify's current account and user allowlist limits. Add permitted users under the app's User Management settings; broader use requires Spotify approval. See https://developer.spotify.com/documentation/web-api/concepts/quota-modes.

## Available functions

- Personal Spotify connection, renewal and disconnect.
- Track search, first 50 playlists and first 50 items in each playlist.
- Play tracks in the browser, Spotify Connect device transfer, pause, resume, skip, seek and volume.
- Current artwork, artists and an external Spotify link.
- Start-menu entry, taskbar/window integration and lock/workspace restoration.

The service has no published host port. Only `/health` is unsigned and reports service/configuration readiness without account data. Browser tokens are delivered only to the authenticated personal session for the official SDK, never persisted in localStorage. OAuth state expires after ten minutes and is bound to the desktop user. API scopes are limited to playback, profile information and playlist reading; the app does not edit playlists.

Without a configured Developer app, the container still starts and the UI displays setup instructions. Live authorization and playback cannot be validated until a Client ID is configured and a Premium user authorizes the app.
