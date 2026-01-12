/**
 * E2E Tests for Selector Robustness
 * 
 * These tests verify that the semantic selector engine works correctly
 * in real browser contexts with various element types and attributes.
 */

import { test, expect, Page } from '@playwright/test';

// Test HTML fixtures with various selector scenarios
const TEST_HTML_SEMANTIC = `
<!DOCTYPE html>
<html>
<head>
  <title>Selector Robustness Test - Semantic Elements</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .btn { padding: 10px 20px; margin: 5px; cursor: pointer; }
    .btn-primary { background: blue; color: white; }
    .form-group { margin: 15px 0; }
    input { padding: 8px; margin: 5px 0; display: block; width: 200px; }
  </style>
</head>
<body>
  <h1>Semantic Selector Test Page</h1>
  
  <!-- Test: ID selector -->
  <button id="unique-submit-btn" class="btn btn-primary">Submit with ID</button>
  
  <!-- Test: data-testid selector -->
  <button data-testid="login-button" class="btn">Login (testid)</button>
  
  <!-- Test: aria-label selector -->
  <button aria-label="Close dialog" class="btn">X</button>
  
  <!-- Test: role + aria-label combination -->
  <div role="button" aria-label="Custom action" class="btn" tabindex="0">Custom Button</div>
  
  <!-- Test: name attribute (form) -->
  <div class="form-group">
    <label for="email-input">Email:</label>
    <input type="email" name="user_email" id="email-input" placeholder="Enter your email">
  </div>
  
  <!-- Test: placeholder selector -->
  <div class="form-group">
    <input type="text" placeholder="Search products..." class="search-input">
  </div>
  
  <!-- Test: href selector (link) -->
  <a href="/dashboard/settings" class="nav-link">Settings</a>
  
  <!-- Test: title attribute -->
  <button title="Save your changes" class="btn">Save</button>
  
  <!-- Test: Multiple similar buttons (disambiguation) -->
  <div id="action-toolbar">
    <button class="btn action-btn">Edit</button>
    <button class="btn action-btn">Delete</button>
    <button class="btn action-btn">Archive</button>
  </div>
  
  <!-- Test: Nested elements with parent context -->
  <div data-testid="user-card">
    <span class="user-name">John Doe</span>
    <button class="btn">View Profile</button>
  </div>
  
  <div data-testid="admin-card">
    <span class="user-name">Admin User</span>
    <button class="btn">View Profile</button>
  </div>
</body>
</html>
`;

const TEST_HTML_DYNAMIC_CLASSES = `
<!DOCTYPE html>
<html>
<head>
  <title>Selector Robustness Test - Dynamic Classes</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
  </style>
</head>
<body>
  <h1>Dynamic Class Test Page</h1>
  
  <!-- Test: CSS-in-JS style classes (should be filtered) -->
  <button class="css-1abc2de css-xyz789 emotion-button" data-testid="styled-button">
    Styled Button
  </button>
  
  <!-- Test: styled-components classes -->
  <button class="sc-bdVaJa sc-bwzfXH" aria-label="Styled component button">
    SC Button
  </button>
  
  <!-- Test: CSS Modules classes -->
  <button class="styles_button__3xK2d styles_primary__abc12">
    CSS Modules Button
  </button>
  
  <!-- Test: Mix of stable and dynamic classes -->
  <button class="btn primary css-random123 _hash456">
    Mixed Classes Button
  </button>
  
  <!-- Test: Only dynamic classes (should fallback to other strategies) -->
  <button class="css-only123 sc-only456" aria-label="Fallback test">
    Fallback Button
  </button>
</body>
</html>
`;

