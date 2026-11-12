# CV Application

## Commit messages (commitlint)

Commit messages are checked by [commitlint](https://commitlint.js.org/) using the
[`@commitlint/config-conventional`](https://github.com/conventional-changelog/commitlint/tree/master/@commitlint/config-conventional)
rules (see `commitlint.config.mjs`).

The check runs automatically on every commit through a [Husky](https://typicode.github.io/husky/)
`commit-msg` hook (`.husky/commit-msg`). Husky is installed by the `prepare` script when you run `npm install`.
A commit with an invalid message is rejected.

Messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0-beta.4/):

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Examples:

```
feat(cv-mfe): add experience section
fix: correct date formatting in timeline
docs: describe commitlint setup
```

More info:

- commitlint docs: https://commitlint.js.org/
- Conventional Commits spec: https://www.conventionalcommits.org/en/v1.0.0-beta.4/

## API documentation

The API of the `<cv-mfe>` web component (its attributes/properties, how to load it, theming) is generated with [Compodoc](https://compodoc.app/) and served by the app at **`/api`**:

- production: https://cv-angular-mfe.web.app/api/
- local: http://localhost:4300/api/ (`npm start`)

| What                          | Where                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Getting-started page          | [`apps/cv-mfe/README.md`](apps/cv-mfe/README.md) (attribute table, loading, theming) |
| Inputs, types and defaults    | JSDoc on the components, e.g. [`app.ts`](apps/cv-mfe/src/app/app.ts) for `<cv-mfe>`  |
| Compodoc settings             | [`apps/cv-mfe/.compodocrc.json`](apps/cv-mfe/.compodocrc.json)                       |
| Generated output (gitignored) | `dist/compodoc/cv-mfe`, copied into the app as `api/`                                |

`npm run docs` generates it on its own. `build` and `serve` run it first, so the deployed app always has up-to-date docs; while `npm start` runs, run `npm run docs` again to refresh `/api`.

When you add or change an input of `App`, document it with a JSDoc comment (what it does, its attribute name, its default) and update the table in `apps/cv-mfe/README.md`.

## Releases

`npm run nx:release` (or the question on `git push`) asks whether to release and how (patch, minor, major), then creates and pushes `release/x.y.z`. The PR `release/x.y.z` → `main` gets the version commit and a Firebase preview; merging it tags `x.y.z` (the same as the `package.json` version) and creates a GitHub release. It works like the cv-angular host.

How it works, step by step: see [README.release-branches.md](README.release-branches.md).

## Deploy Firebase

- To deploy to firebase, ensure you are logged in. cmd: firebase login --reauth
