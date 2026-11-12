# cv-mfe: using `<cv-mfe>`

cv-mfe is a [Native Federation](https://www.npmjs.com/package/@angular-architects/native-federation) remote. It exposes one module, `./web-components`, which registers the custom element `<cv-mfe>`. Any host page can use the element; it does not share an Angular application with the host.

| Environment | Remote entry                                           |
| ----------- | ------------------------------------------------------ |
| Production  | `https://cv-angular-mfe.web.app/remoteEntry.json`      |
| Local dev   | `http://localhost:4300/remoteEntry.json` (`npm start`) |

## Inputs

Every input is available as an **attribute** (kebab-case, always a string) and as a **property** (camelCase, typed). Changing either updates the element.

| Attribute      | Property      | Type (property)     | Default        | Description                                                                                                                                   |
| -------------- | ------------- | ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `snippet`      | `snippet`     | `Snippet`           | ` `` `         | Source code to show. Surrounding blank lines and shared indentation are removed, so an indented template literal can be passed as is.         |
| `language`     | `language`    | `CodeBlockLanguage` | `'typescript'` | Highlighting grammar; only the chosen one is downloaded. An unknown value shows the code without highlighting.                                |
| `line-numbers` | `lineNumbers` | `boolean`           | `true`         | Shows the line-number gutter. `false`, or the attribute value `"false"`, turns it off; any other value (also an empty attribute) turns it on. |
| `copyable`     | `copyable`    | `boolean`           | `true`         | Shows a "Copy" button (on hover or focus) that copies the snippet to the clipboard. `false` / `"false"` hides it.                             |

The element has no outputs/events.

### Types

```ts
/** Source code: a template literal (backticks), so multi-line code keeps its line breaks. */
type Snippet = `${string}`;

/** `html` is highlighted with the `xml` grammar. */
type CodeBlockLanguage = 'typescript' | 'javascript' | 'json' | 'xml' | 'css' | 'scss' | 'bash' | 'yaml' | 'html';
```

`Snippet` is a template literal type: TypeScript accepts any string for it, but it is meant for a backtick literal, which can span lines. Indent the code as deep as fits your source file; the shared indentation is removed:

```ts
const snippet: Snippet = `
  import { Component } from '@angular/core';

  @Component({ selector: 'app-hello', template: '<p>Hello</p>' })
  export class Hello {}
`;
```

The types live in this repository (`apps/cv-mfe/src/app`) and are not published as a package; a TypeScript host can copy the two lines above.

As an **attribute** every value is a plain string: write a multi-line snippet as a multi-line attribute value, and escape `"` as `&quot;` and `<` as `&lt;`. For anything but short snippets, prefer the property.

## Load it from an Angular host

1. Register the remote in the host's federation manifest (for example `public/federation.manifest.json`):

   ```json
   {
     "cv-mfe": "https://cv-angular-mfe.web.app/remoteEntry.json"
   }
   ```

2. Initialise federation with that manifest in the host's `main.ts`:

   ```ts
   import { initFederation } from '@angular-architects/native-federation';

   initFederation('federation.manifest.json').then(() => import('./bootstrap'));
   ```

3. Load the module once, then create the element and set its inputs as properties:

   ```ts
   import { loadRemoteModule } from '@angular-architects/native-federation';

   await loadRemoteModule('cv-mfe', './web-components');

   const element = document.createElement('cv-mfe');
   Object.assign(element, {
     snippet: `
       const answer = 42;
       console.log(answer);
     `,
     language: 'typescript',
     lineNumbers: false,
   });
   container.append(element);
   ```

   Or use it in a template; add `CUSTOM_ELEMENTS_SCHEMA` to the component that renders it and bind the properties:

   ```ts
   @Component({
     selector: 'app-example',
     schemas: [CUSTOM_ELEMENTS_SCHEMA],
     template: `<cv-mfe [snippet]="config" language="json" [copyable]="false"></cv-mfe>`,
   })
   export class Example {
     protected readonly config: Snippet = `
       { "name": "cv-mfe", "port": 4300 }
     `;
   }
   ```

## Plain HTML

Once `./web-components` is loaded, attributes are enough. Attribute values are plain strings (no backticks); line breaks inside the value are kept:

```html
<cv-mfe
  language="typescript"
  line-numbers="false"
  snippet="
    const answer = 42;
    console.log(answer);
  ">
</cv-mfe>
```

## Theming

The code block's colours are CSS custom properties, set on `app-code-block` inside the element. Override them from the host, for example:

```css
cv-mfe app-code-block {
  --code-block-bg: #0d1117;
  --code-block-fg: #e6edf3;
  --code-block-border: #30363d;
}
```

Available properties: `--code-block-bg`, `--code-block-fg`, `--code-block-border`, `--code-block-muted`, `--code-block-keyword`, `--code-block-string`, `--code-block-title`, `--code-block-type`, `--code-block-number`, `--code-block-comment`, `--code-block-tag` and `--code-block-font`.
