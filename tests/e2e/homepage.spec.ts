import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Homepage', () => {
  test('should load the homepage and display all pillars', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // 1. Hero
    await expect(page.locator('h1')).toContainText("don't break at 3am");

    // 2. Proof (The Circuit Breaker Demo)
    await expect(page.getByRole('heading', { name: /Fail-Fast/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('p:has-text("live .NET 9 cluster")').first()).toBeVisible();

    // 3. Deep Dives
    await expect(page.getByRole('heading', { name: 'Architecture', exact: false })).toBeVisible({ timeout: 15000 });
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['region', 'scrollable-region-focusable', 'color-contrast', 'heading-order'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
