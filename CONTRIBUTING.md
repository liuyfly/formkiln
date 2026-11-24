# Contributing to Formkiln

Thank you for your interest in contributing.

## Ground rules

- Discuss larger changes in an issue before opening a pull request.
- Keep pull requests focused. One logical change per PR.
- All code, comments, commit messages and documentation are written in English.

## Developer Certificate of Origin (DCO)

All commits must be signed off to certify that you wrote the code or have the right to submit it under the project's license ([developercertificate.org](https://developercertificate.org/)):

```bash
git commit -s -m "feat(core): add date difference operator"
```

This adds a `Signed-off-by: Your Name <you@example.com>` trailer to the commit message.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, with an optional scope such as `spec`, `core`, `react` or `playground`.

## Workflow

1. Fork the repository and create a branch from `main`.
2. Make your change and add tests.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`.
4. If a published package changes, add a changeset with `pnpm changeset`.
5. Open a pull request. CI must pass before review.

## Conformance suite

Changes to expression or validation semantics must come with conformance cases in `packages/spec/conformance`. Both the TypeScript engine and the Java engine in [`formkiln-server`](https://github.com/liuyfly/formkiln-server) must pass them.
