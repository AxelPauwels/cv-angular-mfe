import { booleanAttribute, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CodeBlock, Snippet } from './shared/ui/code-block/code-block';
import { CodeBlockLanguage } from './shared/ui/code-block/code-block.languages';

/**
 * Root of the cv-mfe remote. Hosts render it as the `<cv-mfe>` custom element
 * (registered by the federated `./web-components` module); standalone it is
 * bootstrapped as `<app-root>`.
 *
 * As a custom element every input is both an attribute (kebab-case, always a
 * string) and a property (camelCase, typed). The getting-started page
 * (apps/cv-mfe/README.md) shows how to load the element.
 *
 * ```html
 * <cv-mfe
 *   snippet="const answer = 42;"
 *   language="typescript"
 *   line-numbers="false"
 *   copyable="true">
 * </cv-mfe>
 * ```
 */
@Component({
  imports: [RouterModule, CodeBlock],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'cv-micro-frontend';

  /**
   * Source code to show, as a template literal (`Snippet`, backticks), so
   * multi-line code keeps its line breaks. Surrounding blank lines and shared
   * indentation are removed, so an indented literal can be passed as is.
   *
   * Attribute: `snippet` (a plain string; line breaks in the value are kept).
   * Default: an empty literal.
   */
  readonly snippet = input<Snippet>(``);

  /**
   * Highlighting grammar: `typescript`, `javascript`, `json`, `html`, `xml`,
   * `css`, `scss`, `bash` or `yaml`. Only the chosen grammar is downloaded;
   * an unknown value shows the code without highlighting.
   *
   * Attribute: `language`. Default: `typescript`.
   */
  readonly language = input<CodeBlockLanguage>('typescript');

  /**
   * Shows the line-number gutter. Any value except `false` (or the attribute
   * `"false"`) enables it.
   *
   * Attribute: `line-numbers`. Default: `true`.
   */
  readonly lineNumbers = input(true, { transform: booleanAttribute });

  /**
   * Shows a "Copy" button (on hover or keyboard focus) that copies the
   * normalized snippet to the clipboard.
   *
   * Attribute: `copyable`. Default: `true`.
   */
  readonly copyable = input(true, { transform: booleanAttribute });
}
