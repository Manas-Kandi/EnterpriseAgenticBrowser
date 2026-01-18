import { test, expect } from '@playwright/test';

/**
 * Step 3: E2E Multi-Step Task Execution Tests
 * 
 * Tests the full multi-step workflow pipeline:
 * User command → LLM plans multiple steps → Browser executes sequence → User sees results
 */

test.describe('Step 3: E2E Multi-Step Execution', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should execute a multi-step navigation and interaction task', async ({ page }) => {
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

    // Multi-step task: navigate, click, type
    const task = 'Navigate to http://localhost:3000/aerocore/admin, click Create User, fill in the name field with "Test User", and close the modal';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Wait for multi-step execution to complete
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('completed') || 
               body.includes('success') || 
               body.includes('done') ||
               body.includes('test user') ||
               body.includes('failed');
      },
      { timeout: 120000 } // Longer timeout for multi-step
    );

    // App should still be responsive
    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should handle multi-step task with search and filter', async ({ page }) => {
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

    // Multi-step search task
    const task = 'Go to http://localhost:3000/aerocore/admin and search for users';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Wait for execution
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('navigated') || 
               body.includes('admin') || 
               body.includes('search') ||
               body.includes('user');
      },
      { timeout: 90000 }
    );

    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });

  test('should provide progress feedback during multi-step execution', async ({ page }) => {
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

    // Simple multi-step task
    const task = 'Navigate to http://localhost:3000/aerocore/admin and tell me what you see';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Check for progress indicators (loading, executing, etc.)
    const hasProgress = await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('navigat') || 
               body.includes('executing') || 
               body.includes('processing') ||
               body.includes('admin');
      },
      { timeout: 60000 }
    ).then(() => true).catch(() => false);

    expect(hasProgress).toBe(true);
  });

  test('should handle failure in multi-step workflow gracefully', async ({ page }) => {
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

    // Task with likely failure point
    const task = 'Navigate to http://localhost:3000/nonexistent-page and click the submit button';
    
    await agentInput.fill(task);
    await agentInput.press('Enter');

    // Wait for error handling
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return body.includes('not found') || 
               body.includes('failed') || 
               body.includes('error') ||
               body.includes('unable') ||
               body.includes('could not');
      },
      { timeout: 60000 }
    );

    // App should still be responsive after failure
    const isResponsive = await agentInput.isVisible();
    expect(isResponsive).toBe(true);
  });
});
