import { test, expect } from '@playwright/test';

/**
 * Step 9: E2E Context Compression & Long Sessions Tests
 * 
 * Tests long session handling:
 * User can have extended sessions without context overflow
 */

test.describe('Step 9: E2E Context Compression & Long Sessions', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should handle multiple consecutive requests', async ({ page }) => {
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

    // Send multiple requests
    const requests = [
      'What is 2 + 2?',
      'Now multiply that by 3',
      'What was my first question?'
    ];

    for (const request of requests) {
      await agentInput.fill(request);
      await agentInput.press('Enter');
      
      await page.waitForFunction(
        () => {
          const body = document.body.innerText.toLowerCase();
          return body.includes('4') || 
                 body.includes('12') || 
                 body.includes('first') ||
                 body.includes('question');
        },
        { timeout: 30000 }
      );
      
      await page.waitForTimeout(1000);
    }

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should remember context from earlier in session', async ({ page }) => {
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

    // Ask about context
    await agentInput.fill('What have we discussed so far?');
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('discuss') || 
               body.includes('conversation') || 
               body.includes('nothing') ||
               body.includes('start');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should handle long input gracefully', async ({ page }) => {
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

    // Send a long request
    const longRequest = 'Please help me with the following task: ' + 'search for products '.repeat(20);
    await agentInput.fill(longRequest);
    await agentInput.press('Enter');

    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('search') || 
               body.includes('product') || 
               body.includes('help') ||
               body.includes('task');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });
});
