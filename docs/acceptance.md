# Managed delivery acceptance - preview.3

The current component requires Workspace104. Six bridge/security unit tests and
the exact packaged executable's fresh NTFS idle-start test pass. Owner sign-in,
CSRF denial, invalid-PIN rejection before activation, no host credentials created,
phone rendering with no overflow/errors and child cleanup are checked by
`scripts/managed-acceptance.cjs`. Set MY_REMOTE_QA_ROOT to a new named fixture root
and MY_REMOTE_QA_EXE to the exact package executable; never use owner data.

Desktop access is intentionally off on installation. This run does not configure
the real Windows registry or capture the personal desktop. The RFB adapter is
unchanged from preview.2's real framebuffer acceptance below. Fresh Workspace
setup/upgrade, shared sign-in, public gateway and update/recovery checks are
recorded in the Workspace repository. Do not claim a second-PC, reboot, physical
phone, secure desktop or new end-to-end input test without performing one.

The older local-acceptance script changes per-user host configuration. Run it only
on an isolated Windows account/machine without any existing TightVNC host; it is
not safe as an unattended regression test on a personal installation.

## Earlier prototype and standalone evidence

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
