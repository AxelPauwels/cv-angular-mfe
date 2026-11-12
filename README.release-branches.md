# Release branches

How the cv-mfe remote goes from `develop` to production, and how it gets its version and git tag. It works like the [cv-angular](https://github.com/AxelPauwels/cv-angular) host, plus a prompt that creates the release branch for you.

## TL;DR

```bash
# 1. On develop: choose the version; this creates and pushes release/x.y.z
#    (and can open the PR into main with gh)
npm run nx:release
#    `git push` on develop asks the same question

# 2. The PR release/x.y.z → main gets the version commit and a Firebase preview

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
2. creates `release/x.y.z` from your current commit and pushes it;
3. prints the link to open the PR into `main`, and offers to open it with [`gh`](https://cli.github.com/) when that is installed.

Nothing is committed locally: the version commit and the tag are made by CI. With `git push`, your own push carries on normally after the release branch is pushed.

The question is skipped when you push a `release/*` branch, tags, or a branch you haven't checked out; in CI and in git GUIs without a terminal; and with `SKIP_VERSION_PROMPT=1 git push` (or `git push --no-verify`, which skips all hooks). Ctrl+C stops the push.

You can still create a release branch by hand (`git switch -c release/1.2.0 && git push -u origin release/1.2.0`); CI treats it the same.

## What runs where

| Event                                       | Workflow                                                                                                | What it does                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Push to `develop`, `release/**` or `main`   | [`ci.yml`](.github/workflows/ci.yml)                                                                    | Format check, lint, test, build, typecheck and e2e of the affected projects.           |
| Any pull request                            | [`ci.yml`](.github/workflows/ci.yml)                                                                    | Same checks.                                                                           |
| PR `develop` → `release/*` (or any other)   | [`firebase-hosting-pull-request.yml`](.github/workflows/firebase-hosting-pull-request.yml)              | Firebase preview channel, link posted on the PR.                                       |
| PR `release/x.y.z` → `main`, opened/updated | [`release.yml`](.github/workflows/release.yml) → **Version**                                            | Checks the version, sets it in `package.json`, commits `chore(release): x.y.z`.        |
| PR `release/x.y.z` → `main`, opened/updated | [`release.yml`](.github/workflows/release.yml) → **Firebase preview**                                   | Builds the version commit and deploys it to a preview channel.                         |
| PR `release/x.y.z` → `main`, merged         | [`release.yml`](.github/workflows/release.yml) → **Tag and GitHub release**                             | Tags the merge commit `x.y.z` and creates a GitHub release with notes.                 |
| PR `release/x.y.z` → `main`, merged         | [`release.yml`](.github/workflows/release.yml) → [`deploy-live.yml`](.github/workflows/deploy-live.yml) | After the tag: production build of the merge commit, deployed to the **live** channel. |
| By hand: _Actions → Deploy live_            | [`deploy-live.yml`](.github/workflows/deploy-live.yml)                                                  | Redeploys an existing release tag live, for example to roll back.                      |

**Only a merged release goes live.** Any other push or merge into `main` runs CI but is not deployed; the `main` ruleset also requires a pull request, so nothing reaches `main` without one.

### Why the tag is made on merge, not when the branch is created

The version is set as soon as the PR is opened, so the preview shows exactly what will be released. The **tag** waits until the merge because:

- a tag must point at the code that actually went live; fixes pushed to the release branch later would otherwise not be in the tagged commit;
- a PR that is closed without merging would leave a tag for a release that never happened;
- tags are hard to move once someone has fetched them.

### Checks done by the Version job

The job fails, with a message on the PR, when:

- the branch name is not `release/<major>.<minor>.<patch>`;
- a tag with that version already exists;
- the version is not higher than the latest release tag.

Fix it by creating a branch with the right name, opening a new PR and closing the old one. Tags of npm packages (`name@x.y.z`, as in cv-angular) are ignored: app releases use plain version tags.

## Step by step

### 1. Create the release branch

On `develop`, run `npm run nx:release` (or push and answer the question). From now on, only fixes for this release go on the release branch; new features keep going to `develop`. To get later work from `develop` into the release, open a PR `develop` → `release/x.y.z`.

### 2. The release PR

Open the PR `release/x.y.z` → `main` (the prompt can do it). Within a minute, **Release / Version** commits `chore(release): x.y.z` as `github-actions[bot]` to the release branch, and **Release / Firebase preview** builds that commit and posts the preview link on the PR.

Pushing more fixes reruns both jobs; the version commit is only made once. Run `git pull` on your local release branch before pushing again, because the bot added a commit.

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

- **Actions permissions**: _Settings → Actions → General → Workflow permissions_ must not block the workflows' `contents: write`. Choose _Read and write permissions_ if the Version or Tag job fails with `403`.
- **Secret** used by the deploys: `FIREBASE_SERVICE_ACCOUNT_CV_ANGULAR_MFE`.
- **Rulesets** (_Settings → Rules → Rulesets_), already set up:

  | Ruleset            | Applies to     | Rules                                                                                                                     |
  | ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
  | `main`             | default branch | Pull request required (0 approvals, so you can merge your own), merge commits only, no force push or deletion. No bypass. |
  | `develop`          | `develop`      | No force push or deletion.                                                                                                |
  | `release branches` | `release/**`   | No force push, so the bot's version commit can't be overwritten. Deleting after the merge is allowed.                     |
  | `release tags`     | tags `*.*.*`   | Tags can't be moved or deleted. Creating them (by the Tag job) is allowed.                                                |

  Required status checks are deliberately **not** on `main` yet: without `RELEASE_TOKEN` (below) the bot's version commit gets no checks, so every release PR would wait forever. After adding the token, add a _Require status checks to pass_ rule to the `main` ruleset with `main` (the CI job) and `Version`. Requiring `Version` also means only `release/*` PRs can be merged into `main`.

- `RELEASE_TOKEN` (needed before requiring checks): a push with the default `GITHUB_TOKEN` [doesn't start new workflow runs](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow), so `CI` doesn't rerun on the bot's version commit. With required checks on `main` the PR then waits forever. Add a fine-grained token for this repository with **Contents: Read and write** as `RELEASE_TOKEN`; the Version job uses it automatically.

## Troubleshooting

| Problem                                                          | Cause                                                  | Fix                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `release/x.y.z already exists` in the prompt                     | That release branch was created before.                | Use that branch, or choose another version.                                                             |
| `Tag x.y.z already exists` on the PR                             | That version was released before.                      | Use the next version.                                                                                   |
| New PR `release/x.y.z` → `main` after that release was merged    | Work was pushed to a release branch that is done.      | Close the PR. Make sure the work is on `develop`, then release it from there with `npm run nx:release`. |
| `Version x.y.z must be higher than the latest release`           | A lower version than the last tag.                     | Use a higher version.                                                                                   |
| `rejected ... (fetch first)` when you push to the release branch | The bot added the version commit.                      | `git pull`, then push.                                                                                  |
| PR waits for checks after the version commit                     | Required checks and no `RELEASE_TOKEN`.                | Add `RELEASE_TOKEN`, or push any commit to the release branch yourself.                                 |
| Warning `package.json on main is ..., not x.y.z` on the Tag job  | The PR was merged before the Version job had finished. | The tag is still made. Fix the version with a PR to `main`, or require the check.                       |
