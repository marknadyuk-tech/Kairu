# KAIRU — Pages deploy (public)

This folder is the **public GitHub Pages copy of the live KAIRU v2.5 app only**.
It exists so the app can be opened on a phone. It is intentionally minimal.

- `index.html` — the live build (a copy of `KAIRU v2.5.html` from the main project)
- `assets/kairu-app.js`, `assets/kairu.css` — the app's code + styles
- `kairu-logo.png` — logo / favicon
- `.nojekyll` — serve files as-is
- `deploy.ps1` — re-sync from the main project and push an update

**This is a copy, not the source of truth.** Edit the app in the main project
(`KAIRU v2.5.html` + `assets/`), then run `deploy.ps1` to publish the change.

**Not published here (kept private):** the Next.js app and all `_archive` docs.

**Data:** saves live in each phone/browser's own `localStorage` — they do not sync
across devices. Use the app's Export/Import to move a save between devices.
