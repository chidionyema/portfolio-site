import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Homepage', () => {
  test('should load and render hero, challenges, and navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Hero renders with a heading
    await expect(page.locator('h1')).toBeVisible();

    // Primary CTA exists
    await expect(page.getByRole('link', { name: /see what i built/i }).first()).toBeVisible();

    // Challenges section renders
    await expect(page.locator('#challenges')).toBeVisible({ timeout: 15000 });

    // Navigation links are present
    await expect(page.getByRole('link', { name: /architecture/i }).first()).toBeVisible();
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['region', 'scrollable-region-focusable', 'color-contrast', 'heading-order'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
