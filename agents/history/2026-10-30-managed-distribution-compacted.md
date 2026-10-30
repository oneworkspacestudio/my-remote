# Managed My Remote distribution repair

The standalone preview2 was released but never joined Workspace distribution.
A local desktop shortcut did not repair that omission. User authorized fixing
the shared delivery path and writing durable organization lifecycle rules.

Preview3 is now a managed component requiring Workspace104. compatibility.json
and package.ps1 include the full owned Node/TightVNC/scripts/licences runtime,
without a standalone installer. Owner MyAccounts/OIDC is provided by Workspace;
the component starts healthy and idle until explicit owner/PIN enrollment.

Remote listens behind Workspace /remote, with private bridge/host loopback ports.
Native passwords stay server-side. Host setup refuses unrelated TightVNC state.
A marked unconfigured preview2 can retire its exact process/startup and redirect
existing launch links with backups. Enrolled legacy state is left for migration
review; no accounts, data or credentials are silently replaced.

Six Node tests, frontend typecheck/build, Go build and exact-package idle acceptance
passed using a fresh NTFS synthetic account root. No host credentials were created;
owner/CSRF/invalid PIN checks and phone rendering passed. Real RFB source unchanged;
preview2 framebuffer evidence remains in the earlier handoff. No new actual desktop,
reboot, lock-screen, pre-login, audio, files or second-PC acceptance is claimed.

Workspace source now registers catalog/runtime/storage/SSO/proxy/discovery/branding/
updates/recovery, hashes runtime sidecars and validates a33-app inventory. Follow
its docs/APP-LIFECYCLE.md. Suite fresh-install/upgrade and release/install are still
separate pending gates at this source checkpoint. Second-PC install was explicitly
left pending by user; browser control was unavailable. Keep Actions disabled.

## Preview4 lifecycle correction

Managed integration testing exposed the need to restart an idle host when access
is re-enabled after a disabled restart. Device updates now validate first and
ensure host startup before persisting enabled state; failure leaves state disabled.
Three focused lifecycle tests join the six bridge/security checks. Remote4 is the
intended component for Workspace104; Remote3 remains an immutable checkpoint.

## Preview5 managed sign-out

Native HTTP session deletion alone cannot end already-open desktop WebSockets.
A revoke-only loopback endpoint authenticates the Workspace client secret and
origin; its private broker channel clears all owner leases and immediately
terminates owner streams. Independent approved guest grants retain stop/expiry
semantics. Ordinary app sign-out disconnects its current lease before deleting
the native session. Workspace must invoke/confirm revocation before owner logout.

## Published and delivered through Workspace104

Immutable Remote5 sourcef2f7efbe289c547603b04d8af7dbde93bb074986 and Workspace104
source01e96882648e9f2b994b12b438783d5c4a776531 are published and publicly promoted.
Exact coupled fresh-install/protected103-upgrade acceptance passed with synthetic
NTFS data, real MyAccounts OIDC, picker/owner/guest boundaries, confirmed stream
revocation and desktop/phone rendering. Workspace evidence is in
docs/evidence/remote104; its mandatory publisher verified338 assets and Android10.

Primary normal protected103-to104 install completed: Remote5 is registered,
managed runtime is healthy, actual public HTTPS JS/CSS match release bytes,
MyAccounts bootstrap is active, unauthorized desktop/origin requests are denied.
The product migration redirected old unconfigured preview2 shortcuts to Workspace,
retired duplicate startup/stop launchers, kept original launcher backups and
preserved legacy program/data. All32 earlier app contracts/settings/credentials
were retained. Desktop hosting stays inactive until owner setup. Second PC is
pending by user instruction; no new actual host enrollment, physical-phone,
reboot or expanded desktop capability acceptance is claimed. Lifecycle rules are
centralized in the Workspace repository docs/APP-LIFECYCLE.md and104 release asset.

## Preview6 host setup command environment

Owner setup failed before host-secret creation. Reproduced with synthetic NTFS
data and isolated test registry key using the exact minimal apphost.Service
environment. Windows PowerShell reports CantActivateDocumentInPipeline for
icacls.exe because PATHEXT is missing. Interactive-shell testing hid this.
windows-command.cjs supplies standard executable extensions and system-only PATH
to all PowerShell subprocesses, without importing the interactive PATH. Package
script includes the new helper. Restricted-environment host configuration passes
after the fix; all13 Node security/lifecycle tests pass (including real Windows PowerShell native-command regression). Diagnostics record exit
status/code without raw secrets. Owner data/registry were not used as fixtures;
no desktop/PIN was enrolled. Release6 and protected primary app update pending.

Preview6 was published and verified, but the normal106 update planner correctly
refused its additional runtime package: app-only updates cannot add files to an
existing app contract. Nothing was installed. Preview7 moves commandEnvironment
into the existing lifecycle.cjs payload, retaining the exact installed package
file set. Keep6 immutable and withhold it from the public channel after7.

## Host setup repair delivered as Remote7

Reproduced screenshot failure in a synthetic NTFS host-configuration fixture and
isolated registry namespace. apphost.Service omits PATHEXT/PATH; Windows PowerShell
reported CantActivateDocumentInPipeline on icacls.exe before private host setup.
Remote7 supplies standard executable extensions and trusted system command paths
to PowerShell without importing interactive PATH.13 Node regressions pass, including
real restricted Windows PowerShell failure/success, plus Go manager-boundary tests.
The original idle acceptance did not exercise opt-in host configuration. Lifecycle
rules now explicitly require that path in the supervised environment.

Remote6 immutable checkpoint added a runtime file and was correctly refused by
the106 planner before mutation.7 moves the helper into existing lifecycle.cjs;
all125 package IDs/paths match5.6 is withheld;7 release assets/digests and anonymous
checksums/channel were verified; normal organization builder pin is7. No suite
release was needed. Do not replace published6 assets.

Primary was already106 (not earlier104) and stopped at deployment preflight.
Old104 installer refused the newer contract; the installed106 protected Updates
controller successfully applied only Remote7. Transaction and cleanup completed,
latest verified recovery kept,33 unrelated app contracts and locations/identity
retained. All33 services healthy, all125 Remote payload hashes match release, public
HTTPS MyAccounts bootstrap reports7. No PIN/host enrollment was performed; the
owner must retry Enable remote access. Second PC remains pending. Evidence is
docs/evidence/remote-host-setup7*.json. No real desktop/reboot/physical-phone claim.
