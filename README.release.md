# Release branches

How the cv-mfe remote goes from `develop` to production, and how it gets its version and git tag. It works like the [cv-angular](https://github.com/AxelPauwels/cv-angular) host, with two differences: a prompt creates the release branch for you, and the version commit is made by that prompt instead of by a CI bot, so every commit on a release PR gets its checks (which `main` requires).

## TL;DR

```bash
# 1. On develop: choose the version; this creates and pushes release/x.y.z
#    (and can open the PR into main with gh)
npm run nx:release
#    `git push` on develop asks the same question

# 2. The PR release/x.y.z → main is checked (Source branch, Version, CI)
#    and gets a Firebase preview

# 3. Merge the PR (with a merge commit)
#    CI tags the merge commit x.y.z, creates a GitHub release and deploys live

# 4. Bring main back into develop
git switch develop && git pull
git merge origin/main
git push
```

## Branches

| Branch          | What it is                                   | Created from          | Merged into         |
| --------------- | -------------------------------------------- | --------------------- | ------------------- |
| `develop`       | Day-to-day work                              | –                     | `release/*`         |
| `release/x.y.z` | One release; its name is the version         | `develop` (or `main`) | `main`              |
| `main`          | What runs in production; every merge is live | –                     | back into `develop` |

The version follows [semantic versioning](https://semver.org/): `major.minor.patch`. The branch name must be exactly `release/<major>.<minor>.<patch>`, without a `v` prefix or suffixes such as `-rc`. The git tag is the same as the version: `release/1.2.0` is tagged `1.2.0`, and `package.json` on `main` then says `1.2.0`.

| Change since the last release      | Choice | Example       |
| ---------------------------------- | ------ | ------------- |
| Bug fixes only                     | patch  | 1.0.0 → 1.0.1 |
| New features, backwards compatible | minor  | 1.0.1 → 1.1.0 |
| Breaking changes or a big redesign | major  | 1.1.0 → 2.0.0 |

## Versions: what a release changes

A release has **one version, the same everywhere**:

| Where                                         | Set by                                                                      | After releasing `1.2.0`                                  |
| --------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| `release/x.y.z` branch name                   | `npm run nx:release` (or the `git push` question)                           | `release/1.2.0`                                          |
| `package.json` and `package-lock.json` (root) | The `chore(release): x.y.z` commit on the release branch                    | `"version": "1.2.0"`                                     |
| Git tag                                       | **Tag and GitHub release**, after the merge                                 | `1.2.0`                                                  |
| GitHub release                                | **Tag and GitHub release**, after the merge                                 | `1.2.0`                                                  |
| `/version.json` in the build                  | `nx run cv-mfe:version-info`, from `package.json`, on every build and serve | `{ "name": "@axel-pauwels/cv-mfe", "version": "1.2.0" }` |

You never edit a version by hand: the prompt writes it, CI checks it (**Version**) and tags it. `version.json` is never committed: it's generated from `package.json`, so the live site always reports the released version. The host ([cv-angular](https://github.com/AxelPauwels/cv-angular)) reads it at runtime for _Technical → Versions_.

**On `develop`** the version stays at the previous release until you merge `main` back ([step 4](#4-back-merge-main-into-develop)). Don't skip that step: without it, `develop` keeps the old version in `package.json`, and a local `npm start` reports that old version in `version.json`. The prompt still proposes the right next version (it starts from whichever is higher, the latest tag or `package.json`), but `develop` and `main` drift apart.

**Not the app version**, on purpose: any package that would be published to npm from this repository gets its **own** version and tags (`name@x.y.z`), like the npm packages in [cv-angular](https://github.com/AxelPauwels/cv-angular). Their version says what changed for the people who install them, so it can't follow the app's.

## Choosing the version

`npm run nx:release` and every `git push` of your checked-out branch ask:

```
  package.json version: 1.1.0
  latest release tag:   1.1.0

  Release develop?
    1) no, push as is
    2) patch  1.1.1   bug fixes only
    3) minor  1.2.0   new, backwards-compatible features
    4) major  2.0.0   breaking changes or a big redesign
    5) custom version

  Choice [1]:
```

Choosing a version:

1. fetches the tags and checks that the version is higher than the latest release and that `release/x.y.z` doesn't exist yet;
2. creates `release/x.y.z` from your current commit plus a `chore(release): x.y.z` commit that sets the version in `package.json` and `package-lock.json` (made in a temporary worktree: your checked-out branch and files are not touched), and pushes it;
3. prints the link to open the PR into `main`, and offers to open it with [`gh`](https://cli.github.com/) when that is installed.

The tag is made by CI after the merge. With `git push`, your own push carries on normally after the release branch is pushed.

The question is skipped when you push a `release/*` branch, tags, or a branch you haven't checked out; in CI and in git GUIs without a terminal; and with `SKIP_VERSION_PROMPT=1 git push` (or `git push --no-verify`, which skips all hooks). Ctrl+C stops the push.

You can still create a release branch by hand; it must contain the version commit, or the **Version** check fails:

```bash
git switch -c release/1.2.0
npm version 1.2.0 --no-git-tag-version
git commit -am "chore(release): 1.2.0"
git push -u origin release/1.2.0
```

## What runs where

| Event                                       | Workflow                                                                                                | What it does                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Push to `develop`, `release/**` or `main`   | [`ci.yml`](.github/workflows/ci.yml)                                                                    | Format check, lint, test, build, typecheck and e2e of the affected projects.           |
| Any pull request                            | [`ci.yml`](.github/workflows/ci.yml)                                                                    | Same checks.                                                                           |
| PR `develop` → `release/*` (or any other)   | [`firebase-hosting-pull-request.yml`](.github/workflows/firebase-hosting-pull-request.yml)              | Firebase preview channel, link posted on the PR.                                       |
| Any PR into `main`, opened/updated          | [`release.yml`](.github/workflows/release.yml) → **Source branch**                                      | Fails unless the PR comes from `release/x.y.z` in this repository. Required on `main`. |
| PR `release/x.y.z` → `main`, opened/updated | [`release.yml`](.github/workflows/release.yml) → **Version**                                            | Checks that the version is new and that `package.json` has it. Required on `main`.     |
| PR `release/x.y.z` → `main`, opened/updated | [`release.yml`](.github/workflows/release.yml) → **Firebase preview**                                   | Builds the PR's latest commit and deploys it to a preview channel.                     |
| PR `release/x.y.z` → `main`, merged         | [`release.yml`](.github/workflows/release.yml) → **Tag and GitHub release**                             | Tags the merge commit `x.y.z` and creates a GitHub release with notes.                 |
| PR `release/x.y.z` → `main`, merged         | [`release.yml`](.github/workflows/release.yml) → [`deploy-live.yml`](.github/workflows/deploy-live.yml) | After the tag: production build of the merge commit, deployed to the **live** channel. |
| By hand: _Actions → Deploy live_            | [`deploy-live.yml`](.github/workflows/deploy-live.yml)                                                  | Redeploys an existing release tag live, for example to roll back.                      |

**Only a merged release goes live.** Any other push or merge into `main` runs CI but is not deployed; the `main` ruleset also requires a pull request, so nothing reaches `main` without one.

### Why the tag is made on merge, not when the branch is created

The version is set as soon as the release branch is created, so the preview shows exactly what will be released. The **tag** waits until the merge because:

- a tag must point at the code that actually went live; fixes pushed to the release branch later would otherwise not be in the tagged commit;
- a PR that is closed without merging would leave a tag for a release that never happened;
- tags are hard to move once someone has fetched them.

### Checks on a PR into main

All three are required by the `main` ruleset; the PR can't be merged until they pass.

| Check             | Fails when                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Source branch** | The PR doesn't come from a `release/<major>.<minor>.<patch>` branch of this repository (for example `develop` → `main`, or a fork).                    |
| **Version**       | A tag with that version already exists, the version isn't higher than the latest release, or `package.json` / `package-lock.json` has another version. |
| **main** (CI)     | Format check, lint, test, build, typecheck or e2e fails.                                                                                               |

For a wrong branch name or an already released version, create a new release branch with `npm run nx:release`, open a new PR and close the old one. For a version mismatch, commit `npm version x.y.z --no-git-tag-version` on the release branch. Tags of npm packages (`name@x.y.z`, as in cv-angular) are ignored: app releases use plain version tags.

## Step by step

### 1. Create the release branch

On `develop`, run `npm run nx:release` (or push and answer the question). From now on, only fixes for this release go on the release branch; new features keep going to `develop`. To get later work from `develop` into the release, open a PR `develop` → `release/x.y.z`.

### 2. The release PR

Open the PR `release/x.y.z` → `main` (the prompt can do it). **Source branch**, **Version** and **CI** check it, and **Release / Firebase preview** builds it and posts the preview link on the PR.

Pushing more fixes to the release branch reruns all of them.

### 3. Merge

Merge with **Create a merge commit** (not squash or rebase), so `main` and `develop` keep sharing commits. Then **Release / Tag and GitHub release** tags the merge commit and creates the GitHub release, and **Release / Deploy live** deploys that commit live. If tagging fails, nothing is deployed. After the merge the release branch is **done**: don't push to it again (a new PR from it would fail, because its version is already tagged). You can delete it; the tag keeps the version.

### 4. Back-merge main into develop

```bash
git switch develop
git pull
git merge origin/main
git push
```

Or open a PR `main` → `develop`. This brings the version commit into `develop`, so the next release starts from the released version.

## Hotfixes

```bash
git switch main
git pull
npm run nx:release   # choose patch; creates release/x.y.z from main
# fix on the release branch, commit, push
```

Then follow steps 2 to 4. The back-merge brings the fix into `develop`.

## One-time repository setup

- **Actions permissions**: _Settings → Actions → General → Workflow permissions_ must not block the Tag job's `contents: write` (it pushes the tag). Choose _Read and write permissions_ if it fails with `403`.
- **Secret** used by the deploys: `FIREBASE_SERVICE_ACCOUNT_CV_ANGULAR_MFE`.
- **Rulesets** (_Settings → Rules → Rulesets_), already set up:

  | Ruleset            | Applies to   | Rules                                                                                                                                                                                                       |
  | ------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `main`             | `main`       | Pull request required (0 approvals, so you can merge your own), merge commits only, required checks **Source branch**, **Version** and **main**, no force push or deletion. No bypass, also not for admins. |
  | `develop`          | `develop`    | No force push or deletion.                                                                                                                                                                                  |
  | `release branches` | `release/**` | No force push, so reviewed commits can't be rewritten. Deleting after the merge is allowed.                                                                                                                 |
  | `release tags`     | tags `*.*.*` | Tags can't be moved or deleted. Creating them (by the Tag job) is allowed.                                                                                                                                  |

  Together they mean: nothing reaches `main` except a merged `release/x.y.z` PR whose checks all passed, and only that merge is tagged and deployed live.

## Troubleshooting

| Problem                                                         | Cause                                                               | Fix                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `release/x.y.z already exists` in the prompt                    | That release branch was created before.                             | Use that branch, or choose another version.                                                             |
| `Tag x.y.z already exists` on the PR                            | That version was released before.                                   | Use the next version.                                                                                   |
| New PR `release/x.y.z` → `main` after that release was merged   | Work was pushed to a release branch that is done.                   | Close the PR. Make sure the work is on `develop`, then release it from there with `npm run nx:release`. |
| `Version x.y.z must be higher than the latest release`          | A lower version than the last tag.                                  | Use a higher version.                                                                                   |
| **Source branch** fails                                         | The PR isn't from `release/x.y.z` (for example `develop` → `main`). | Close it and release with `npm run nx:release`.                                                         |
| **Version**: `package.json has version …, not x.y.z`            | The release branch has no version commit (created by hand).         | Commit `npm version x.y.z --no-git-tag-version` on the release branch.                                  |
| Warning `package.json on main is ..., not x.y.z` on the Tag job | The PR was merged before the Version job had finished.              | The tag is still made. Fix the version with a PR to `main`, or require the check.                       |
