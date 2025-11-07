import { test } from '@playwright/test';

const RUN_E2E = process.env.RUN_E2E_TESTS === 'true';

test.describe.configure({ mode: 'serial' });

test.describe('Cohort Intelligence Hub', () => {
  test.skip(!RUN_E2E, 'Enable RUN_E2E_TESTS=true to execute dashboard metrics smoke test.');

  test('renders intelligence modules', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.locator('text=Cohort Intelligence Hub').first().waitFor({ timeout: 5000 });
    await page.locator('text=Engagement Heatmap').first().waitFor({ timeout: 5000 });
  });
});
