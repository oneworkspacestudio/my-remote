Workspace sign-out now revokes owner stream leases through a manager-only, loopback and client-secret authenticated channel. Unit tests verify immediate owner-stream termination, independent guest grants, idle idempotence and rejection of browser/nonlocal/incorrect credentials. Active real-desktop sign-out still needs clean-host qualification.

## Owner setup diagnostics - preview.8

Bundled configuration, verification and migration scripts use Windows' process-only
execution-policy option for application-hosted scripts. No machine/user policy is
written; Group Policy retains precedence. The trusted command environment, host
hash/publisher checks, private ACLs and existing-host ownership guards remain.
Setup failures return an allowlisted reason code instead of discarding the useful
error category. Raw PowerShell output, arguments and secrets are never returned
or logged. The owner-only GET `/api/remote/setup-diagnostics` reports bounded enum
values for effective and Group Policy script policies, language mode, host
publisher validation and private-volume filesystem. It performs read-only checks;
it does not change policies, host configuration or enrollment.

Seventeen Node regressions include an actual Windows PowerShell Restricted-policy
failure, successful read-only diagnostics and full host configuration with a
restricted parent in the minimal supervised environment. The latter uses fresh
NTFS data and a unique test registry namespace; no owner host is configured.
Separate policy snapshots confirm machine/user settings are unchanged. Exact
packaged acceptance passes owner-only diagnostics, idle startup, CSRF/PIN checks,
no credentials created and mobile rendering. All 124 manifest payload paths match7.
This reproduces a further compatibility gap, but does not establish the policy
on either owner's PC. Host activation and the second-PC root cause remain pending
until observed; diagnostics alone are not proof of desktop activation.

# Managed delivery acceptance - preview.5

The current component requires Workspace104. Re-enable tests check host startup before commit, failure preserving disabled state and PIN validation before activation. Eleven bridge/security/lifecycle unit tests and
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
