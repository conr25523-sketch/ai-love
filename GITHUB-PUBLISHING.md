# Running Moonmind

This checkout contains the full Moonmind source tree. The original repository upload contained only root files, so GitHub Pages rendered README instead of the app.

## Open the website

- GitHub Pages entry: https://conr25523-sketch.github.io/ai-love/
- Application and backend: https://moonmind-inner-orbit.superskunk.chatgpt.site/
- Administrator page: https://moonmind-inner-orbit.superskunk.chatgpt.site/admin

The root `index.html` takes visitors from GitHub Pages to the hosted application. The application runs on Sites with a Worker and D1 database; GitHub Pages serves only the entry page. Guest visitors use the nickname flow. Administrator access requires the configured owner's authenticated account.

Uploading source to GitHub does not automatically update the hosted application. Changes to the application must also be built and deployed to its backend host.

## Run on your computer

Install Node.js 24 or later, run `npm ci`, then `npm run local`, or use `Start-Moonmind.cmd` after dependencies are installed. Open http://localhost:5173/ while the command is running. Local data is separate from hosted data.

The current conversation engine uses local rules. Hosting it does not turn it into a generative model or add external AI usage charges.

Do not upload .dev.vars, database files, node_modules, runtime state or credentials.

