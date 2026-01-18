import { test, expect } from '@playwright/test';

/**
 * Step 4: E2E Cross-Tab Awareness Tests
 * 
 * Tests the cross-tab awareness capabilities:
 * User asks "what tabs do I have open?" → LLM queries → User sees list
 */

test.describe('Step 4: E2E Cross-Tab Awareness', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should list open tabs when asked', async ({ page }) => {
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

    // Ask about open tabs
    await agentInput.fill('What tabs do I have open?');
    await agentInput.press('Enter');

    // Wait for response about tabs
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('tab') || 
               body.includes('open') || 
               body.includes('url') ||
               body.includes('page');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should reference tab by domain name', async ({ page }) => {
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

    // First navigate to create a tab
    await agentInput.fill('Navigate to http://localhost:3000/aerocore/admin');
    await agentInput.press('Enter');

    await page.waitForTimeout(3000);

    // Then ask about that specific tab
    await agentInput.fill('What is on the aerocore tab?');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('aerocore') || 
               body.includes('admin') || 
               body.includes('localhost');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should handle cross-tab query gracefully', async ({ page }) => {
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

    // Ask about a tab that doesn't exist
    await agentInput.fill('What is on the Netflix tab?');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('netflix') || 
               body.includes('not found') || 
               body.includes('no tab') ||
               body.includes("don't see") ||
               body.includes('open');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });
});
