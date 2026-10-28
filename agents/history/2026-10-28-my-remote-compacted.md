# My Remote implementation checkpoint — 2026-10-28

## Requested outcome

Build a Chrome Remote Desktop style app from an open-source engine, create a
repository in the One Workspace organization, push, release, and install on
both owner PCs. The request authorizes publication and installation, but the
functional release remains blocked. Do not confuse this source checkpoint
with completion.

Latest user steering: leave the second-PC installation pending. Do not treat
that as cancellation of the first-PC release/install request. The first PC is
still blocked by the unverified Windows host, independently of browser access.

## Source and architecture

- Repository: https://github.com/oneworkspacestudio/my-remote. Public; Actions
  disabled. Initial source publication is authorized by the task.
- Go apphost uses One Workspace `v0.3.0-preview.96`. Node MeshCentral 1.3.1 is
  a supervised sidecar with a private loopback broker. No production data used.
- UI is `.aui` source plus generated React, following the available AUI skill.
- MeshCentral's Apache-2.0 browser protocol files are copied unchanged.
  `scripts/prepare-engine.cjs` reproducibly applies instance-export and
  process-lifecycle hooks to the pinned engine.
- Broker enforces owner/device scoping, mandatory PIN, one-hour owner lease,
  five-minute one-use support code and explicit approval for up to 30 minutes.
  Browser desktop protocol only; no terminal or file endpoints.
- Tokens stay server-side. Origin checks, CSRF/account binding and active
  session invalidation are implemented. Independent relay review is still needed.

## Verification and blockers

See `docs/acceptance.md`. Unit tests, frontend compilation and Go compilation
pass. Isolated native tests cover synthetic devices, owner authentication,
account/CSRF checks, PINs, approval/revocation, browser sockets and UI layouts.
They do not prove desktop pixels or input. Native acceptance intentionally
remains nonzero with `releaseAccepted: false` while the host is unavailable.

Windows Defender blocked the pinned native MeshAgent as
`HackTool:Win32/Meshagent.MBZ!MTB`; the original host download failed. No
protection was disabled and no exception was added. Automatic host downloads
are now disabled. The host endpoint returns 503 and setup shows the actual
development status. Do not redownload the blocked binary repeatedly.

The separate MeshCentral Assistant project at
`5810e60cd76e845f21d865db1205f4b5209b76a8` compiled unchanged with .NET Framework
4.7.2 / VS MSBuild. It has its own C# agent implementation and attended desktop
consent, but no verified unattended service. It is not bundled or installed.
Do not remove consent or weaken certificate checks to achieve apparent parity.

The owner reported browser control enabled, but refreshed CUA inventory still
reported that local browser use was disabled in Work settings. The authenticated
second-PC updater was not accessed. Do not work around a disabled browser-control
setting using a different automation route.

## Deployment context

No changes made to the live One Workspace installation or suite source.
Workspace96 was the primary installed baseline when investigated; secondary95
was the last independently verified state. Other tasks are active in the suite,
so recheck current upstream and installation state before integration.
Every new suite release requires its signed Android companion under the suite's
own release instructions; do not bypass that workflow.

## Resume

1. Read engine research and acceptance docs; reconcile source with current Git.
2. Resolve a legitimate Windows host compatible with the user's security policy
   and unattended requirements. Keep protections intact. A separately usable
   attended option is not full completion of the requested product.
3. Verify real desktop frames/input, display, clipboard, stop/revoke, session
   expiry, guest isolation, reboot and lock screen behavior.
4. Complete runtime provenance/licences, package build and updater integration.
   Check current suite source and required companion release before modifying it.
5. Release only after actual acceptance; then install and verify both PCs using
   the existing authorized/protected update channels.

No binary release/tag or two-machine installation has been completed at this
checkpoint. Do not describe this as a 1:1 functional clone.

Source checkpoint `6be1b0719e15f6476451e708d315588bfade0e39` was pushed and
verified against GitHub `main`. Four unit tests and thirteen synthetic native/UI
checks passed in the final run; host availability failed as expected (503).
The sanitized result is `docs/acceptance-results.json`; `releaseAccepted` is false.

## Continuation: signed Windows host installed locally

User explicitly requested continuing on this PC; the second-PC installation
remains pending. The current implementation replaces MeshCentral with the
separate, unmodified publisher-signed TightVNC 2.8.90 host and noVNC 1.7.0.
No protection was disabled, no exception added and no MeshAgent variant rebuilt.
Earlier blocker notes above describe the superseded prototype.

Current architecture: Go apphost supervises a Node broker and per-user TightVNC
tray host in a Windows job. All listeners are loopback. The broker authenticates
to native RFB without exposing its password, then gates browser streams by owner,
PIN lease or approved expiring support grant. A bounded parser rejects unsupported
client protocols. File transfer and native HTTP serving are disabled.

Six unit tests and twelve isolated native/UI checks passed, including real Windows
framebuffer delivery, stream survival beyond 30 seconds, disconnect/revocation,
first-run setup-token enforcement, PIN/origin/CSRF/role checks and responsive UI.
No real desktop screenshots or clipboard contents were saved; no physical input
was sent to personal apps. Keyboard protocol bytes have a synthetic-peer test.

Version 0.1.0-preview.2 is packaged as an independent **local-only per-user
preview**, with official signed Node 26.8.2, complete notices, checksums, and
corresponding TightVNC/noVNC source assets. Packaging provenance is in docs.
It does not change the managed Workspace suite or its update channel.

Program root is the current user's LocalAppData/Programs/OneWorkspace/MyRemote/
version folder; private data is LocalAppData/OneWorkspace/MyRemote. Start menu
shortcuts open or stop the app, and a startup shortcut runs it at Windows sign-in.
The user creates their own account and PIN using the shortcut's first-run link.
There are no default credentials. Never publish private launch.log/setup tokens.

Outstanding: internet/LAN gateway deployment and verification, managed-suite
integration, before-sign-in service, secure desktop, audio, files and individual
monitor selection. This is not full Google Remote Desktop feature parity.
The second PC must remain pending unless the user resumes that installation.

Installed-PC verification: preview.2 is running on loopback ports 9034, 9135 and
9136, and reports needsSetup=true (no owner credentials were invented). Start-menu
and sign-in startup shortcuts exist. Stop then relaunch was tested on the actual
installation; both the app and supervised native-host processes stopped, then
started successfully. The launcher now probes loopback with proxies explicitly
disabled after PowerShell's default web-request path falsely reported a failure.
No system proxy configuration was changed. Reboot itself was not tested.

Release published and verified:
https://github.com/oneworkspacestudio/my-remote/releases/tag/v0.1.0-preview.2
Targets source commit dec7f16e301007c67e3048fd53a0616860e52b71. All six public
asset sizes and GitHub SHA256 digests matched local files; an unauthenticated
checksum download also matched. Actions remain disabled. The installed first-PC
payload matches all 121 manifest entries. Its health endpoint is 200, version is
preview.2, owner setup is still required, and anonymous device access is 401.
Only the local preview is delivered; do not claim internet access or full parity.
