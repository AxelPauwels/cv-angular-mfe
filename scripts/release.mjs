#!/usr/bin/env node
// Asks whether to version the code being pushed and, if so, bumps the version
// in package.json / package-lock.json and commits `chore(release): x.y.z`.
// Tags are NOT made here: .github/workflows/release.yml tags the commit once
// the version lands on main. See "Releases" in README.md.
//
//   node scripts/release.mjs          `npm run nx:release`: ask, commit, offer to push
//   node scripts/release.mjs --hook   .husky/pre-push: ask, commit, stop the push
//
// Set SKIP_VERSION_PROMPT=1 to push without being asked.

import { execFileSync } from 'node:child_process';
import { openSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { ReadStream, WriteStream } from 'node:tty';

const isHook = process.argv.includes('--hook');
const RELEASE_COMMIT = /^chore\(release\): /;
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function readVersion() {
  return JSON.parse(readFileSync('package.json', 'utf8')).version;
}

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

/** Interactive terminal, also when git runs us as a hook (stdin = ref list). */
function openTerminal() {
  try {
    const input = new ReadStream(openSync('/dev/tty', 'r'));
    const output = new WriteStream(openSync('/dev/tty', 'w'));
    return { input, output };
  } catch {
    return undefined;
  }
}

/** Refs git is about to push, read from the pre-push hook's stdin. */
function pushedRefs() {
  return readFileSync(0, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [localRef, localSha, remoteRef] = line.split(' ');
      return { localRef, localSha, remoteRef };
    });
}

function shouldAskInHook() {
  if (process.env.SKIP_VERSION_PROMPT || process.env.CI) return false;
  const head = git('rev-parse', 'HEAD');
  // Only ask when the current branch is pushed (not tags, deletes or other branches)
  const pushesHead = pushedRefs().some(
    (ref) => ref.localSha === head && ref.localRef.startsWith('refs/heads/')
  );
  if (!pushesHead) return false;
  // Already versioned: this is the push after `chore(release): x.y.z`
  return !RELEASE_COMMIT.test(git('log', '-1', '--format=%s'));
}

async function main() {
  if (isHook && !shouldAskInHook()) return 0;

  const terminal = openTerminal();
  if (!terminal) {
    if (!isHook) console.error('nx:release needs an interactive terminal.');
    return isHook ? 0 : 1;
  }
  const rl = createInterface({ ...terminal, terminal: true });
  // The terminal is in raw mode, so Ctrl+C reaches readline instead of killing
  // us; without a listener readline would just pause and the push would hang.
  // Aborting rejects the pending question with an AbortError.
  const cancel = new AbortController();
  rl.on('SIGINT', () => cancel.abort());
  const ask = (query) => rl.question(query, { signal: cancel.signal });
  const say = (text = '') => terminal.output.write(`${text}\n`);

  try {
    const current = readVersion();
    const latest = latestTag();
    // Bump from whichever is higher, so a version that is in package.json but
    // not yet released (no tag) is not skipped, and vice versa.
    const base = latest && compare(latest, current) > 0 ? latest : current;

    say();
    say(`  package.json version: ${current}`);
    say(`  latest release tag:   ${latest ?? '(none)'}`);
    say();
    say('  Version this push?');
    say('    1) no, push as is');
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
      say('  Not versioned.');
      return 0;
    } else if (type) {
      next = bump(base, type);
    } else if (choice === '5') {
      next = (await ask('  Version (x.y.z): ')).trim();
    } else {
      say(`  Unknown choice "${choice}"; push stopped.`);
      return 1;
    }

    if (!SEMVER.test(next ?? '')) {
      say(`  "${next}" is not a x.y.z version; push stopped.`);
      return 1;
    }
    if (compare(next, current) <= 0 || (latest && compare(next, latest) <= 0)) {
      say(`  ${next} must be higher than ${current} and ${latest ?? current}.`);
      return 1;
    }
    const dirty = git(
      'status',
      '--porcelain',
      '--',
      'package.json',
      'package-lock.json'
    );
    if (dirty) {
      say('  package.json or package-lock.json has uncommitted changes;');
      say('  commit or stash them first.');
      return 1;
    }

    execFileSync('npm', ['version', next, '--no-git-tag-version'], {
      stdio: 'ignore',
    });
    git('add', 'package.json', 'package-lock.json');
    // --no-verify: the message is fixed and only the version fields changed
    execFileSync(
      'git',
      ['commit', '--no-verify', '-m', `chore(release): ${next}`],
      { stdio: 'ignore' }
    );
    say();
    say(`  Committed "chore(release): ${next}".`);
    say('  The tag and GitHub release are made by CI when it reaches main.');

    if (isHook) {
      // git already decided what to push before this hook ran, so the new
      // commit would be left out. Stop this push; the next one includes it
      // and is not asked again.
      say();
      say('  Run `git push` again to push it (git will report this push as');
      say('  failed - that is expected).');
      say();
      return 1;
    }

    const push = (await ask('  Push now? [Y/n]: ')).trim().toLowerCase();
    if (push === '' || push === 'y' || push === 'yes') {
      rl.close();
      execFileSync('git', ['push'], {
        stdio: 'inherit',
        env: { ...process.env, SKIP_VERSION_PROMPT: '1' },
      });
    }
    return 0;
  } catch (error) {
    if (error.code !== 'ABORT_ERR') throw error;
    say();
    say(isHook ? '  Cancelled; push stopped.' : '  Cancelled.');
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
