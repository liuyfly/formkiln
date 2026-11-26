# Self-hosting Formkiln

Formkiln runs as three containers plus PostgreSQL:

| Service  | Image                             | Port | Purpose                                                     |
| -------- | --------------------------------- | ---- | ----------------------------------------------------------- |
| `server` | `ghcr.io/liuyfly/formkiln-server` | 8080 | API, validation, storage, webhooks, accounts (keep private) |
| `admin`  | `ghcr.io/liuyfly/formkiln-admin`  | 3200 | Back office for your team (internal network or VPN)         |
| `hosted` | `ghcr.io/liuyfly/formkiln-hosted` | 3100 | Public fill-in pages `/f/<workspace>/<form key>`            |

Tags: releases are tagged `1.2.3`, `1.2` and `latest`; `edge` follows `main`. Run the same
version of all three images. The compose file defaults to `0.1` (the latest 0.1.x); see the
[changelog](../CHANGELOG.md).

## Try it

```bash
cd deploy
cp .env.example .env
# Set POSTGRES_PASSWORD, FORMKILN_ENCRYPTION_KEY (openssl rand -base64 32)
# and FORMKILN_BOOTSTRAP_ADMIN_EMAIL in .env.
docker compose --profile mailpit up -d
```

1. Open Mailpit at http://localhost:8025 and follow the invitation link to create the first
   admin (password and authenticator app).
2. Sign in at http://localhost:3200 and publish a form document (for example
   [`packages/spec/examples/rental-application.json`](../packages/spec/examples/rental-application.json)).
3. Fill it in at http://localhost:3100/f/default/rentalApplication.

## Production checklist

- **HTTPS**: put `admin` and `hosted` behind a reverse proxy with TLS. The admin session cookie is
  `Secure`, so the admin only works over HTTPS (or on `localhost`). Set `FORMKILN_ADMIN_URL` and
  `FORMKILN_HOSTED_URL` to the public URLs.
- **Client addresses**: the proxy must append the client address to `X-Forwarded-For`; rate
  limits, Turnstile and the audit log rely on it.
- **Keep the API private**: only `admin` and `hosted` need to reach `server`. Expose the admin on
  an internal network or VPN when you can.
- **Secrets**: back up `FORMKILN_ENCRYPTION_KEY`. Losing it makes sensitive answers, drafts,
  webhook secrets and authenticator enrollments unreadable.
- **Email**: configure a real SMTP server (`FORMKILN_SMTP_HOST`, `FORMKILN_SMTP_PORT`,
  `FORMKILN_MAIL_FROM`; for authentication set `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`
  and `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true` on `server`).
- **Files**: uploads are stored in the `files` volume. For several server instances use
  S3-compatible storage (`FORMKILN_STORAGE=s3`, see the server README).
- **Bot protection**: set `FORMKILN_TURNSTILE_SITE_KEY` and `FORMKILN_TURNSTILE_SECRET`.
- **Backups**: the `postgres` and `files` volumes hold all data; back them up together with
  `FORMKILN_ENCRYPTION_KEY`.
- **Monitoring**: set `FORMKILN_METRICS_TOKEN` and scrape `server:8080/actuator/prometheus`.

Backup and restore, upgrades, metrics, alert rules and troubleshooting are covered in the
[operations guide](https://github.com/liuyfly/formkiln-server/blob/main/docs/operations.md).

## Upgrading

Back up the database, set `FORMKILN_VERSION` to the new release, then
`docker compose pull && docker compose up -d`. The server migrates the database on start;
migrations only move forward, so roll back by restoring the backup.

All settings are environment variables; see the READMEs of
[formkiln-server](https://github.com/liuyfly/formkiln-server), [admin](../apps/admin) and
[hosted](../apps/hosted).
