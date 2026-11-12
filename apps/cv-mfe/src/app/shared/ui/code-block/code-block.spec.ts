import { TestBed } from '@angular/core/testing';
import { CodeBlock } from './code-block';
import { CodeBlockLanguage } from './code-block.languages';

type Inputs = Partial<{
  code: string;
  language: CodeBlockLanguage;
  lineNumbers: boolean | string;
  copyable: boolean | string;
}>;

const SOURCE = `
    const answer = 42;
    if (answer) {
      console.log(answer);
    }
  `;
const NORMALIZED =
  'const answer = 42;\nif (answer) {\n  console.log(answer);\n}';

/** Creates the component with the given inputs and waits for highlighting. */
async function render(inputs: Inputs = {}) {
  const fixture = TestBed.createComponent(CodeBlock);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

const codeText = (element: HTMLElement) =>
  element.querySelector('code')?.textContent;

const lineNumbers = (element: HTMLElement) =>
  Array.from(
    element.querySelectorAll('.code-block-gutter span'),
    (n) => n.textContent
  );

const copyButton = (element: HTMLElement) =>
  element.querySelector<HTMLButtonElement>('.code-block-copy');

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe('CodeBlock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('code', () => {
    it('strips surrounding blank lines and shared indentation', async () => {
      // Arrange
      const inputs = { code: SOURCE };

      // Act
      const { element } = await render(inputs);

      // Assert
      expect(codeText(element)).toBe(NORMALIZED);
    });

    it('replaces tabs with two spaces and handles windows line endings', async () => {
      // Arrange
      const inputs = { code: '\tfoo();\r\n\t\tbar();\r\n' };

      // Act
      const { element } = await render(inputs);

      // Assert
      expect(codeText(element)).toBe('foo();\n  bar();');
    });

    it('renders an empty block by default', async () => {
      // Arrange: no inputs

      // Act
      const { element } = await render();

      // Assert
      expect(codeText(element)).toBe('');
      expect(lineNumbers(element)).toEqual(['1']);
    });

    it('updates when the code changes', async () => {
      // Arrange
      const { fixture, element } = await render({ code: 'a();' });

      // Act
      fixture.componentRef.setInput('code', 'b();\nc();');
      await fixture.whenStable();

      // Assert
      expect(codeText(element)).toBe('b();\nc();');
      expect(lineNumbers(element)).toEqual(['1', '2']);
    });
  });

  describe('highlighting', () => {
    it('highlights typescript by default', async () => {
      // Arrange
      const inputs = { code: SOURCE };

      // Act
      const { element } = await render(inputs);

      // Assert
      expect(element.querySelector('code .hljs-keyword')?.textContent).toBe(
        'const'
      );
      expect(element.querySelector('code .hljs-number')?.textContent).toBe(
        '42'
      );
    });

    it('highlights html using the xml grammar', async () => {
      // Arrange
      const inputs = {
        code: '<p class="x">hi</p>',
        language: 'html' as const,
      };

      // Act
      const { element } = await render(inputs);

      // Assert
      expect(element.querySelector('code .hljs-name')?.textContent).toBe('p');
      expect(element.querySelector('code .hljs-attr')?.textContent).toBe(
        'class'
      );
    });

    it('re-highlights when the language changes', async () => {
      // Arrange
      const { fixture, element } = await render({
        code: '{"a": 1}',
        language: 'bash',
      });

      // Act
      fixture.componentRef.setInput('language', 'json');
      await fixture.whenStable();

      // Assert
      expect(element.querySelector('code .hljs-attr')?.textContent).toBe('"a"');
    });

    it('escapes the source instead of rendering it as markup', async () => {
      // Arrange
      const payload = '<img src=x onerror=alert(1)>';

      // Act
      const { element } = await render({ code: payload, language: 'bash' });

      // Assert
      expect(element.querySelector('code img')).toBeNull();
      expect(codeText(element)).toBe(payload);
    });
  });

  describe('line numbers', () => {
    it('renders one line number per line', async () => {
      // Arrange
      const inputs = { code: SOURCE };

      // Act
      const { element } = await render(inputs);

      // Assert
      expect(lineNumbers(element)).toEqual(['1', '2', '3', '4']);
    });

    it('hides the gutter from assistive technology', async () => {
      // Arrange
      const inputs = { code: SOURCE };

      // Act
      const { element } = await render(inputs);

      // Assert
      expect(
        element.querySelector('.code-block-gutter')?.getAttribute('aria-hidden')
      ).toBe('true');
    });

    it.each([false, 'false'])(
      'hides line numbers when lineNumbers is %j',
      async (lineNumbersInput) => {
        // Arrange
        const inputs = { code: SOURCE, lineNumbers: lineNumbersInput };

        // Act
        const { element } = await render(inputs);

        // Assert
        expect(element.querySelector('.code-block-gutter')).toBeNull();
        expect(
          element
            .querySelector('.code-block-pre')
            ?.classList.contains('code-block-pre-numbered')
        ).toBe(false);
      }
    );
  });

  describe('copy button', () => {
    it('is shown by default', async () => {
      // Arrange: no inputs

      // Act
      const { element } = await render();

      // Assert
      expect(copyButton(element)?.textContent?.trim()).toBe('Copy');
    });

    it.each([false, 'false'])(
      'is hidden when copyable is %j',
      async (copyableInput) => {
        // Arrange
        const inputs = { code: SOURCE, copyable: copyableInput };

        // Act
        const { element } = await render(inputs);

        // Assert
        expect(copyButton(element)).toBeNull();
      }
    );

    it('copies the normalized code and shows feedback', async () => {
      // Arrange
      const writeText = mockClipboard();
      const { fixture, element } = await render({ code: SOURCE });

      // Act
      copyButton(element)?.click();
      await fixture.whenStable();

      // Assert
      expect(writeText).toHaveBeenCalledExactlyOnceWith(NORMALIZED);
      expect(copyButton(element)?.textContent?.trim()).toBe('Copied');
    });

    it('resets the feedback after 2 seconds', async () => {
      // Arrange
      mockClipboard();
      const { fixture, element } = await render({ code: SOURCE });
      vi.useFakeTimers();
      copyButton(element)?.click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      // Act
      await vi.advanceTimersByTimeAsync(1999);
      fixture.detectChanges();
      const beforeTimeout = copyButton(element)?.textContent?.trim();
      await vi.advanceTimersByTimeAsync(1);
      fixture.detectChanges();

      // Assert
      expect(beforeTimeout).toBe('Copied');
      expect(copyButton(element)?.textContent?.trim()).toBe('Copy');
    });

    it('restarts the 2 second feedback when copied again', async () => {
      // Arrange
      mockClipboard();
      const { fixture, element } = await render({ code: SOURCE });
      vi.useFakeTimers();
      copyButton(element)?.click();
      await vi.advanceTimersByTimeAsync(1500);

      // Act
      copyButton(element)?.click();
      await vi.advanceTimersByTimeAsync(1500);
      fixture.detectChanges();

      // Assert
      expect(copyButton(element)?.textContent?.trim()).toBe('Copied');
    });

    it('cancels the pending reset when destroyed', async () => {
      // Arrange
      mockClipboard();
      const { fixture, element } = await render({ code: SOURCE });
      vi.useFakeTimers();
      copyButton(element)?.click();
      await vi.advanceTimersByTimeAsync(0);

      // Act
      fixture.destroy();

      // Assert
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
