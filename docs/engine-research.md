# Remote desktop engine research

Checked 2026-10-28 against official sources and locally downloaded source.

| Project | Licence | Fit and tradeoff |
| --- | --- | --- |
| [MeshCentral](https://github.com/Ylianst/MeshCentral) | Apache-2.0 | Browser desktop, Windows hosts, display/clipboard/relay support. Chosen for the prototype. |
| [RustDesk](https://github.com/rustdesk/rustdesk) | AGPL-3.0 | Strong native clients. Redistribution obligations and separation between open-source and Pro features require care. |
| [Apache Guacamole](https://guacamole.apache.org/) | Apache-2.0 | Mature browser RDP/VNC/SSH gateway, but requires a different server/host setup. |
| [Remotely](https://github.com/immense/Remotely) | GPL-3.0 | Potential .NET alternative with browser support. Not implemented or validated here. |

The product reference is Google's [remote access and support flow](https://support.google.com/chrome/answer/1649523?hl=en): permanent access using a PIN, temporary support code, host approval and stopping a session. Visual similarity does not establish functional parity.

## Selected engine and modifications

MeshCentral is pinned to npm version 1.3.1. `scripts/prepare-engine.cjs` applies
two checked, idempotent changes to `meshcentral.js`: export its running instance
to the private broker, and use the embedding host's process lifecycle rather
than starting an independent monitor. Unmodified browser protocol scripts are
copied to `web/public/engine`. Node and Go process ownership is handled by the
Workspace apphost Windows job.

## Windows host blocker

The upstream Windows host from the pinned `legacy-1.2.6` MeshAgent release was
blocked by Windows Defender as `HackTool:Win32/Meshagent.MBZ!MTB`. The host
download test returned 404 when the native binary was unavailable. Protection
was left intact. This is a compatibility/release blocker, not evidence that the
desktop implementation works. The final checkpoint disables automatic agent
downloads and returns a clear 503 for its unavailable host package.

Official references:

- [Agent releases](https://docs.meshcentral.com/meshcentral/agent-releases/)
- [Agent downloads](https://docs.meshcentral.com/meshcentral/agent-downloads/)
- [Pinned native release](https://github.com/Ylianst/MeshAgent/releases/tag/legacy-1.2.6)

## Separate attended host investigation

[MeshCentral Assistant](https://github.com/Ylianst/MeshCentralAssistant) at
`5810e60cd76e845f21d865db1205f4b5209b76a8` is Apache-2.0 C# source with its own
built-in agent. Its Release project compiled successfully with Visual Studio
MSBuild and .NET Framework 4.7.2. No upstream source was modified and it was not
installed. Its source requires consent for auto-connected desktop sessions,
and it is a user-session application rather than an unattended Windows service.
This is a possible attended-support option, not a completed replacement for
the blocked native host. A build or a readable executable alone is not a
security clearance or end-to-end desktop test.

Do not bypass Windows security, suppress host consent, disable certificate
validation or claim unattended access on the strength of this investigation.
