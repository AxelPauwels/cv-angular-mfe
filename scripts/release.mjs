#!/usr/bin/env node
// Asks whether to release the code being pushed and, if so, creates and pushes
// a `release/x.y.z` branch: the current commit plus `chore(release): x.y.z`,
// which sets the version in package.json / package-lock.json. The current
// branch is not touched (the commit is made in a temporary worktree). From
// there GitHub takes over (.github/workflows/release.yml): the release PR into
// main is checked and previewed; merging it tags `x.y.z` and deploys live.
// See "Releases" in README.md.
//
//   node scripts/release.mjs                   `npm run nx:release`
//   node scripts/release.mjs --hook <remote>   .husky/pre-push; the push goes on
//
// Set SKIP_VERSION_PROMPT=1 to push without being asked.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { ReadStream, WriteStream } from 'node:tty';

const args = process.argv.slice(2);
const isHook = args[0] === '--hook';
const remote = (isHook && args[1]) || 'origin';
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const git = (...gitArgs) =>
  execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();

const tryGit = (...gitArgs) => {
  try {
    return git(...gitArgs);
  } catch {
    return undefined;
  }
};

function readVersion() {
  return JSON.parse(readFileSync('package.json', 'utf8')).version;
}

/** Latest app release; package tags such as `mac-window@1.2.0` are ignored. */
function latestTag() {
  return git('tag', '--list', '[0-9]*.[0-9]*.[0-9]*', '--sort=-v:refname')
    .split('\n')
    .find((tag) => SEMVER.test(tag));
}

const parse = (version) => version.match(SEMVER).slice(1).map(Number);

