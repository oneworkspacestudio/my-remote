# My Remote

My Remote lets a Workspace owner share and control their signed-in Windows desktop
through a browser. It uses TightVNC and noVNC, with a Google Remote Desktop inspired
interface. It is an independent One Workspace app and is not affiliated with Google.

## Get started

Install or update [One Workspace](https://github.com/oneworkspacestudio/one-workspace/releases)
to version 0.3.0-preview.104 or later. Open **My Remote** in the Workspace app picker
and sign in with MyAccounts. Choose **Set up remote access**, a computer name and
your own PIN. Desktop access stays off until you enable it.

My Remote is managed by Workspace: installation, startup, sign-in, updates and
backups use the same controls as the other apps. The separate app release is a
component package for Workspace, not another installer to run on each PC.
See [installation and migration](docs/INSTALLING.md).

## What you can do

- Connect with your Workspace owner account and a PIN.
- Approve a temporary support request using a one-use code; revoke it at any time.
- View the desktop, fit it to the window, use fullscreen, adjust quality or choose
  view-only mode. Keyboard, mouse, touch and explicit text clipboard controls use noVNC.

This preview works while the Windows user is signed in. Access before sign-in,
secure-desktop control, audio, file transfer and individual monitor selection are
not included. It does not provide full Google Remote Desktop feature parity.
Use Workspace's authenticated HTTPS address for network access; never expose the
private VNC or bridge listeners. Physical input/clipboard and two-PC network desktop
acceptance remain separate from synthetic UI and authentication checks.

## Development

Build with `scripts/build.ps1`, run `npm test`, and use
`scripts/managed-acceptance.cjs` with a fresh named NTFS fixture root and exact
packaged executable. It checks idle startup without configuring the Windows host.
Do not run native enrollment tests against an existing TightVNC configuration or
use personal accounts/files as fixtures. See [acceptance](docs/acceptance.md).

UI trees live in `web/src/screens/*.aui`; generated React lives in
`web/src/generated`. The Go app embeds the UI and supervises its Node bridge and
Windows host. Dependencies are pinned in npm lockfiles and `go.mod`/`go.sum`.

## Licences

The application is Apache-2.0. Unmodified TightVNC runs as a separate GPL-2.0
executable over RFB; complete corresponding source accompanies the release.
noVNC is MPL-2.0. Runtime and dependency notices are included. See
[third-party notices](docs/third-party-notices.md).
