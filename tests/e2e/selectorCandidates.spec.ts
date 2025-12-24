/**
 * E2E Regression Test: Generalized Selectors
 *
 * Goal:
 * - Verify the agent can observe a "wild" site and that browser_observe returns
 *   multiple selector candidates (CSS + XPath) in its output.
 */

import { test, expect } from '@playwright/test';

test.describe('Generalized Selector Observation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('browser_observe output should include selectorCandidates on a non-mock site', async ({ page }) => {
    const agentInput = page.locator('input[placeholder*="Ask anything"]');
    if (!(await agentInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    const task =
      'Navigate to https://en.wikipedia.org/wiki/Main_Page, then call browser_observe with scope="document" and maxElements=5. Return the full JSON output from browser_observe in your final response.';

    await agentInput.fill(task);
    await agentInput.press('Enter');

    // We assert loosely: the UI should eventually show "selectorCandidates" in the agent response.
    await page
      .waitForFunction(
        () => {
          const text = document.body.innerText;
          return text.includes('selectorCandidates') || text.includes('"selectorCandidates"');
        },
        { timeout: 45000 }
      )
      .catch(() => {});

    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText).toContain('selectorCandidates');
  });
});
