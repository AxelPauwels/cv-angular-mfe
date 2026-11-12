// Compodoc 2.0 lists a class's own doc comment as a JSDoc tag, so every
// documented component gets an "Example" heading with nothing under it.
// Removes only those empty sections from the generated HTML.
//
//   node tools/compodoc/strip-empty-examples.mjs <output folder>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EMPTY_EXAMPLE =
  /<p class="comment">\s*<h3>Example<\/h3>\s*<\/p>\s*<div class="io-description">\s*<\/div>/g;

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: strip-empty-examples.mjs <output folder>');
  process.exit(1);
}

let stripped = 0;
for (const entry of readdirSync(folder, { recursive: true })) {
  const file = join(folder, entry);
  if (!file.endsWith('.html')) continue;
  const html = readFileSync(file, 'utf8');
  const cleaned = html.replace(EMPTY_EXAMPLE, () => {
    stripped++;
    return '';
  });
  if (cleaned !== html) writeFileSync(file, cleaned);
}
console.log(`Removed ${stripped} empty "Example" section(s).`);
