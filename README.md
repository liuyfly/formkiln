# Formkiln

**An open-source, self-hostable form platform** with a typed schema engine, an embeddable React SDK and a visual form builder.

> **Status: early development (pre-alpha).** APIs and the schema format will change. Not ready for production use.

## Why Formkiln

- **Typed values.** Every field declares its data type. A date is a date and text is text; values are never guessed from their string shape.
- **Visible errors.** Failed validation always takes the user to the field and tells them what is wrong. Nothing fails silently.
- **Same rules everywhere.** One schema and one expression language (JSON Logic) are evaluated identically in the browser and on the server, guaranteed by a shared conformance suite.
- **Immutable versions.** Published form versions never change, and every submission records the version it was made with.
- **Host in control.** Navigation, analytics and error reporting are callbacks owned by the embedding application.
- **Self-hosted, cloud-agnostic.** PostgreSQL, any S3-compatible storage and SMTP. Your data stays with you.

## Repositories

| Repository                                                              | Contents                                                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`liuyfly/formkiln`](https://github.com/liuyfly/formkiln) (this repo)   | Schema spec, engine, React SDK, admin builder, hosted fill-in site                      |
| [`liuyfly/formkiln-server`](https://github.com/liuyfly/formkiln-server) | Spring Boot backend: definitions, drafts, submissions, server-side validation, webhooks |

## Packages

| Package                             | Description                                                       |
| ----------------------------------- | ----------------------------------------------------------------- |
| [`@formkiln/spec`](packages/spec)   | Schema definition, operator catalogue and conformance test cases  |
| [`@formkiln/core`](packages/core)   | Framework-agnostic engine: expressions, validation, runtime state |
| [`@formkiln/react`](packages/react) | React renderer (`<KilnForm />`)                                   |

Apps (not published): [`apps/playground`](apps/playground) runs hand-written schemas during development; [`apps/hosted`](apps/hosted) is the public fill-in site for forms published to `formkiln-server`. [`apps/admin`](apps/admin) is the back office (accounts and members today; form management and the builder follow).

## Development

Requirements: Node.js 24 (see `.nvmrc`) and pnpm 12 (enabled through Corepack or installed globally).

```bash
pnpm install
pnpm build        # build all packages and apps
pnpm test         # run unit tests
pnpm lint         # lint
pnpm typecheck    # type-check
pnpm dev          # start the playground
```

## Roadmap

1. Schema v1 specification and operator catalogue
2. Engine core and React renderer, with conformance parity against the server
3. Platform backend, SDK release and hosted fill-in site
4. Visual builder
5. Repeaters, i18n, PDF export and v1.0

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). To report a security issue, see [SECURITY.md](SECURITY.md).

## License

[Apache License 2.0](LICENSE)
