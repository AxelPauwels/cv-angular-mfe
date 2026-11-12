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

`npm run nx:release` (or the question on `git push`) asks whether to release and how (patch, minor, major), then creates and pushes `release/x.y.z`. The PR `release/x.y.z` → `main` gets the version commit and a Firebase preview; merging it tags `x.y.z` (the same as the `package.json` version) and creates a GitHub release. It works like the cv-angular host.

How it works, step by step: see [README.release-branches.md](README.release-branches.md).

## Deploy Firebase

- To deploy to firebase, ensure you are logged in. cmd: firebase login --reauth
