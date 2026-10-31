# Publishing status

This checkout contains the full Moonmind source tree. The original repository upload contained only root files, so GitHub Pages rendered README instead of the app.

Moonmind currently requires a Worker runtime and D1 database for its API, shared history, and administrator access. GitHub Pages can host static assets but cannot execute this backend. Preserve these features by deploying the app to a compatible backend host and linking the Pages entry point to the actual app, or explicitly choose a browser-only adaptation with different persistence semantics.

Do not upload .dev.vars, database files, node_modules, runtime state or credentials.

Source upload and live hosting are separate steps. Uploading this source tree does not deploy the backend or make GitHub Pages run the application.
