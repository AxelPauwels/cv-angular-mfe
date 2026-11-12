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

## Releases

The app has one version, in the root `package.json` (`major.minor.patch`, see [semantic versioning](https://semver.org/)). You choose the version locally; GitHub tags it and creates a release once it reaches `main`.

### TL;DR

```bash
# On develop: version and push in one go
npm run nx:release

# Then open a PR develop → main and merge it.
# CI tags the merge commit (e.g. 1.2.0), creates a GitHub release and deploys live.
```

### Choosing the version

`npm run nx:release` and every `git push` ask:

```
  package.json version: 1.1.0
  latest release tag:   1.1.0

  Version this push?
    1) no, push as is
    2) patch  1.1.1   bug fixes only
    3) minor  1.2.0   new, backwards-compatible features
    4) major  2.0.0   breaking changes or a big redesign
    5) custom version

  Choice [1]:
```

Picking a version runs `npm version x.y.z --no-git-tag-version` (updates `package.json` and `package-lock.json`) and commits `chore(release): x.y.z`. No tag is made locally.

| How you push         | After choosing a version                                                                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run nx:release` | Asks `Push now? [Y/n]` and pushes, without asking again.                                                                                                                                                                                 |
| `git push`           | The version commit is made, but git had already decided what to push, so the push is **stopped** (git prints `failed to push some refs`; that is expected). Run `git push` again: it includes the version commit and is not asked again. |

The question is only asked when you push your current branch from an interactive terminal. It is skipped:

- when the last commit is already a `chore(release): …` commit;
- when pushing tags, deleting branches or pushing another branch than the one checked out;
- in CI and in git GUIs without a terminal;
- with `SKIP_VERSION_PROMPT=1 git push`, or `git push --no-verify` (skips all hooks).

Ctrl+C at the question stops the push. The new version must be higher than both `package.json` and the latest release tag.

### What GitHub does

[`release.yml`](.github/workflows/release.yml):

| Event                  | What it does                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR into `main`         | **Check version**: notes on the PR whether merging releases a new version; fails if `package.json` is lower than the latest release.                                             |
| Push to `main` (merge) | **Tag and GitHub release**: if the `package.json` version has no tag yet, tags that commit `x.y.z` and creates a GitHub release with generated notes. Otherwise it does nothing. |

The live deploy is done by [`firebase-hosting-merge.yml`](.github/workflows/firebase-hosting-merge.yml) on the same push.

Tags are made on `main`, not when you push to `develop`, so a tag always points at code that actually went live, and a version that never gets merged leaves no tag behind. Tags have no `v` prefix (`1.2.0`), like the `cv-angular` host. `0.0.0` is never released.

### Setup

- _Settings → Actions → General → Workflow permissions_ must allow the workflow's `contents: write` (choose _Read and write permissions_ if the tag job fails with `403`).
- Recommended: a tag ruleset for `*.*.*` so release tags can't be moved or deleted.

The `pre-push` hook ([`.husky/pre-push`](.husky/pre-push) → [`scripts/release.mjs`](scripts/release.mjs)) is installed by Husky on `npm install`.

## Deploy Firebase

- To deploy to firebase, ensure you are logged in. cmd: firebase login --reauth
