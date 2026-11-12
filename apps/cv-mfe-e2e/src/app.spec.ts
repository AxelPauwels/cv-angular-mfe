import { expect, test } from '@playwright/test';
import { mountCvMfe } from './support/cv-mfe';

test.describe('app', () => {
  let errors: string[];

  test.beforeEach(({ page }) => {
    errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
  });

  test('boots standalone with an empty code block', async ({ page }) => {
    // Arrange: nothing to set up

    // Act
    await page.goto('/');

    // Assert
    const codeBlock = page.locator('app-root app-code-block');
    await expect(codeBlock.locator('code')).toHaveText('');
    await expect(codeBlock.locator('.code-block-gutter span')).toHaveText([
      '1',
    ]);
    expect(errors).toEqual([]);
  });

  test('registers <cv-mfe> and renders its inputs', async ({ page }) => {
    // Arrange
    const attributes = { snippet: 'const a = 1;' };

    // Act
    const cvMfe = await mountCvMfe(page, attributes);

    // Assert
    await expect(cvMfe.locator('code')).toHaveText('const a = 1;');
    expect(errors).toEqual([]);
  });
});
