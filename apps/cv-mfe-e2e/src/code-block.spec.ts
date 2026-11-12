import { expect, Locator, Page, test } from '@playwright/test';
import { CvMfeAttributes, mountCvMfe } from './support/cv-mfe';

const SNIPPET = `
    import { Component, input } from '@angular/core';

    @Component({ selector: 'app-greeting', template: '<p>Hello {{ name() }}</p>' })
    export class Greeting {
      readonly name = input<string>('world');
    }
  `;

const EXPECTED_LINES = [
  "import { Component, input } from '@angular/core';",
  '',
  "@Component({ selector: 'app-greeting', template: '<p>Hello {{ name() }}</p>' })",
  'export class Greeting {',
  "  readonly name = input<string>('world');",
  '}',
];

/**
 * Mounts <cv-mfe> with the snippet (plus extra attributes) and waits until
 * the highlighted <code> has replaced the plain-text one, so tests measure the
 * final DOM.
 */
async function mount(page: Page, attributes: CvMfeAttributes = {}) {
  const cvMfe = await mountCvMfe(page, { snippet: SNIPPET, ...attributes });
  await expect(cvMfe.locator('code [class^="hljs-"]').first()).toBeVisible();
  return cvMfe;
}

const clipboardWrites = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __clipboardWrites: string[] }).__clipboardWrites
  );

const copyButton = (cvMfe: Locator, name: 'Copy' | 'Copied' = 'Copy') =>
  cvMfe.getByRole('button', { name });

test.describe('code block', () => {
  test.beforeEach(async ({ page }) => {
    // Record clipboard writes instead of touching the real clipboard, which
    // needs browser-specific permissions.
    await page.addInitScript(() => {
      const writes: string[] = [];
      Object.defineProperty(window, '__clipboardWrites', { value: writes });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            writes.push(text);
          },
        },
      });
    });
  });

  test('renders the snippet without surrounding blank lines or indentation', async ({
    page,
  }) => {
    // Arrange: the snippet is indented and wrapped in blank lines

    // Act
    const cvMfe = await mount(page);

    // Assert
    await expect(cvMfe.locator('code')).toHaveText(EXPECTED_LINES.join('\n'), {
      useInnerText: true,
    });
  });

  test('highlights typescript', async ({ page }) => {
    // Arrange: typescript is the default language

    // Act
    const cvMfe = await mount(page);

    // Assert
    const code = cvMfe.locator('code');
    await expect(code.locator('.hljs-keyword').first()).toHaveText('import');
    await expect(code.locator('.hljs-string').first()).toHaveText(
      "'@angular/core'"
    );
  });

  test('highlights the language set on the element', async ({ page }) => {
    // Arrange
    const attributes = { snippet: '<p class="x">hi</p>', language: 'html' };

    // Act
    const cvMfe = await mountCvMfe(page, attributes);

    // Assert
    await expect(cvMfe.locator('code .hljs-name').first()).toHaveText('p');
    await expect(cvMfe.locator('code .hljs-attr')).toHaveText('class');
  });

  test('shows one line number per line, lined up with the code', async ({
    page,
  }) => {
    // Arrange
    const cvMfe = await mount(page);
    const gutter = cvMfe.locator('.code-block-gutter');

    // Act
    const gutterBox = await gutter.boundingBox();
    const codeBox = await cvMfe.locator('code').boundingBox();

    // Assert
    await expect(gutter.locator('span')).toHaveText(
      EXPECTED_LINES.map((_, i) => String(i + 1))
    );
    expect(gutterBox?.y).toBe(codeBox?.y);
    expect(gutterBox?.height).toBe(codeBox?.height);
  });

  test('hides line numbers when line-numbers="false"', async ({ page }) => {
    // Arrange
    const attributes = { 'line-numbers': 'false' };

    // Act
    const cvMfe = await mount(page, attributes);

    // Assert
    await expect(cvMfe.locator('.code-block-gutter')).toHaveCount(0);
  });

  test('reveals the copy button on hover', async ({ page }) => {
    // Arrange
    const cvMfe = await mount(page);
    await expect(copyButton(cvMfe)).toHaveCSS('opacity', '0');

    // Act
    await cvMfe.locator('pre').hover();

    // Assert
    await expect(copyButton(cvMfe)).toHaveCSS('opacity', '1');
  });

  test('copies the snippet and shows feedback', async ({ page }) => {
    // Arrange
    const cvMfe = await mount(page);
    await cvMfe.locator('pre').hover();

    // Act
    await copyButton(cvMfe).click();

    // Assert
    await expect(copyButton(cvMfe, 'Copied')).toBeVisible();
    expect(await clipboardWrites(page)).toEqual([EXPECTED_LINES.join('\n')]);
    await expect(copyButton(cvMfe)).toBeVisible({ timeout: 5000 });
  });

  test('hides the copy button when copyable="false"', async ({ page }) => {
    // Arrange
    const attributes = { copyable: 'false' };

    // Act
    const cvMfe = await mount(page, attributes);

    // Assert
    await expect(cvMfe.getByRole('button')).toHaveCount(0);
  });

  test('scrolls long lines horizontally while the gutter stays in place', async ({
    page,
  }) => {
    // Arrange
    await page.setViewportSize({ width: 360, height: 640 });
    const cvMfe = await mount(page);
    const pre = cvMfe.locator('pre');
    const gutter = cvMfe.locator('.code-block-gutter');
    const before = await gutter.boundingBox();
    expect(await pre.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true
    );

    // Act
    await pre.evaluate((el) => el.scrollTo({ left: 200 }));

    // Assert
    await expect(pre).toHaveJSProperty('scrollLeft', 200);
    expect((await gutter.boundingBox())?.x).toBe(before?.x);
  });
});
