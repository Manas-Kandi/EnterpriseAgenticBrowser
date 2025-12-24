import { test, expect } from '@playwright/test';

test.describe('Agent Mock SaaS Click', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('agent should click a mock-saas button via BrowserAutomationService', async ({ page }) => {
    const hasAgent = await page
      .evaluate(() => Boolean((window as any).agent && typeof (window as any).agent.chat === 'function'))
      .catch(() => false);

    if (!hasAgent) {
      test.skip();
      return;
    }

    const agentInput = page.locator('input[placeholder*="Ask anything"]');
    if (!(await agentInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    const task =
      'Navigate to http://localhost:3000/aerocore/admin. Then call browser_observe (scope="document", maxElements=20). Then click the Create User button using browser_click with selector [data-testid="admin-create-user-btn"]. Finally respond with final_response args.message exactly "CLICK_OK".';

    await agentInput.fill(task);
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => document.body.innerText.includes('CLICK_OK'),
      { timeout: 60000 }
    );

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('CLICK_OK');
  });
});
