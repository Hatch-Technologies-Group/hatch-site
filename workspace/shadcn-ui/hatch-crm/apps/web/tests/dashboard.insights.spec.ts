import { expect, test } from '@playwright/test';

const RUN_E2E = process.env.RUN_E2E_TESTS === 'true';

test.describe('Client Insights interactions', () => {
  test.skip(!RUN_E2E, 'Enable RUN_E2E_TESTS=true to execute insights smoke tests.');

  test('heatmap deep link surfaces the selected stage in pipeline view', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('trend-cards')).toBeVisible();

    const cell = page.locator('[data-testid^="heatmap-cell-"]').first();
    const stageLabel = ((await cell.locator('div').first().innerText()) ?? 'Stage').trim();
    await cell.click();

    await expect(page).toHaveURL(/\/people\?/);
    const url = new URL(page.url());
    expect(url.searchParams.has('stageId')).toBeTruthy();

    await expect(page.getByRole('heading', { name: new RegExp(stageLabel, 'i') })).toBeVisible();
  });

  test('Nurture quick action shows toast and JOURNEY_STARTED event', async ({ page }) => {
    await page.goto('/dashboard');

    const nurtureButton = page
      .getByTestId('reengage-row')
      .first()
      .getByRole('button', { name: /Start 7-day Nurture/i });
    await nurtureButton.click();

    await expect(page.getByText(/7-day nurture started/i)).toBeVisible();
    await expect(page.getByTestId('insights-feed')).toContainText('JOURNEY_STARTED');
  });
});
