# Installing and packaging My Remote

## Current-user installation

The Windows x64 zip includes `install.ps1`, `MyRemote.exe`, the signed Node
runtime, the signed unmodified TightVNC host, the private bridge and licence
notices. Run the installer after extracting the zip. No administrator access is
required. It verifies the manifest and publisher-signed host/runtime before use.

Program files go to `%LOCALAPPDATA%/Programs/OneWorkspace/MyRemote/<version>`.
Private data goes to `%LOCALAPPDATA%/OneWorkspace/MyRemote` and is restricted to
the current user and SYSTEM. Existing data and prior version folders are retained.
An existing unrelated TightVNC configuration or process stops installation.

Start menu entries are **My Remote** and **Stop My Remote**. A startup shortcut
starts the app without a browser when the current user signs in. The TightVNC
tray icon remains visible. Stopping the app closes the job containing the bridge
and host. Closing a browser session does not uninstall or stop the host.

On first launch, the My Remote shortcut opens the private one-time owner setup
link. Create your own account and access PIN. No default login or PIN is supplied.
The plain localhost root does not grant owner setup by itself.

Listeners: app 9034, private broker 9135, native host 9136, all on loopback.
The native host requires a generated private password. No firewall exception,
security-product exclusion, tunnel, DNS entry or public route is installed.

## Scope

This preview works while its Windows user is signed in. Access before sign-in,
secure-desktop control, remote internet/LAN connectivity, audio and file transfer
are not delivered. The UI explicitly identifies local-only operation.
Configuring an authenticated HTTPS gateway and testing access from another device
are separate deployment work. Do not expose the plain native VNC listener.

## Rebuilding a package

Build with Node 26.8.2 and Go 1.27.3 using `scripts/build.ps1`. The packaging script
accepts a new output directory, an extracted official TightVNC 2.8.90 host folder,
verified Node executable, its licence and the Go executable path. It copies
runtime dependencies and their notices, writes a SHA256 manifest, and creates a
zip. Keep private data and credentials outside the package.

Official inputs and immutable SHA256 values are recorded in
`docs/runtime-provenance.json`. Extract the signed TightVNC MSI administratively
with `msiexec /a <msi> /qn TARGETDIR=<new staging directory>`; this extracts files
without installing a system service. Preserve the unmodified GPL source archive
as a release asset. Node's licence includes its bundled dependency notices.

Publish the Windows zip, app source archive, TightVNC corresponding source,
noVNC source, runtime provenance and SHA256 checksums together. This independent
preview is not a managed Workspace bundle release; it has not changed the suite
catalog or update channel.