function compare(a, b) {
  const [x, y] = [parse(a), parse(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

function bump(version, type) {
  const [major, minor, patch] = parse(version);
  return {
    major: `${major + 1}.0.0`,
    minor: `${major}.${minor + 1}.0`,
    patch: `${major}.${minor}.${patch + 1}`,
  }[type];
}

/**
 * Creates `releaseBranch` at HEAD plus a `chore(release): <version>` commit,
 * in a temporary worktree so the checked-out branch and its files stay as
 * they are.
 */
function createReleaseBranch(releaseBranch, version) {
  const dir = mkdtempSync(join(tmpdir(), 'release-'));
  try {
    git('worktree', 'add', '--quiet', '-b', releaseBranch, dir, 'HEAD');
    execFileSync('npm', ['version', version, '--no-git-tag-version'], {
      cwd: dir,
      stdio: 'ignore',
    });
    git('-C', dir, 'add', 'package.json', 'package-lock.json');
    // --no-verify: the message is fixed and only the version fields changed
    git(
      '-C',
      dir,
      'commit',
      '--quiet',
      '--no-verify',
      '-m',
      `chore(release): ${version}`
    );
  } finally {
    tryGit('worktree', 'remove', '--force', dir);
  }
}

/** `owner/repo` of a GitHub remote URL (ssh, ssh alias or https). */
function githubRepo() {
  const url = tryGit('remote', 'get-url', remote) ?? '';
  return url.match(/github\.com[^:/]*[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
}

/** Interactive terminal, also when git runs us as a hook (stdin = ref list). */
function openTerminal() {
  try {
    const input = new ReadStream(openSync('/dev/tty', 'r'));
    const outputFd = openSync('/dev/tty', 'w');
    const output = new WriteStream(outputFd);
    // Child processes (git push, gh) need the raw descriptor, not the stream
    return { input, output, outputFd };
  } catch {
    return undefined;
  }
}

function currentBranch() {
  return tryGit('symbolic-ref', '--quiet', '--short', 'HEAD');
}

/** In the hook: only ask when the checked-out branch itself is pushed. */
function shouldAskInHook() {
  if (process.env.SKIP_VERSION_PROMPT || process.env.CI) return false;
  const branch = currentBranch();
  // Detached HEAD, or a release branch that already carries its version
  if (!branch || branch.startsWith('release/')) return false;
  const head = git('rev-parse', 'HEAD');
  const refs = readFileSync(0, 'utf8').split('\n').filter(Boolean);
  return refs.some((line) => {
    const [localRef, localSha] = line.split(' ');
    return localSha === head && localRef === `refs/heads/${branch}`;
  });
}

async function main() {
  if (isHook && !shouldAskInHook()) return 0;

  const terminal = openTerminal();
  if (!terminal) {
    if (!isHook) console.error('nx:release needs an interactive terminal.');
    return isHook ? 0 : 1;
  }
  const rl = createInterface({
    input: terminal.input,
    output: terminal.output,
    terminal: true,
  });
  // The terminal is in raw mode, so Ctrl+C reaches readline instead of killing
  // us; without a listener readline would just pause and the push would hang.
  // Aborting rejects the pending question with an AbortError.
  const cancel = new AbortController();
  rl.on('SIGINT', () => cancel.abort());
  const ask = (query) => rl.question(query, { signal: cancel.signal });
  const say = (text = '') => terminal.output.write(`${text}\n`);
  const stopped = isHook ? '; push stopped.' : '.';

  try {
    tryGit('fetch', '--quiet', '--tags', remote);
    const branch = currentBranch() ?? 'HEAD';
    const current = readVersion();
    const latest = latestTag();
    // Bump from whichever is higher of the released tag and package.json
    const base = latest && compare(latest, current) > 0 ? latest : current;

    say();
    say(`  package.json version: ${current}`);
    say(`  latest release tag:   ${latest ?? '(none)'}`);
    say();
    say(`  Release ${branch}?`);
    say(isHook ? '    1) no, push as is' : '    1) no');
    say(`    2) patch  ${bump(base, 'patch')}   bug fixes only`);
    say(
      `    3) minor  ${bump(base, 'minor')}   new, backwards-compatible features`
    );
    say(
      `    4) major  ${bump(base, 'major')}   breaking changes or a big redesign`
    );
    say('    5) custom version');
    say();

    const choice = (await ask('  Choice [1]: ')).trim() || '1';
    const type = { 2: 'patch', 3: 'minor', 4: 'major' }[choice];
    let next;
    if (choice === '1') {
      say('  No release.');
      return 0;
    } else if (type) {
      next = bump(base, type);
    } else if (choice === '5') {
      next = (await ask('  Version (x.y.z): ')).trim();
    } else {
      say(`  Unknown choice "${choice}"${stopped}`);
      return 1;
    }

    const releaseBranch = `release/${next}`;
    if (!SEMVER.test(next)) {
      say(`  "${next}" is not a x.y.z version${stopped}`);
      return 1;
    }
    if (compare(next, base) <= 0) {
      say(`  ${next} must be higher than ${base}${stopped}`);
      return 1;
    }
    if (
      tryGit(
        'rev-parse',
        '--quiet',
        '--verify',
        `refs/heads/${releaseBranch}`
      ) ||
      tryGit('ls-remote', '--heads', remote, releaseBranch)
    ) {
      say(`  ${releaseBranch} already exists${stopped}`);
      return 1;
    }

    const from = git('rev-parse', '--short', 'HEAD');
    try {
      createReleaseBranch(releaseBranch, next);
    } catch (error) {
      tryGit('branch', '-D', releaseBranch);
      say(
        `  Creating ${releaseBranch} failed: ${error.message.trim()}${stopped}`
      );
      return 1;
    }
    say();
    say(
      `  Created ${releaseBranch}: ${branch} (${from}) + "chore(release): ${next}".`
    );
    const push = spawnSync('git', ['push', '-u', remote, releaseBranch], {
      stdio: ['ignore', terminal.outputFd, terminal.outputFd],
      env: { ...process.env, SKIP_VERSION_PROMPT: '1' },
    });
    if (push.status !== 0) {
      git('branch', '-D', releaseBranch);
      say(`  Pushing ${releaseBranch} failed; removed it again${stopped}`);
      return 1;
    }

    const repo = githubRepo();
    say();
    say(
      `  Pushed ${releaseBranch}. Next: open a PR into main; CI checks it and`
    );
    say(`  deploys a preview. Merging tags ${next} and deploys it live.`);
    if (repo) {
      say(
        `  https://github.com/${repo}/compare/main...${releaseBranch}?expand=1`
      );
    }

    const hasGh =
      spawnSync('gh', ['--version'], { stdio: 'ignore' }).status === 0;
    if (hasGh) {
      const open = (await ask('  Open the PR now with gh? [Y/n]: '))
        .trim()
        .toLowerCase();
      if (open === '' || open === 'y' || open === 'yes') {
        spawnSync(
          'gh',
          [
            'pr',
            'create',
            '--base',
            'main',
            '--head',
            releaseBranch,
            '--title',
            `Release ${next}`,
            '--body',
            `Release ${next}. Merging tags ${next}, creates the GitHub release and deploys it live.`,
          ],
          { stdio: ['ignore', terminal.outputFd, terminal.outputFd] }
        );
      }
    }
    say();
    return 0;
  } catch (error) {
    if (error.code !== 'ABORT_ERR') throw error;
    say();
    say(`  Cancelled${stopped}`);
    return 1;
  } finally {
    rl.close();
    terminal.input.destroy();
    terminal.output.destroy();
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error.message);
    process.exit(1);
  }
);
