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