const TEST_HTML_ARIA_ROLES = `
<!DOCTYPE html>
<html>
<head>
  <title>Selector Robustness Test - ARIA Roles</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    [role="tab"] { padding: 10px; cursor: pointer; border: 1px solid #ccc; }
    [role="tab"][aria-selected="true"] { background: #007bff; color: white; }
    [role="tabpanel"] { padding: 20px; border: 1px solid #ccc; margin-top: -1px; }
    [role="menuitem"] { padding: 8px 16px; cursor: pointer; }
    [role="menuitem"]:hover { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>ARIA Roles Test Page</h1>
  
  <!-- Test: Tab list with roles -->
  <div role="tablist" aria-label="Main tabs">
    <button role="tab" aria-selected="true" aria-controls="panel1">Tab 1</button>
    <button role="tab" aria-selected="false" aria-controls="panel2">Tab 2</button>
    <button role="tab" aria-selected="false" aria-controls="panel3">Tab 3</button>
  </div>
  
  <div role="tabpanel" id="panel1" aria-labelledby="tab1">
    Content for Tab 1
  </div>
  
  <!-- Test: Menu with roles -->
  <nav role="menu" aria-label="Main menu">
    <a role="menuitem" href="/home">Home</a>
    <a role="menuitem" href="/products">Products</a>
    <a role="menuitem" href="/about">About</a>
    <a role="menuitem" href="/contact">Contact</a>
  </nav>
  
  <!-- Test: Checkbox role -->
  <div role="checkbox" aria-checked="false" aria-label="Accept terms" tabindex="0">
    I accept the terms
  </div>
  
  <!-- Test: Switch role -->
  <div role="switch" aria-checked="true" aria-label="Enable notifications" tabindex="0">
    Notifications: ON
  </div>
  
  <!-- Test: Combobox -->
  <div role="combobox" aria-expanded="false" aria-label="Select country">
    <input type="text" placeholder="Select a country...">
  </div>
</body>
</html>
`;

const TEST_HTML_COMPLEX_FORMS = `
<!DOCTYPE html>
<html>
<head>
  <title>Selector Robustness Test - Complex Forms</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .form-row { display: flex; gap: 20px; margin: 15px 0; }
    .form-group { flex: 1; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input, select, textarea { width: 100%; padding: 8px; box-sizing: border-box; }
  </style>
</head>
<body>
  <h1>Complex Form Test Page</h1>
  
  <form id="registration-form" data-testid="registration-form">
    <div class="form-row">
      <div class="form-group">
        <label for="first-name">First Name</label>
        <input type="text" id="first-name" name="firstName" placeholder="Enter first name" required>
      </div>
      <div class="form-group">
        <label for="last-name">Last Name</label>
        <input type="text" id="last-name" name="lastName" placeholder="Enter last name" required>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" aria-describedby="email-help" required>
        <small id="email-help">We'll never share your email.</small>
      </div>
      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone" placeholder="+1 (555) 000-0000">
      </div>
    </div>
    
    <div class="form-group">
      <label for="country">Country</label>
      <select id="country" name="country" aria-label="Select your country">
        <option value="">Select a country...</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="bio">Bio</label>
      <textarea id="bio" name="bio" placeholder="Tell us about yourself..." rows="4"></textarea>
    </div>
    
    <div class="form-group">
      <label>
        <input type="checkbox" name="terms" required> I agree to the terms and conditions
      </label>
    </div>
    
    <div class="form-group">
      <button type="submit" id="submit-btn" data-testid="submit-registration">
        Register
      </button>
      <button type="reset" aria-label="Clear form">
        Reset
      </button>
    </div>
  </form>
</body>
</html>
`;

// Helper to create a page with test HTML
async function setupTestPage(page: Page, html: string): Promise<void> {
  await page.setContent(html);
  await page.waitForLoadState('domcontentloaded');
}

// ============================================================================
// Semantic Element Tests
// ============================================================================

test.describe('Semantic Element Selectors', () => {
  test('should find element by ID', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('#unique-submit-btn');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Submit with ID');
  });

  test('should find element by data-testid', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('[data-testid=login-button]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Login (testid)');
  });

  test('should find element by aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('button[aria-label="Close dialog"]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('X');
  });

  test('should find element by role + aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('[role=button][aria-label="Custom action"]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Custom Button');
  });

  test('should find input by name attribute', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const input = page.locator('input[name=user_email]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'email');
  });

  test('should find input by placeholder', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const input = page.locator('input[placeholder="Search products..."]');
    await expect(input).toBeVisible();
  });

  test('should find link by href', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const link = page.locator('a[href="/dashboard/settings"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Settings');
  });

  test('should find element by title attribute', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('button[title="Save your changes"]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Save');
  });

  test('should disambiguate similar elements using parent context', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    // Both cards have "View Profile" buttons, use parent testid to disambiguate
    const userCardButton = page.locator('[data-testid=user-card] button');
    const adminCardButton = page.locator('[data-testid=admin-card] button');
    
    await expect(userCardButton).toBeVisible();
    await expect(adminCardButton).toBeVisible();
    
    // Verify they are different elements
    const userCardParent = await userCardButton.evaluate(el => 
      el.closest('[data-testid]')?.getAttribute('data-testid')
    );
    const adminCardParent = await adminCardButton.evaluate(el => 
      el.closest('[data-testid]')?.getAttribute('data-testid')
    );
    
    expect(userCardParent).toBe('user-card');
    expect(adminCardParent).toBe('admin-card');
  });
});

