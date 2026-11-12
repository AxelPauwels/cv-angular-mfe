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

## Firebase hosting

Deploys are automatic; you normally don't run any Firebase command yourself.

| What                  | When                                                                    | How                                                                    |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Preview channel       | Every pull request (release PRs into `main` after the version commit)   | `firebase-hosting-pull-request.yml`, `release.yml`                     |
| **Live** (production) | **Only** when a `release/x.y.z` PR is merged into `main`, after the tag | `release.yml` → [`deploy-live.yml`](.github/workflows/deploy-live.yml) |
| Redeploy / roll back  | By hand, for an existing release tag                                    | _Actions → Deploy live → Run workflow_, enter the tag (e.g. `1.0.0`)   |

Other pushes or merges into `main` are checked by CI but never deployed live. See [README.release-branches.md](README.release-branches.md).

### Local commands

| Script                            | Command                                       | Use                                                                      |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run firebase:login`          | `npx firebase login`                          | Log in (`npx firebase login --reauth` when the session expired).         |
| `npm run firebase:link-project`   | `npx firebase use --add`                      | Link the local checkout to a Firebase project (`.firebaserc`).           |
| `npm run firebase:deploy-preview` | `npx firebase hosting:channel:deploy preview` | Deploy your local build to the `preview` channel (never live).           |
| `npm run firebase:emulate`        | `npx firebase emulators:start --only hosting` | Serve `dist/apps/cv-mfe/browser` locally with the `firebase.json` rules. |

Build first (`npm run build:production`) before a preview deploy or the emulator.

The Firebase CLI writes `firebase-debug.log` (and emulator logs) to the repository root. They can contain access tokens, so they are in `.gitignore`; never commit them. An earlier commit did, and GitHub revoked the GitHub token it contained when the repository was made public.

### Removed commands: avoid them

These used to be npm scripts. They are removed because they bypass or undo the automatic flow; they are listed here only so you know them.

| Command                              | Why not                                                                                                                                                                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx firebase deploy --only hosting` | Deploys **your local build live**, without a release, tag, review or CI. Use _Deploy live → Run workflow_ with a release tag instead; only in an emergency (GitHub Actions down) build a checked-out release tag and run this.                                             |
| `npx firebase init hosting:github`   | Regenerates the GitHub workflows and the service-account secret. It would bring back a workflow that deploys every push to `main` live and overwrite the PR preview workflow. Only needed when the Firebase service account must be recreated; review the diff afterwards. |
