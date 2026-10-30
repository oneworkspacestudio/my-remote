# Installing and packaging My Remote

## Managed installation

Version 0.1.0-preview.3 requires One Workspace 0.3.0-preview.104 or later.
Use Workspace setup or its protected updater. My Remote is a default Administration
app, served at `/remote`, with MyAccounts owner sign-in and a shared picker entry.
Do not run the earlier standalone installer or copy a local shortcut to deliver it.

Workspace installs `MyRemote.exe`, signed Node, the unmodified signed TightVNC host,
bridge scripts and notices. The catalog owns and hashes every payload. The manager
verifies and holds runtime files while supervising the app. Independent updates
include the whole owned runtime, preserve other apps and require a compatible manager.

Data lives in Workspace's Private/remote directory and uses the standard protected
backup and rollback scope. No owner, PIN or host credential is supplied. The app
starts healthy and idle; an authenticated owner's explicit setup action creates
the private host password and loopback-only native configuration. An unrelated
TightVNC configuration or running host stops activation without overwriting it.

The app port is Workspace's base port plus 35 (9025 with the default base of 8990).
The private broker and native host use app-port plus 101 and 102. These bind loopback;
only Workspace's authorized HTTP/WebSocket gateway is intended for browser access.
No firewall exception, security exclusion, DNS or public tunnel is added.

## Earlier standalone preview

Preview.2 was local-only and did not join Workspace distribution. Managed startup
recognizes that specific preview's app marker. If no desktop owner was enrolled,
it stops the exact legacy executable, backs up and retires its sign-in launcher
and Stop shortcut, and redirects existing My Remote shortcuts to Workspace.
It retains the old program/data directories. Activation can migrate only the exact
legacy host registration; an unrelated host is refused.

An enrolled standalone preview is left intact for explicit migration review;
its account, desktop grants and credentials are never silently replaced. The app
shows any activation conflict. Keep recovery copies until migration is verified.

## Scope

The native host requires a random private password and listens only on loopback.
The broker authenticates server-side; browsers receive expiring owner/PIN leases
or approved guest grants, never the native password. Terminal and file-transfer
protocols are not exposed. The host operates while its Windows user is signed in.
Before-sign-in service, secure desktop, audio, files and per-monitor selection are
not delivered. Network connectivity must be verified for each claimed deployment.

## Rebuilding and publishing

Build with Node 26.8.2 and Go 1.27.3. `scripts/package.ps1` accepts a new output
directory, the extracted official TightVNC 2.8.90 host, verified Node executable,
its licence and Go path. It produces a managed component zip, not a standalone
installer. `compatibility.json` declares the minimum Workspace version, route,
activation and runtime ownership contract. Keep all private data outside packages.

Official inputs and hashes are in `runtime-provenance.json`. Preserve publisher
signatures and corresponding source. Publish the component zip, executable,
`workspace-update.json`, app source, TightVNC/noVNC source, provenance and checksums.
Then pin it in Workspace's organization build, validate the complete registry,
verify fresh setup and earlier-version upgrade, and publish/promote the Workspace
release through its mandatory signed-Android publisher. Follow the organization's
[app lifecycle rules](https://github.com/oneworkspacestudio/one-workspace/blob/main/docs/APP-LIFECYCLE.md).
