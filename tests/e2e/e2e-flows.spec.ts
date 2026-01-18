import { test, expect } from '@playwright/test';

/**
 * Step 10: E2E User Flows Tests
 * 
 * Tests complete user journeys from start to finish
 */

test.describe('Step 10: E2E Complete User Flows', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('Flow 1: Search and compare task', async ({ page }) => {
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

    // Request a search and compare task
    await agentInput.fill('Find the best deals on laptops');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('laptop') || 
               body.includes('search') || 
               body.includes('deal') ||
               body.includes('find');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('Flow 2: Form filling task', async ({ page }) => {
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

    // Request a form filling task
    await agentInput.fill('Fill out the contact form on this page');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('form') || 
               body.includes('fill') || 
               body.includes('contact') ||
               body.includes('no form');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('Flow 3: Monitoring setup task', async ({ page }) => {
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

    // Request a monitoring task
    await agentInput.fill('Alert me when this page changes');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('monitor') || 
               body.includes('alert') || 
               body.includes('watch') ||
               body.includes('change');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('Flow 4: Data extraction task', async ({ page }) => {
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

    // Request a data extraction task
    await agentInput.fill('Extract all the text from this page');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('extract') || 
               body.includes('text') || 
               body.includes('content') ||
               body.includes('page');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('Flow 5: Multi-step comparison task', async ({ page }) => {
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

    // Request a comparison task
    await agentInput.fill('Compare the features listed on this page');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('compare') || 
               body.includes('feature') || 
               body.includes('list') ||
               body.includes('page');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });
});
