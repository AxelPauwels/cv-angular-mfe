import type { LanguageFn } from 'highlight.js';

/**
 * Languages the code block can highlight. Each grammar is lazy-loaded the
 * first time it is needed, so only what is actually rendered gets downloaded
 * (the full highlight.js bundle with every grammar is ~1MB).
 */
const LANGUAGE_LOADERS = {
  typescript: () => import('highlight.js/lib/languages/typescript'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  json: () => import('highlight.js/lib/languages/json'),
  xml: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  scss: () => import('highlight.js/lib/languages/scss'),
  bash: () => import('highlight.js/lib/languages/bash'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
} satisfies Record<string, () => Promise<{ default: LanguageFn }>>;

/** Grammars the code block can highlight; `html` is an alias of `xml`. */
export type CodeBlockLanguage = keyof typeof LANGUAGE_LOADERS | 'html';

/** `html` is registered by highlight.js as an alias of the `xml` grammar. */
const ALIASES: Partial<
  Record<CodeBlockLanguage, keyof typeof LANGUAGE_LOADERS>
> = { html: 'xml' };

export function loadLanguage(
  language: CodeBlockLanguage
): Promise<{ name: string; grammar: LanguageFn }> {
  const name = ALIASES[language] ?? (language as keyof typeof LANGUAGE_LOADERS);
  return LANGUAGE_LOADERS[name]().then((m) => ({ name, grammar: m.default }));
}
