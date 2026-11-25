# Formkiln hosted

A public fill-in site for published Formkiln forms: `https://forms.example.com/f/{formKey}`.

- Loads the latest published version from `formkiln-server` on the server side.
- Renders it with `@formkiln/react`. The locale comes from `?lang=`, then `Accept-Language`, then the form's default.
- Sends every request through its own routes, so the browser never talks to `formkiln-server` directly, no CORS setup is needed and the server URL stays private:
  - `POST /f/{formKey}/submit`: submissions (512 KB max).
  - `/f/{formKey}/drafts`: drafts are saved 1.5 s after the last change and restored on the next visit. The draft token is kept in `localStorage` on this device; submitting deletes the draft.
  - `POST /f/{formKey}/files`: uploads are streamed to the server, which checks type and size.
- Token-mode forms: open `/f/{formKey}?token=<embed token>` (issued by your backend through `POST /v1/manage/embed-tokens`). The token is removed from the address bar and sent with every request. Without a valid token the page says the link has expired. Drafts are kept apart per token subject.
- Continue later: when the form enables it (admin → Notifications), a link under the form saves the draft and emails the respondent a link (`/f/<key>#draft=<token>`) that reopens it on any device; the token is removed from the address bar.
- Bot protection: a hidden honeypot field, and the Cloudflare Turnstile widget when the server has Turnstile configured.
- Follows the outcome's `redirect` after a successful submission.
- Pages are marked `noindex` and served with basic security headers.

## Configuration

| Variable                    | Default                 | Description                                                                                                          |
| --------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `FORMKILN_API_URL`          | `http://localhost:8080` | Base URL of formkiln-server, reachable from this app's server                                                        |
| `FORMKILN_FRAME_ANCESTORS`  | `'self'`                | Sites allowed to embed forms in an iframe (CSP `frame-ancestors` source list), for example `https://app.example.com` |
| `FORMKILN_MAX_UPLOAD_BYTES` | `12582912`              | Largest upload request accepted before it reaches formkiln-server                                                    |

### Client address

`X-Forwarded-For` is passed on to formkiln-server, which uses the client address for rate limits and Turnstile. Next.js only sets this header when it is missing, so run the app behind a reverse proxy (load balancer, ingress) that appends the client address; otherwise clients can choose the address the server sees.

## Development

```bash
pnpm --filter @formkiln/hosted dev   # http://localhost:3100/f/<formKey>
```

Publish a form to a local formkiln-server first (see its README). Next.js collects anonymous telemetry by default; set `NEXT_TELEMETRY_DISABLED=1` to opt out.
