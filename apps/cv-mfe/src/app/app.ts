import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CodeBlock } from './shared/ui/code-block/code-block';

@Component({
  imports: [RouterModule, CodeBlock],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'cv-mfe';

  protected readonly snippet = `
    import { Component, input } from '@angular/core';

    @Component({ selector: 'app-greeting', template: '<p>Hello {{ name() }}</p>' })
    export class Greeting {
      readonly name = input<string>('world');
    }
  `;
}