// ============================================================================
// Dynamic Class Handling Tests
// ============================================================================

test.describe('Dynamic Class Handling', () => {
  test('should prefer data-testid over dynamic classes', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_DYNAMIC_CLASSES);
    
    // Element has CSS-in-JS classes but also data-testid
    const button = page.locator('[data-testid=styled-button]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Styled Button');
  });

  test('should prefer aria-label over dynamic classes', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_DYNAMIC_CLASSES);
    
    // Element has styled-components classes but also aria-label
    const button = page.locator('button[aria-label="Styled component button"]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('SC Button');
  });

  test('should use stable classes when available', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_DYNAMIC_CLASSES);
    
    // Element has mix of stable (btn, primary) and dynamic classes
    const button = page.locator('button.btn.primary');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Mixed Classes Button');
  });

  test('should fallback to aria-label when only dynamic classes exist', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_DYNAMIC_CLASSES);
    
    // Element has only dynamic classes, should use aria-label
    const button = page.locator('button[aria-label="Fallback test"]');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Fallback Button');
  });
});

// ============================================================================
// ARIA Role Tests
// ============================================================================

test.describe('ARIA Role Selectors', () => {
  test('should find tabs by role', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const tabs = page.locator('[role=tab]');
    await expect(tabs).toHaveCount(3);
  });

  test('should find selected tab by role + aria-selected', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const selectedTab = page.locator('[role=tab][aria-selected=true]');
    await expect(selectedTab).toBeVisible();
    await expect(selectedTab).toHaveText('Tab 1');
  });

  test('should find menu items by role', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const menuItems = page.locator('[role=menuitem]');
    await expect(menuItems).toHaveCount(4);
  });

  test('should find specific menu item by role + href', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const productsLink = page.locator('[role=menuitem][href="/products"]');
    await expect(productsLink).toBeVisible();
    await expect(productsLink).toHaveText('Products');
  });

  test('should find checkbox by role + aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const checkbox = page.locator('[role=checkbox][aria-label="Accept terms"]');
    await expect(checkbox).toBeVisible();
  });

  test('should find switch by role + aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const switchEl = page.locator('[role=switch][aria-label="Enable notifications"]');
    await expect(switchEl).toBeVisible();
    await expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  test('should find combobox by role', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const combobox = page.locator('[role=combobox]');
    await expect(combobox).toBeVisible();
  });
});

// ============================================================================
// Complex Form Tests
// ============================================================================

test.describe('Complex Form Selectors', () => {
  test('should find form by data-testid', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    const form = page.locator('[data-testid=registration-form]');
    await expect(form).toBeVisible();
  });

  test('should find inputs by name attribute', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    const firstName = page.locator('input[name=firstName]');
    const lastName = page.locator('input[name=lastName]');
    const email = page.locator('input[name=email]');
    
    await expect(firstName).toBeVisible();
    await expect(lastName).toBeVisible();
    await expect(email).toBeVisible();
  });

  test('should find inputs by placeholder', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    const emailInput = page.locator('input[placeholder="you@example.com"]');
    await expect(emailInput).toBeVisible();
  });

  test('should find select by aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    const select = page.locator('select[aria-label="Select your country"]');
    await expect(select).toBeVisible();
  });

  test('should find textarea by name', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    const textarea = page.locator('textarea[name=bio]');
    await expect(textarea).toBeVisible();
  });

  test('should find submit button by data-testid', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    const submitBtn = page.locator('[data-testid=submit-registration]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText('Register');
  });

  test('should find reset button by aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    const resetBtn = page.locator('button[aria-label="Clear form"]');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toHaveText('Reset');
  });

  test('should interact with form using semantic selectors', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_COMPLEX_FORMS);
    
    // Fill form using various selector strategies
    await page.locator('input[name=firstName]').fill('John');
    await page.locator('input[name=lastName]').fill('Doe');
    await page.locator('input[placeholder="you@example.com"]').fill('john@example.com');
    await page.locator('select[aria-label="Select your country"]').selectOption('us');
    await page.locator('textarea[name=bio]').fill('Test bio');
    await page.locator('input[name=terms]').check();
    
    // Verify values
    await expect(page.locator('input[name=firstName]')).toHaveValue('John');
    await expect(page.locator('input[name=lastName]')).toHaveValue('Doe');
    await expect(page.locator('input[name=email]')).toHaveValue('john@example.com');
    await expect(page.locator('select[name=country]')).toHaveValue('us');
    await expect(page.locator('textarea[name=bio]')).toHaveValue('Test bio');
    await expect(page.locator('input[name=terms]')).toBeChecked();
  });
});

