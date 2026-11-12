import { expect, test } from '@playwright/test';

const EXPECTED_LINES = [
  "import { Component, input } from '@angular/core';",
  '',
  "@Component({ selector: 'app-greeting', template: '<p>Hello {{ name() }}</p>' })",
  'export class Greeting {',
  "  readonly name = input<string>('world');",
  '}',
];

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
    await page.goto('/');
    // The plain-text <code> is swapped for the highlighted one once the
    // grammar has lazy-loaded; wait for that so tests measure the final DOM.
    await expect(
      page.locator('app-code-block code .hljs-keyword').first()
    ).toBeVisible();
  });

  test('renders the code without surrounding blank lines or indentation', async ({
    page,
  }) => {
    await expect(page.locator('app-code-block code')).toHaveText(
      EXPECTED_LINES.join('\n'),
      { useInnerText: true }
    );
  });

  test('highlights the code', async ({ page }) => {
    const code = page.locator('app-code-block code');
    await expect(code.locator('.hljs-keyword').first()).toHaveText('import');
    await expect(code.locator('.hljs-string').first()).toHaveText(
      "'@angular/core'"
    );
    await expect(code.locator('.hljs-comment')).toHaveCount(0);
  });

  test('shows one line number per line', async ({ page }) => {
    await expect(page.locator('.code-block-gutter span')).toHaveText(
      EXPECTED_LINES.map((_, i) => String(i + 1))
    );
  });

  test('line numbers line up with the code lines', async ({ page }) => {
    const gutter = await page.locator('.code-block-gutter').boundingBox();
    const code = await page.locator('app-code-block code').boundingBox();
    expect(gutter?.y).toBe(code?.y);
    expect(gutter?.height).toBe(code?.height);
  });

  test('reveals the copy button on hover', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Copy' });
    await expect(button).toHaveCSS('opacity', '0');

    await page.locator('app-code-block pre').hover();

    await expect(button).toHaveCSS('opacity', '1');
  });

  test('copies the code and shows feedback', async ({ page }) => {
    await page.locator('app-code-block pre').hover();
    await page.getByRole('button', { name: 'Copy' }).click();

    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __clipboardWrites: string[] })
            .__clipboardWrites
      )
    ).toEqual([EXPECTED_LINES.join('\n')]);

    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible({
      timeout: 5000,
    });
  });

  test('scrolls long lines horizontally while the gutter stays in place', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const pre = page.locator('app-code-block pre');
    const gutter = page.locator('.code-block-gutter');

    const overflows = await pre.evaluate(
      (el) => el.scrollWidth > el.clientWidth
    );
    expect(overflows).toBe(true);

    const before = await gutter.boundingBox();
    await pre.evaluate((el) => el.scrollTo({ left: 200 }));
    await expect(pre).toHaveJSProperty('scrollLeft', 200);
    const after = await gutter.boundingBox();

    expect(after?.x).toBe(before?.x);
  });
});
