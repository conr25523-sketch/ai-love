# Running Moonmind

This checkout contains the full Moonmind source tree. The original repository upload contained only root files, so GitHub Pages rendered README instead of the app.

## Open the website

- GitHub Pages entry: https://conr25523-sketch.github.io/ai-love/
- Application and backend: https://moonmind-inner-orbit.superskunk.chatgpt.site/
- Administrator page: https://moonmind-inner-orbit.superskunk.chatgpt.site/admin

The chat interface runs directly on GitHub Pages and stays at the github.io URL. The generated root `index.html` loads `pages-assets/`. A separate guest-only API on Sites stores messages in D1. Browser sessions use a private random secret saved on the GitHub Pages origin, so third-party cookies are not required. The administrator page runs on the backend host and requires the configured owner's authenticated account.

After changing the interface, run `npm run build:pages` and commit the generated root `index.html` and `pages-assets/` along with the source. Keep GitHub Pages configured to publish from main / (root). Changes to the guest API must also be built and deployed to its backend host. Old hashed assets can stay until existing browser sessions no longer use them.

## Run on your computer

Install Node.js 24 or later, run `npm ci`, then `npm run local`, or use `Start-Moonmind.cmd` after dependencies are installed. Open http://localhost:5173/ while the command is running. Local data is separate from hosted data.

The current conversation engine uses local rules. Hosting it does not turn it into a generative model or add external AI usage charges.

Do not upload .dev.vars, database files, node_modules, runtime state or credentials.
