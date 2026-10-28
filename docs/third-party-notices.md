# Third-party notices

My Remote application source is Apache-2.0. The release distributes several
separate components, each retaining its own licence and notices:

- **TightVNC 2.8.90**: GPL-2.0, unmodified publisher-signed Windows executables
  and libraries. It runs separately over the standard RFB protocol. Its full
  corresponding GPL source archive is supplied alongside the binary package.
  `remote-runtime/host/LICENSE.txt` contains the upstream licence.
- **noVNC 1.7.0**: primarily MPL-2.0, with individually licensed components
  including pako. Its source archive and all included licence files are supplied.
  The app imports the unmodified pinned npm module.
- **Node.js 26.8.2**: MIT and bundled third-party licences, reproduced in
  `licenses/Node-LICENSE.txt`. The official signed x64 runtime is checked against
  the vendor's SHA256 manifest.
- **ws 8.21.1**: MIT, with its licence retained in the runtime and notices.
- **React/ReactDOM, Lucide, Roboto and web dependencies**: their respective
  upstream licences are copied into `licenses/npm-*` during packaging.
- **One Workspace apphost v0.3.0-preview.96 and Go dependencies**: upstream
  licences are copied into `licenses/go-*` during packaging.

Source provenance and hashes are in `docs/runtime-provenance.json`. MeshCentral
was used in the earlier prototype but is not included in the current runtime;
its historical source remains available in Git history. The new host does not
modify the blocked MeshAgent, Windows security settings or certificate checks.

My Remote is an independent project, not affiliated with Google.
