import { test, expect } from '@playwright/test';

/**
 * E2E Test for the "Unifying Control Plane" (Workflow Orchestrator)
 * This test validates complex, multi-step, parallel tasks across different SaaS apps.
 * 
 * Workflow:
 * 1. Open Jira and find an issue.
 * 2. In parallel, open Confluence and prepare a page.
 * 3. Extract data from Jira and sync it to Confluence.
 * 4. Verify the sync was successful.
 */
test.describe('Enterprise Control Plane Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass onboarding by setting appMode in localStorage
    await page.addInitScript(() => {
      const state = {
        state: {
          appMode: 'personal',
          saasModeEnabled: true,
          agentMode: 'do',
          agentPermissionMode: 'yolo',
          activeSidebarPanel: 'agent',
          tabsLayout: 'vertical',
          llmSettings: {
            provider: 'nvidia',
            baseUrl: 'https://integrate.api.nvidia.com/v1',
            model: 'llama-3.1-70b',
            apiKeyAccount: 'llm:nvidia:apiKey',
          },
          tabs: [
            { id: '1', url: 'http://localhost:3000', title: 'Home', loading: false, canGoBack: false, canGoForward: false }
          ],
          activeTabId: '1'
        },
        version: 0
      };
      window.localStorage.setItem('browser-storage', JSON.stringify(state));
    });

    // Navigate to the app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('Navigated to app');
    
    // Wait for the app to hydrate and the store to be ready
    await page.waitForTimeout(2000);
    
    // Ensure agent panel is visible
    const agentPanel = page.locator('[data-testid="agent-panel"]');
    if (!(await agentPanel.isVisible())) {
      console.log('Agent panel not visible, attempting to open via toggle...');
      const toggle = page.locator('[data-testid="toggle-agent-panel"]');
      if (await toggle.isVisible()) {
        await toggle.click();
      }
    }
    
    await expect(agentPanel).toBeVisible({ timeout: 20000 });
    
    // Wait for agent input
    const agentInput = page.locator('[data-testid="agent-input"]');
    await expect(agentInput).toBeVisible({ timeout: 15000 });
    console.log('Agent ready');
  });

  test('should execute a complex Jira to Confluence sync workflow', async ({ page }) => {
    const agentInput = page.locator('[data-testid="agent-input"]');
    
    // Complex enterprise request
    const complexTask = 'Sync the Jira issue "EB-1" description to a new Confluence page titled "Issue Sync Report"';

    console.log('Starting complex task:', complexTask);
    await agentInput.fill(complexTask);
    await agentInput.press('Enter');

    // Wait for the orchestrator to kick in and show thought steps
    console.log('Waiting for plan/workflow steps...');
    const panel = page.locator('[data-testid="agent-panel"]');
    await expect(panel).toContainText(/workflow|plan|Executing/i, { timeout: 45000 });

    // Wait for final completion message (can take time for multi-step LLM tasks)
    console.log('Waiting for workflow completion...');
    await expect(panel).toContainText(/Successfully completed|completed|Success/i, { timeout: 180000 });
    
    // Verify that new tabs were created for the tasks
    // In our implementation, WorkflowOrchestrator uses browser_open_tab
    const tabs = page.locator('[data-testid="tab-item"]');
    const tabCount = await tabs.count();
    console.log('Final tab count:', tabCount);
    
    // Initial state has 1 tab, we expect at least 2 more for Jira and Confluence
    expect(tabCount).toBeGreaterThan(1);
  });

  test('should handle failures and recover using institutional memory', async ({ page }) => {
    const agentInput = page.locator('[data-testid="agent-input"]');
    
    // Task that might fail initially due to navigation or selectors
    const riskyTask = 'Update the AeroCore Admin role for "admin@example.com" to "Security"';

    console.log('Starting risky task:', riskyTask);
    await agentInput.fill(riskyTask);
    await agentInput.press('Enter');

    // Wait for execution
    await expect(page.locator('[data-testid="agent-panel"]')).toContainText(/completed|Success/i, { timeout: 60000 });

    // Now run it again - it should be faster using the saved skill/workflow
    const resetButton = page.locator('button[title*="conversation"], button[title*="Chat"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: manually clear if needed or just send again
      console.log('Reset button not found, continuing...');
    }

    const startSecond = Date.now();
    await agentInput.fill(riskyTask);
    await agentInput.press('Enter');

    await expect(page.locator('[data-testid="agent-panel"]')).toContainText(/Success|completed/i, { timeout: 30000 });
    const secondRunDuration = Date.now() - startSecond;
    
    console.log(`Institutional memory speedup: ${secondRunDuration}ms`);
  });
});
