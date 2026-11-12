import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CodeBlock } from './code-block';

describe('CodeBlock', () => {
  let fixture: ComponentFixture<CodeBlock>;
  let element: HTMLElement;

  const code = `
    const answer = 42;
    if (answer) {
      console.log(answer);
    }
  `;

  beforeEach(async () => {
    fixture = TestBed.createComponent(CodeBlock);
    fixture.componentRef.setInput('code', code);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('strips surrounding blank lines and shared indentation', () => {
    expect(element.querySelector('code')?.textContent).toBe(
      'const answer = 42;\nif (answer) {\n  console.log(answer);\n}'
    );
  });

  it('highlights the code', () => {
    expect(element.querySelector('code .hljs-keyword')?.textContent).toBe(
      'const'
    );
  });

  it('renders one line number per line', () => {
    const numbers = element.querySelectorAll('.code-block-gutter span');
    expect(Array.from(numbers, (n) => n.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('hides line numbers when disabled', async () => {
    fixture.componentRef.setInput('lineNumbers', false);
    await fixture.whenStable();
    expect(element.querySelector('.code-block-gutter')).toBeNull();
  });

  it('copies the normalized code to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const button = element.querySelector<HTMLButtonElement>('.code-block-copy');
    button?.click();
    await fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(
      'const answer = 42;\nif (answer) {\n  console.log(answer);\n}'
    );
    expect(button?.textContent?.trim()).toBe('Copied');
  });

  it('resets the copied feedback after 2 seconds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    vi.useFakeTimers();
    try {
      const button =
        element.querySelector<HTMLButtonElement>('.code-block-copy');
      button?.click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
      expect(button?.textContent?.trim()).toBe('Copied');

      await vi.advanceTimersByTimeAsync(2000);
      fixture.detectChanges();
      expect(button?.textContent?.trim()).toBe('Copy');
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides the copy button when not copyable', async () => {
    fixture.componentRef.setInput('copyable', false);
    await fixture.whenStable();
    expect(element.querySelector('.code-block-copy')).toBeNull();
  });

  it('renders an empty block when no code is given', async () => {
    fixture.componentRef.setInput('code', '');
    await fixture.whenStable();
    expect(element.querySelector('code')?.textContent).toBe('');
    expect(element.querySelectorAll('.code-block-gutter span')).toHaveLength(1);
  });

  it('normalizes tabs and windows line endings', async () => {
    fixture.componentRef.setInput('code', '\tfoo();\r\n\t\tbar();\r\n');
    await fixture.whenStable();
    expect(element.querySelector('code')?.textContent).toBe('foo();\n  bar();');
  });

  it('highlights html using the xml grammar', async () => {
    fixture.componentRef.setInput('code', '<p class="x">hi</p>');
    fixture.componentRef.setInput('language', 'html');
    await fixture.whenStable();
    expect(element.querySelector('code .hljs-name')?.textContent).toBe('p');
    expect(element.querySelector('code .hljs-attr')?.textContent).toBe('class');
  });

  it('escapes the source instead of rendering it as markup', async () => {
    fixture.componentRef.setInput('code', '<img src=x onerror=alert(1)>');
    fixture.componentRef.setInput('language', 'bash');
    await fixture.whenStable();
    expect(element.querySelector('code img')).toBeNull();
    expect(element.querySelector('code')?.textContent).toBe(
      '<img src=x onerror=alert(1)>'
    );
  });
});
