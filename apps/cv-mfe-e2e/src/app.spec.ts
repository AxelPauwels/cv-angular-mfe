import { expect, test } from '@playwright/test';

test.describe('app', () => {
  test('boots without console or page errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/');

    await expect(page.locator('app-root app-code-block')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
