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
