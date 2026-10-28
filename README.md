# My Remote

My Remote provides a Chrome Remote Desktop inspired interface for viewing and
controlling a Windows PC through a browser. It is an independent One Workspace
project and is not affiliated with Google.

**Current release: local preview for a signed-in Windows user.** It includes a
signed TightVNC host, noVNC browser viewer, account sign-in, access PINs and
approved temporary support sessions. A real Windows screen stream and access
revocation have been tested. Internet access, a pre-login Windows service,
audio and file transfer are not included in this preview.

## Install on Windows

Download the Windows x64 package from [Releases](https://github.com/oneworkspacestudio/my-remote/releases),
extract it, and run `install.ps1` with PowerShell. It installs for the current
Windows account without administrator privileges. The installer preserves
existing TightVNC installations by refusing to overwrite their configuration.

Open **My Remote** from the Start menu. On first use, create your owner account,
then choose **Set up remote access** and set your computer name and PIN.
**Stop My Remote** stops both the app and its supervised Windows host. The app
starts quietly at Windows sign-in. See [installation details](docs/INSTALLING.md).

The default address is `http://localhost:9034/remote/`. This is deliberately a
local-only preview; it is not yet a link you can use from another computer.
An authenticated HTTPS gateway and its deployment tests remain outstanding.

## What works in this preview

- Google-style Remote Access and Remote Support screens on desktop and phone.
- Account and PIN protection for desktop connection leases.
- One-use support codes, owner approval, expiry and revocation.
- A real Windows screen stream through the noVNC canvas.
- Fullscreen, fit-to-window, quality and view-only controls.
- Upstream keyboard, mouse, touch and text clipboard support, with explicit UI
  actions. Physical input and clipboard were not exercised against the owner's
  personal desktop during automated validation.

The native host requires a random private password and listens only on loopback.
The authenticated bridge performs native authentication server-side, so the
native password is never sent to a browser. File-transfer and terminal protocols
are not exposed. This is not full Google Remote Desktop feature parity.

## Development

```powershell
./scripts/build.ps1
npm test
node scripts/local-acceptance.cjs
```

Native acceptance requires the signed host in the ignored `host/` directory and
Node in the ignored `node.exe` path. It uses fresh synthetic app accounts and a
short-lived loopback host configuration. It verifies a real framebuffer without
saving the desktop image or sending input to personal apps. See
[acceptance](docs/acceptance.md), [engine research](docs/engine-research.md) and
[packaging](docs/INSTALLING.md).

UI trees live in `web/src/screens/*.aui`; generated React lives in
`web/src/generated`. The Go app embeds the UI and supervises its Node bridge and
Windows host. Dependencies are pinned in npm lockfiles and `go.mod`/`go.sum`.

## Licences and previews

The application is Apache-2.0. Unmodified TightVNC runs as a separate GPL-2.0
executable over the RFB protocol; its complete corresponding source is supplied
with the release. noVNC is MPL-2.0. Runtime and dependency notices are included.
See [third-party notices](docs/third-party-notices.md).

[Synthetic desktop UI](docs/screenshots/remote-access-desktop.png) ·
[Synthetic phone UI](docs/screenshots/remote-support-phone.png)
