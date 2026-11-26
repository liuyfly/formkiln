# Changelog

Releases of the Formkiln platform: the admin app, the hosted fill-in site and the deployment
files in [`deploy/`](deploy). They share version numbers with
[formkiln-server](https://github.com/liuyfly/formkiln-server/blob/main/CHANGELOG.md): run the
same version of all three images.

The npm packages (`@formkiln/spec`, `@formkiln/core`, `@formkiln/react`) are versioned on their
own; see their CHANGELOG files under [`packages/`](packages).

## 0.1.0

First release. Images: `ghcr.io/liuyfly/formkiln-admin:0.1.0`,
`ghcr.io/liuyfly/formkiln-hosted:0.1.0`, with `ghcr.io/liuyfly/formkiln-server:0.1.0`.

### Admin

- Invitation-only sign-in with password and authenticator app, sessions.
- Workspaces for teams: every page lives under `/w/<workspace>/...`, with a workspace switcher;
  members, roles, audit log and erasure requests per workspace.
- Instance administration for instance admins: create, rename, archive and restore workspaces;
  disable accounts, reset authenticators and choose instance admins; the instance-wide audit log.
- Instance admins can open a workspace's data read-only for an hour, with a reason; a banner shows
  the access, and the workspace's audit log records the reason and every page opened.
- Form builder: palette, canvas with drag and drop and nesting, inspector, visual logic editor
  for conditions and calculations, live preview, undo and redo, checks before publishing,
  version comparison, templates, duplicating forms. JSON view for advanced edits.
- Submissions with field labels, revealing sensitive answers (audited), CSV export, PDF per
  submission; sharing (public link, signed links, embedding), webhooks with a delivery log,
  email notifications, retention periods, deleting submissions and erasure requests.

### Hosted fill-in site

- Public pages at `/f/<workspace>/<form key>`, rendered with `@formkiln/react`; signed links and iframe
  embedding (`FORMKILN_FRAME_ANCESTORS`).
- Drafts and "continue later" links by email, file uploads, Cloudflare Turnstile, PDF receipt
  after submitting. English and Simplified Chinese interface.

### Deployment

- Docker Compose setup with PostgreSQL and optional Mailpit; production checklist and upgrade
  notes in [`deploy/README.md`](deploy/README.md).

### Quality

- End-to-end tests in CI against the server image, automated WCAG 2.1 AA checks of every admin
  page and of hosted forms, performance budgets for a 600-field form.
