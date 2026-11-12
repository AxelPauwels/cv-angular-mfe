import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  resource,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { CodeBlockLanguage, loadLanguage } from './code-block.languages';

const COPIED_FEEDBACK_MS = 2000;
/**
 * Source code passed to the code block: meant for a template literal
 * (backticks), so multi-line code keeps its line breaks. Accepts any string.
 */
export type Snippet = `${string}`;

/**
 * Read-only, syntax-highlighted code with optional line numbers and a copy
 * button. Highlighting uses highlight.js; the core and the grammar are
 * lazy-loaded on first use.
 *
 * Colours are CSS custom properties on the element (`--code-block-bg`,
 * `--code-block-fg`, `--code-block-border`, `--code-block-muted`,
 * `--code-block-keyword`, `--code-block-string`, `--code-block-title`,
 * `--code-block-type`, `--code-block-number`, `--code-block-comment`,
 * `--code-block-tag`, `--code-block-font`), so a host can theme it.
 *
 * ```html
 * <app-code-block [code]="source" language="json" [lineNumbers]="false" />
 * ```
 */
@Component({
  selector: 'app-code-block',
  templateUrl: './code-block.html',
  styleUrl: './code-block.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Highlighted markup is injected via innerHTML and therefore carries no
  // emulated-encapsulation attributes; styles are scoped by the host selector.
  encapsulation: ViewEncapsulation.None,
})
export class CodeBlock {
  /** Code to show; surrounding blank lines and shared indentation are removed. */
  readonly code = input<Snippet>(``);
  /** Highlighting grammar. */
  readonly language = input<CodeBlockLanguage>('typescript');
  /** Shows the line-number gutter. */
  readonly lineNumbers = input(true, { transform: booleanAttribute });
  /** Shows the copy-to-clipboard button. */
  readonly copyable = input(true, { transform: booleanAttribute });

  /** Code without surrounding blank lines and shared indentation. */
  protected readonly normalizedCode = computed(() => normalize(this.code()));

  protected readonly lines = computed(() =>
    Array.from(
      { length: this.normalizedCode().split('\n').length },
      (_, i) => i + 1
    )
  );

  /** Highlighted HTML, or undefined while highlight.js/grammar is loading. */
  protected readonly highlighted = resource({
    params: () => ({ code: this.normalizedCode(), language: this.language() }),
    loader: async ({ params }) => {
      const [{ default: hljs }, { name, grammar }] = await Promise.all([
        import('highlight.js/lib/core'),
        loadLanguage(params.language),
      ]);
      if (!hljs.getLanguage(name)) {
        hljs.registerLanguage(name, grammar);
      }
      // highlight.js escapes the source, so the result is safe to inject.
      return hljs.highlight(params.code, { language: name }).value;
    },
  });

  protected readonly copied = signal(false);

  private copiedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
  }

  protected async copy(): Promise<void> {
    await navigator.clipboard.writeText(this.normalizedCode());
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(
      () => this.copied.set(false),
      COPIED_FEEDBACK_MS
    );
  }
}

function normalize(code: string): string {
  const lines = code.replace(/\t/g, '  ').split(/\r?\n/);
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  const indent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => line.length - line.trimStart().length)
  );
  return Number.isFinite(indent)
    ? lines.map((line) => line.slice(indent)).join('\n')
    : '';
}
