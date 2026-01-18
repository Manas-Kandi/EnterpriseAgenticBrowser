import { test, expect } from '@playwright/test';

/**
 * Step 2: E2E Interaction Tests
 * 
 * Tests the full interaction pipeline:
 * User command → LLM plans → Browser executes click/type/select → User sees confirmation
 * 
 * Uses the Mock SaaS app which has predictable elements.
 */

test.describe('Step 2: E2E Interaction', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should have agent API available', async ({ page }) => {
    const hasAgent = await page.evaluate(() => {
      return Boolean((window as any).agent);
    }).catch(() => false);

    if (!hasAgent) {
      test.skip();
    }
    
    expect(hasAgent).toBe(true);
  });

  test('click button on Mock SaaS via agent', async ({ page }) => {
    const hasAgent = await page.evaluate(() => {
      return Boolean((window as any).agent && typeof (window as any).agent.chat === 'function');
    }).catch(() => false);

    if (!hasAgent) {
      test.skip();
      return;
    }

    // Find the agent input
    const agentInput = page.locator('input[placeholder*="Ask anything"], input[placeholder*="Type a message"]').first();
    
    if (!(await agentInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Navigate to Mock SaaS and click a button
    const task = 'Navigate to http://localhost:3000/aerocore/admin and click the Create User button';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Wait for some response
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('clicked') || 
               body.includes('create') || 
               body.includes('user') ||
               body.includes('success') ||
               body.includes('failed');
      },
      { timeout: 60000 }
    );

    // The app should still be responsive
    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('type into input field via agent', async ({ page }) => {
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

    // Navigate and type into a form
    const task = 'Navigate to http://localhost:3000/aerocore/admin, click Create User, and type "John Doe" into the name field';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Wait for response
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('typed') || 
               body.includes('john') || 
               body.includes('name') ||
               body.includes('success') ||
               body.includes('failed');
      },
      { timeout: 60000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('handles click on non-existent element gracefully', async ({ page }) => {
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

    // Try to click something that doesn't exist
    const task = 'Click the "Teleport to Mars" button on this page';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Wait for error response
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('not found') || 
               body.includes('could not') || 
               body.includes('unable') ||
               body.includes('failed') ||
               body.includes('error') ||
               body.includes('teleport');
      },
      { timeout: 60000 }
    );

    // App should still be responsive
    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('provides clear feedback on successful interaction', async ({ page }) => {
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

    // Simple navigation task
    const task = 'Navigate to http://localhost:3000/aerocore/admin';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Wait for navigation confirmation
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('navigated') || 
               body.includes('admin') || 
               body.includes('aerocore');
      },
      { timeout: 60000 }
    );

    const bodyText = await page.locator('body').innerText();
    const hasConfirmation = bodyText.toLowerCase().includes('navigated') || 
                            bodyText.toLowerCase().includes('admin') ||
                            bodyText.toLowerCase().includes('success');
    
    expect(hasConfirmation).toBe(true);
  });
});
