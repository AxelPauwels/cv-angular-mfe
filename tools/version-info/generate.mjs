/**
 * Writes version.json (name and version from package.json) for the build, so a
 * host can show which version of this remote it loads at runtime. Copied into
 * the build root as /version.json (see apps/cv-mfe/project.json).
 *
 * Run with `nx run cv-mfe:version-info`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const outDir = join(root, 'dist/.version-info');

const { name, version } = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8')
);

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'version.json'),
  JSON.stringify({ name, version }, null, 2)
);
console.log(`version.json (${name}@${version}) written to ${outDir}`);
