# Server-Browser

Chromium runs in a separate Docker service. The desktop supplies its own Aero
window, tabs and navigation bar. Only page pixels are streamed from Chromium;
the page cannot access the desktop DOM. No X11 desktop, VNC login or public CDP
port is exposed. Open **Server-Browser** from Start or `/server-browser`.

## Install

Generate a fresh random `BROWSER_SERVICE_SECRET` of at least 32 characters in the
server `.env`, add `compose.browser.yaml` to the existing `COMPOSE_FILE`, then:

```sh
docker compose build browser explorer
docker compose up -d --wait browser explorer
```

The service uses Debian's security-maintained Chromium package with Playwright
1.64.1, runs as the unprivileged `node` user
with Chromium sandbox enabled, and includes the upstream Playwright seccomp
profile (MIT, Microsoft; see `services/browser/THIRD-PARTY.md`). On hosts that
forbid unprivileged user namespaces, configure the host to support Chromium's
sandbox. Do not work around launch errors with `--no-sandbox` or privileged mode.

The service has a separate egress network, no published ports, an internal API
network, a 512 MiB memory limit (768 MiB including swap), one CPU and a configurable
default of one simultaneous user browser process, with up to four tabs. Increase
these limits only on hosts with sufficient free memory. The small Webdock host
needs swap headroom; builds should use `docker build --memory=256m
--memory-swap=512m --cpu-quota=50000 ...` to protect existing services. Every desktop user gets a
separate Chromium process and persistent profile directory in `browser-profiles`.
Share guests cannot use it. Closing the desktop window disconnects the stream;
after five idle minutes the browser exits cleanly, retaining its profile.
Provider logout, expiry and device-binding rules still apply.

## Transport and security

- Signed internal requests bind method, route, body, timestamp and the authenticated
  desktop user's ID. Browser-provided user IDs are never trusted.
- Stream authorization is rechecked every two seconds, including lock/logout.
- Page images use CDP JPEG screencasting over an authenticated same-origin SSE
  endpoint. Frames are dropped for slow consumers. Input is ordered per profile.
- The UI supports navigation, tabs, popup tabs, mouse, wheel, keyboard, text paste
  and viewport resizing. A toolbar keyboard button exposes a text input for mobile
  keyboards. Ctrl+L/T/W/Tab/R operate the desktop browser controls when forwarded by the host browser. Page dialogs are dismissed with a status notice.
- Browser traffic uses a loopback forward proxy which rejects private and reserved
  destinations, resolves every connection and pins it to the checked address.
  HTTP port 80 and HTTPS CONNECT port 443 are supported. Private LAN sites are
  intentionally unavailable. Certificate verification remains enabled.
- Session cookies and open tab addresses are additionally checkpointed every 30 seconds and at clean shutdown
  using AES-256-GCM, with a key derived from the service secret and user ID. Cookie
  expiry is respected. Cookies are never exported to the frontend or the desktop's shared drive.
  The persistent profile is sensitive and must only be backed up to private storage;
  use host disk encryption for encryption at rest. This initial version does not
  claim application-level encryption of Chromium's whole profile.

## Downloads

Downloads are handed to the desktop service automatically and stored in the
initiating user’s Downloads folder. Transfers are signed, streamed and SHA-256
verified; the browser service never mounts the desktop filesystem. Duplicate
names receive a numbered suffix, while retries of the same transfer are
idempotent. Completed files wait in a private durable queue if the desktop is
unavailable, including after the UI disconnects. Maximum size is 128 MiB per
file, with at most two active captures and a bounded pending queue.

## Current limits

This is a page-streaming browser, not a full Chrome replacement. Audio, camera,
microphone, file uploads, remote-to-local clipboard copy, native browser
permission prompts, password-manager integration and smooth mobile gestures are
not implemented. Video and fast scrolling consume more bandwidth than local
rendering. Some providers reject automated/headless browsers or require a fresh
login. The canvas stream does not expose the remote page's accessibility tree.

## Checks

`node --test services/browser/test.mjs` checks authentication, stream revocation and
network destination policy without installing Chromium. With service dependencies
and Chromium installed, `node --test services/browser/smoke.mjs` additionally tests
actual rendering, typing, popup tabs, account separation and persistent cookies
against an isolated test fixture. No real account is used in these tests.
