# Acceptance: 0.1.0-preview.2

This release is a local-only, per-user Windows preview. Six unit tests and twelve
native/UI checks passed. The detailed results are in `acceptance-results.json`.

## Verified

- Official TightVNC and Node publisher signatures and pinned SHA256 values.
- Signed Windows host startup with authenticated loopback-only listener.
- Real Windows framebuffer delivered into the noVNC browser canvas.
- Stream remains connected beyond its initial connection-timeout window.
- Explicit disconnect terminates the stream and revokes its connection lease.
- Disabling access denies further connections.
- Anonymous/forged identities, non-owner accounts, wrong PIN and cross-origin
  sockets are rejected. Mutations require CSRF/account context.
- First-run owner creation requires the one-time local setup link and works in UI.
- Support code redemption requires approval; approval grants and revocation
  removes access. Code reuse, expiry and rate limits have unit coverage.
- Desktop and phone management screens render without runtime errors or overflow.
- The bridge authenticates the native host without revealing its password,
  forwards synthetic keyboard protocol bytes and rejects unsupported commands.

## Limits

The test used synthetic app accounts. It did not save a desktop image or send
input to the owner's personal apps. Physical keyboard/mouse behavior, clipboard
contents, reboot/logon persistence and secure-desktop behavior were not exercised.
No internet or LAN connection test was performed. The installed endpoint remains
local-only until an authenticated HTTPS gateway is configured and tested.

The per-user host runs after Windows sign-in. There is no pre-login service,
audio, file transfer or individual-monitor selection in this preview. The
second-PC installation is intentionally pending at the user's request.

The earlier MeshCentral host-download failure remains in history. It is resolved
for this local preview by switching to a different signed, unmodified host,
without disabling Windows protection or adding an exception.
