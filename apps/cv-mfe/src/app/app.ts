import { booleanAttribute, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CodeBlock, Snippet } from './shared/ui/code-block/code-block';
import { CodeBlockLanguage } from './shared/ui/code-block/code-block.languages';

@Component({
  imports: [RouterModule, CodeBlock],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'cv-micro-frontend';
  readonly snippet = input<Snippet>(``);
  readonly language = input<CodeBlockLanguage>('typescript');
  readonly lineNumbers = input(true, { transform: booleanAttribute });
  readonly copyable = input(true, { transform: booleanAttribute });
}
