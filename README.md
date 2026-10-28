# My Remote

A browser remote desktop application for One Workspace, with Remote Access and
Remote Support screens inspired by Chrome Remote Desktop. It uses MeshCentral's
Apache-2.0 engine and desktop protocol. This is an independent project, not a
Google product.

**Development checkpoint — not a working remote desktop release yet.** The UI,
authenticated broker and support approval flows are implemented and tested with
synthetic devices. Real desktop pixels, input and unattended access have not
passed acceptance. No installation on either target PC has been completed.

## What is implemented

- Responsive Remote Access and Remote Support screens, device names/status,
  settings, PIN entry, owner sign-in and temporary support requests.
- Workspace apphost authentication, account binding and CSRF protection.
- Salted PIN verification, owner-scoped computers, expiring access leases,
  one-use support codes and explicit owner approval/revocation.
- A private loopback MeshCentral broker; engine authentication tokens stay on
  the server. Browser relays are restricted to desktop protocol and authorized
  devices. Terminal and file protocols are not exposed.
- Desktop canvas and controls for display selection, fit, quality, fullscreen,
  view-only input and explicit text clipboard. These controls need a real host
  acceptance test before they can be described as working end to end.

## Release blockers

The pinned native Windows MeshAgent was blocked by Windows security during
isolated testing. No protection was disabled and no exception was added.
Automatic agent downloads are disabled in this checkpoint; the host-download
endpoint deliberately returns 503, and setup explains that the host is not yet
available.

The separate MeshCentral Assistant C# project builds successfully, but its
attended-session design is not an unattended Windows service replacement. It
has not been included or deployed. See [engine research](docs/engine-research.md)
and [acceptance status](docs/acceptance.md).

## Development

Windows is the current target. The build was checked with Node 26.8.2, npm,
Go 1.27.3 and Windows Chrome for the isolated UI tests. Dependencies are pinned
in both npm lockfiles and `go.mod` / `go.sum`.

```powershell
./scripts/build.ps1
npm test
node scripts/native-acceptance.cjs
```

The build installs locked dependencies without lifecycle scripts, applies two
documented MeshCentral integration hooks, generates React from `.aui` screens,
and builds `dist/MyRemote.exe`. It is a development executable; its runtime
still needs the Node executable, `engine/` and installed root dependencies.
For local development only, set `MY_REMOTE_RUNTIME` to this source directory
and provide a compatible `node.exe` there. Do not publish that local runtime as
a release package without provenance, licences and acceptance checks.

Use fresh private test data and a loopback listener. The native acceptance test
creates synthetic accounts and devices in a fresh sibling directory. It exits
nonzero while the host is unavailable, and always records
`releaseAccepted: false` until real desktop validation is implemented.

## Structure

| Path | Purpose |
| --- | --- |
| `cmd/my-remote`, `internal/app` | Go apphost, authenticated proxy and managed engine process |
| `engine` | Private MeshCentral broker and support/PIN rules |
| `web/src/screens` | Authoritative AUI screen definitions |
| `web/src/generated` | Generated React screen trees |
| `web/src/main.tsx` | State and engine interaction |
| `scripts` | Reproducible engine preparation, build and isolated checks |
| `agents/history` | Compact implementation handoff |

## Licence

UI previews from synthetic test data:
[desktop](docs/screenshots/remote-access-desktop.png) ·
[phone](docs/screenshots/remote-support-phone.png).

Apache-2.0. See [LICENSE](LICENSE), [NOTICE](NOTICE), and
[third-party notices](docs/third-party-notices.md). Upstream desktop protocol
files retain their original headers. No Google logos or source are included.