// ============================================================================
// XPath Selector Tests
// ============================================================================

test.describe('XPath Selectors', () => {
  test('should find element by XPath with ID', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('xpath=//*[@id="unique-submit-btn"]');
    await expect(button).toBeVisible();
  });

  test('should find element by XPath with data-testid', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('xpath=//*[@data-testid="login-button"]');
    await expect(button).toBeVisible();
  });

  test('should find element by XPath with aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.locator('xpath=//button[@aria-label="Close dialog"]');
    await expect(button).toBeVisible();
  });

  test('should find element by XPath with text content', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const link = page.locator('xpath=//a[normalize-space(.)="Settings"]');
    await expect(link).toBeVisible();
  });

  test('should find element by XPath with role and aria-label', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const checkbox = page.locator('xpath=//*[@role="checkbox" and @aria-label="Accept terms"]');
    await expect(checkbox).toBeVisible();
  });

  test('should find element by XPath with parent context', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    // Find button within specific parent
    const button = page.locator('xpath=//*[@data-testid="user-card"]//button');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('View Profile');
  });

  test('should find nth element by XPath', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    // Find second action button in toolbar
    const secondButton = page.locator('xpath=//*[@id="action-toolbar"]//button[2]');
    await expect(secondButton).toBeVisible();
    await expect(secondButton).toHaveText('Delete');
  });
});

// ============================================================================
// Text-Based Selector Tests
// ============================================================================

test.describe('Text-Based Selectors', () => {
  test('should find button by exact text', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const button = page.getByRole('button', { name: 'Save' });
    await expect(button).toBeVisible();
  });

  test('should find link by text', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const link = page.getByRole('link', { name: 'Settings' });
    await expect(link).toBeVisible();
  });

  test('should find tab by text', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const tab = page.getByRole('tab', { name: 'Tab 2' });
    await expect(tab).toBeVisible();
  });

  test('should find menu item by text', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    const menuItem = page.getByRole('menuitem', { name: 'Products' });
    await expect(menuItem).toBeVisible();
  });
});

// ============================================================================
// Selector Uniqueness Tests
// ============================================================================

test.describe('Selector Uniqueness', () => {
  test('should verify ID selector is unique', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const count = await page.locator('#unique-submit-btn').count();
    expect(count).toBe(1);
  });

  test('should verify data-testid selector is unique', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    const count = await page.locator('[data-testid=login-button]').count();
    expect(count).toBe(1);
  });

  test('should detect non-unique class selector', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_SEMANTIC);
    
    // Multiple buttons have .btn class
    const count = await page.locator('button.btn').count();
    expect(count).toBeGreaterThan(1);
  });

  test('should detect non-unique role selector', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    // Multiple tabs have role=tab
    const count = await page.locator('[role=tab]').count();
    expect(count).toBeGreaterThan(1);
  });

  test('should make non-unique selector unique with additional attributes', async ({ page }) => {
    await setupTestPage(page, TEST_HTML_ARIA_ROLES);
    
    // role=tab is not unique, but role=tab + aria-selected=true is
    const count = await page.locator('[role=tab][aria-selected=true]').count();
    expect(count).toBe(1);
  });
});
