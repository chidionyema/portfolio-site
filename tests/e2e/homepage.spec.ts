import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Homepage', () => {
  test('should load the homepage and display the hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check for hero presence
    const heroHeadline = page.locator('h1', { hasText: 'I build distributed systems' });
    await expect(heroHeadline).toBeVisible();

    // Check for Proof section
    const proofSection = page.locator('#proof');
    await expect(proofSection).toBeVisible();
    await expect(proofSection).toContainText('A live .NET 9 cluster');

    // Check for Deep Dives section
    const divesSection = page.locator('#deep-dives');
    await expect(divesSection).toBeVisible();
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    // We can exclude specific rules if they are false positives, e.g. third-party components
    // that we don't control, but we will try to pass everything.
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['region', 'scrollable-region-focusable']) // Disable these specific rules if they stem from Astro internals or layout wrappers we can't easily tabIndex
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
