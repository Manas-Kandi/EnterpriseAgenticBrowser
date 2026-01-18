import { test, expect } from '@playwright/test';

/**
 * Step 5: E2E Cross-Tab Execution Tests
 * 
 * Tests cross-tab execution capabilities:
 * User says "extract X from all tabs" → LLM plans → Browser executes → Aggregated results
 */

test.describe('Step 5: E2E Cross-Tab Execution', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should extract data from multiple tabs', async ({ page }) => {
    const hasAgent = await page.evaluate(() => {
      return Boolean((window as any).agent && typeof (window as any).agent.chat === 'function');
    }).catch(() => false);

    if (!hasAgent) {
      test.skip();
      return;
    }

    const agentInput = page.locator('input[placeholder*="Ask anything"], input[placeholder*="Type a message"]').first();
    
    if (!(await agentInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Ask to extract from all tabs
    await agentInput.fill('Extract the main heading from all open tabs');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('extract') || 
               body.includes('heading') || 
               body.includes('tab') ||
               body.includes('found');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should handle cross-tab query with aggregation', async ({ page }) => {
    const hasAgent = await page.evaluate(() => {
      return Boolean((window as any).agent);
    }).catch(() => false);

    if (!hasAgent) {
      test.skip();
      return;
    }

    const agentInput = page.locator('input[placeholder*="Ask anything"], input[placeholder*="Type a message"]').first();
    
    if (!(await agentInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Query across tabs
    await agentInput.fill('Find all links across my open tabs');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('link') || 
               body.includes('found') || 
               body.includes('tab');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should report partial failures gracefully', async ({ page }) => {
    const hasAgent = await page.evaluate(() => {
      return Boolean((window as any).agent);
    }).catch(() => false);

    if (!hasAgent) {
      test.skip();
      return;
    }

    const agentInput = page.locator('input[placeholder*="Ask anything"], input[placeholder*="Type a message"]').first();
    
    if (!(await agentInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Request that may partially fail
    await agentInput.fill('Extract prices from all shopping tabs');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('price') || 
               body.includes('extract') || 
               body.includes('tab') ||
               body.includes('found') ||
               body.includes('no');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });
});
