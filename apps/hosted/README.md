# Formkiln hosted

A public fill-in site for published Formkiln forms: `https://forms.example.com/f/{formKey}`.

- Loads the latest published version from `formkiln-server` on the server side.
- Renders it with `@formkiln/react`. The locale comes from `?lang=`, then `Accept-Language`, then the form's default.
- Sends submissions through its own route (`POST /f/{formKey}/submit`, limited to 512 KB). The browser never talks to `formkiln-server` directly, so no CORS setup is needed and the server URL stays private.
- Follows the outcome's `redirect` after a successful submission.
- Pages are marked `noindex` and served with basic security headers.

## Configuration

| Variable           | Default                 | Description                                                   |
| ------------------ | ----------------------- | ------------------------------------------------------------- |
| `FORMKILN_API_URL` | `http://localhost:8080` | Base URL of formkiln-server, reachable from this app's server |

## Development

```bash
pnpm --filter @formkiln/hosted dev   # http://localhost:3100/f/<formKey>
```

Publish a form to a local formkiln-server first (see its README). Next.js collects anonymous telemetry by default; set `NEXT_TELEMETRY_DISABLED=1` to opt out.

Not yet available: file uploads (the server API is planned), drafts, signed links and bot protection.
