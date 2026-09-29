# Generated Windows Server configuration

Run `scripts/configure-windows-server.ps1 -Domain YOUR-HOSTNAME` after setup.
It creates `deploy/runtime/Caddyfile`, `logging.json`, and `deployment.json`,
plus private certificate storage and rotating logs. This entire runtime directory
is ignored by Git. Do not upload it or `.env`.

See the repository [README](../README.md) for the full Windows Server handoff.
