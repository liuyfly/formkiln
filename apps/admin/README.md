# Formkiln admin

The back office of Formkiln:

- **Forms**: list, publish a form document (upload or paste JSON; static errors are listed with their JSON pointer), versions.
- **Submissions**: newest first with a detail panel (files download through the admin), sensitive values masked unless an editor shows them (audited), CSV export with or without sensitive values (audited).
- **Sharing**: public link with QR code, or embed-token access with instructions and short-lived test links.
- **Webhooks**: add (the signing secret is shown once), delete, deliveries with status and redelivery.
- **Members**, **audit log** (admins) and personal **settings** (password, recovery codes, sessions).

- **Same-origin gateway.** The browser only talks to this app. `/v1/admin/**` and
  `/v1/manage/**` are forwarded to `formkiln-server` (`src/app/v1/[...path]/route.ts`), so no CORS
  setup is needed and the server URL stays private. Only the session cookie and a few headers are
  forwarded; the service token is never accepted from the browser. The server's session cookie
  (`HttpOnly`, `SameSite=Strict`) is re-scoped to the whole site so console pages can check it on
  the server.
- **Accounts** are invitation-only: email + password + authenticator app (TOTP), with recovery
  codes. Invitation and password reset links carry their token in the URL fragment, which never
  reaches a server log.
- **Roles**: viewers read, editors also publish and manage sharing, admins also manage members.
  The server enforces every rule; the UI only hides what a role cannot use.
- Built with Next.js (App Router) and MUI. Pages are not indexed and cannot be framed.

## Configuration

| Variable              | Default                 | Description                                                              |
| --------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `FORMKILN_API_URL`    | `http://localhost:8080` | Base URL of formkiln-server, reachable from this app's server            |
| `FORMKILN_HOSTED_URL` | `http://localhost:3100` | Public URL of the hosted fill-in site, used for share links and QR codes |

Set `FORMKILN_ADMIN_URL` on formkiln-server to this app's public URL; it is used in invitation and
reset emails. Deploy the admin on an internal network or behind a VPN when possible. Behind a
reverse proxy, make sure it appends the client address to `X-Forwarded-For` (it is forwarded to the
server for rate limits, sessions and the audit log).

## Development

```bash
pnpm --filter @formkiln/admin dev   # http://localhost:3200
```

Start formkiln-server and Mailpit first (see the server README). With an empty database the
server invites `FORMKILN_BOOTSTRAP_ADMIN_EMAIL`; open the link from Mailpit
(http://localhost:8025) to create the first admin. Set `NEXT_TELEMETRY_DISABLED=1` to opt out of
Next.js telemetry.
