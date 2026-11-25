# End-to-end tests

Playwright tests of the hosted fill-in site and the admin app against a running server:

- **Flows**: filling in and submitting a form, the error summary and focus handling, onboarding
  the first admin from the invitation email (password and authenticator), signing in and out,
  submissions in the admin app.
- **Accessibility**: [axe](https://github.com/dequelabs/axe-core) checks (WCAG 2.1 A and AA rules)
  of every admin page and of hosted forms, including their error states and another locale.
- **Performance**: budgets for loading and editing a 600-field form with a calculation over 300
  fields (`E2E_LOAD_BUDGET_MS`, `E2E_INPUT_BUDGET_MS`).

They run in CI on every pull request (`e2e` job), with the admin and hosted apps of the commit and
the latest `formkiln-server` image.

## Running locally

```sh
pnpm install
pnpm turbo run build --filter=@formkiln/admin --filter=@formkiln/hosted

# PostgreSQL (port 5434), Mailpit (UI on 8026) and the server image (8080).
docker compose -f e2e/compose.yml --profile server up -d

# Uses the installed Chrome; or run `pnpm --filter @formkiln/e2e exec playwright install chromium`
# once and leave PLAYWRIGHT_CHANNEL unset.
PLAYWRIGHT_CHANNEL=chrome pnpm --filter @formkiln/e2e e2e
```

The tests start the admin (3200) and hosted (3100) apps themselves, or reuse ones already running.
To test server changes, run the server from source instead of the image, with the settings of the
`server` service in `compose.yml` and `FORMKILN_DB_URL=jdbc:postgresql://localhost:5434/formkiln`,
`FORMKILN_SMTP_PORT=1026`.

The first run accepts the bootstrap invitation and saves the throwaway account in `e2e/.auth/`;
later runs against the same database sign in with it. `docker compose -f e2e/compose.yml down`
discards the database (it lives in tmpfs) — delete `e2e/.auth/` at the same time.

## Accessibility beyond automated checks

Automated rules find a part of the problems. Before a release, also check by hand:

- Keyboard only: every control reachable in a sensible order, visible focus, no traps (including
  the builder's drag handles, which support the keyboard through dnd-kit).
- A screen reader (VoiceOver or NVDA) on a hosted form: labels, descriptions, errors and the
  error summary are announced; page changes move focus to the page heading.
- 200 % zoom and a 320 px wide window: no lost content or horizontal scrolling on hosted forms.
- Dark mode and Windows high-contrast mode.
