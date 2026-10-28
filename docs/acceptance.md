# Acceptance status

This is a source checkpoint, not release approval. No production accounts or
data were used in the development tests.

## Verified in isolated tests

- Native Go host starts and its pinned Node engine serves synthetic devices.
- Anonymous requests and forged internal identity headers are denied.
- CSRF protection and expected-account checks protect mutations.
- Member accounts cannot manage desktops; owner access is required.
- Incorrect PIN is rejected; correct PIN permits an authorized connection lease.
- Cross-origin browser control sockets are rejected.
- Support redemption is one-use and does not permit connection before approval.
- Approval permits the control socket; revocation removes access.
- Device edits persist through the UI and backend.
- Desktop and phone layouts render without browser errors or horizontal overflow.
- Unit tests cover PIN salts/validation, support expiry, ownership and rate limits.

These are management-plane tests with synthetic offline devices. An open control
socket does not prove screen capture, relay data, keyboard/mouse control or
unattended access. See the generated `acceptance.json` in the local test fixture
for the checks actually executed in a particular run.

## Not verified / not implemented

- A releasable, security-compatible native Windows host.
- Real screen frames, input, clipboard, monitor switching and disconnect behavior.
- Lock-screen/service access, reconnect after reboot and unattended operation.
- Audio, file transfer and comprehensive mobile touch/keyboard interaction.
- Independent least-privilege review of the upstream relay bridge and guest scope.
- Suite manifest, portal proxy, installer/update and companion integration.
- Reproducible runtime package, licence inventory and integrity manifests.
- Release publication and installation on either target PC.

## Release gate

Keep `releaseAccepted` false until the missing desktop and packaging checks
exist and pass. Do not tag a usable binary release or install this development
checkpoint as the user's working remote access service. The requested release
and two-machine installation remain outstanding.
