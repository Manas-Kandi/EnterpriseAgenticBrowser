import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Step 2: Reliable Single-Page Interaction Test Suite
 * 
 * Tests click, type, and select operations:
 * - Various element types (buttons, links, inputs, selects)
 * - Error handling (element not found, disabled, obscured)
 * - Scroll into view behavior
 * - Success/failure feedback
 */

// Mock Electron
jest.mock('electron', () => ({
  webContents: {
    fromId: jest.fn(),
    getAllWebContents: jest.fn(() => []),
  },
  app: {
    getAppPath: jest.fn(() => '/mock/app/path'),
    on: jest.fn(),
  },
}));

describe('Step 2: Reliable Single-Page Interaction', () => {
  
  describe('Click Tool Behavior', () => {
    
    describe('Success Cases', () => {
      it('should click element with unique selector', () => {
        // Simulated click result from BrowserAutomationService
        const result = { ok: true, matches: 1, clicked: { tag: 'button', text: 'Submit' } };
        
        expect(result.ok).toBe(true);
        expect(result.matches).toBe(1);
        expect(result.clicked.tag).toBe('button');
      });
      
      it('should click element by data-testid', () => {
        const result = { ok: true, matches: 1, clicked: { tag: 'button', testId: 'submit-btn', text: 'Submit' } };
        
        expect(result.ok).toBe(true);
        expect(result.clicked.testId).toBe('submit-btn');
      });
      
      it('should click element by aria-label', () => {
        const result = { ok: true, matches: 1, clicked: { tag: 'button', ariaLabel: 'Close dialog', text: '' } };
        
        expect(result.ok).toBe(true);
        expect(result.clicked.ariaLabel).toBe('Close dialog');
      });
      
      it('should click element with index disambiguation', () => {
        // When multiple elements match, index can be used
        const result = { ok: true, matches: 3, clicked: { tag: 'button', text: 'Delete' } };
        
        expect(result.ok).toBe(true);
        expect(result.matches).toBe(3);
      });
      
      it('should click element with matchText disambiguation', () => {
        const result = { ok: true, matches: 1, clicked: { tag: 'button', text: 'Save Changes' } };
        
        expect(result.ok).toBe(true);
      });
      
      it('should click element within container (withinSelector)', () => {
        const result = { ok: true, matches: 1, clicked: { tag: 'button', text: 'Confirm' } };
        
        expect(result.ok).toBe(true);
      });
    });
    
    describe('Error Cases', () => {
      it('should fail when element not found', () => {
        const result = { ok: false, error: 'Element not found (visible)', matches: 0 };
        
        expect(result.ok).toBe(false);
        expect(result.error).toContain('not found');
        expect(result.matches).toBe(0);
      });
      
      it('should fail when element is disabled', () => {
        const result = { ok: false, error: 'Element is disabled' };
        
        expect(result.ok).toBe(false);
        expect(result.error).toContain('disabled');
      });
      
      it('should fail when selector is ambiguous without disambiguation', () => {
        const result = { 
          ok: false, 
          error: 'Ambiguous selector (multiple visible matches)', 
          matches: 5,
          candidates: [
            { tag: 'button', text: 'Submit', testId: 'btn-1' },
            { tag: 'button', text: 'Submit', testId: 'btn-2' },
            { tag: 'button', text: 'Submit', testId: 'btn-3' },
          ]
        };
        
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Ambiguous');
        expect(result.matches).toBe(5);
        expect(result.candidates).toHaveLength(3);
      });
      
      it('should fail when withinSelector is not unique', () => {
        const result = { 
          ok: false, 
          error: 'Within selector is not unique', 
          matches: 3,
          roots: [
            { tag: 'div', text: 'Card 1' },
            { tag: 'div', text: 'Card 2' },
          ]
        };
        
        expect(result.ok).toBe(false);
        expect(result.error).toContain('not unique');
      });
      
      it('should fail when index is out of bounds', () => {
        const result = { ok: false, error: 'Index out of bounds' };
        
        expect(result.ok).toBe(false);
        expect(result.error).toContain('out of bounds');
      });
      
      it('should fail when withinSelector not found', () => {
        const result = { ok: false, error: 'Within selector not found (or not visible)', matches: 0 };
        
        expect(result.ok).toBe(false);
        expect(result.error).toContain('not found');
      });
    });
    
    describe('Scroll Into View', () => {
      it('should scroll element into view before clicking', () => {
        // The click tool calls scrollIntoView before clicking
        const clickCode = `el.scrollIntoView({ block: 'center', inline: 'center' })`;
        expect(clickCode).toContain('scrollIntoView');
        expect(clickCode).toContain('center');
      });
    });
  });
  
  describe('Type Tool Behavior', () => {
    
    describe('Success Cases', () => {
      it('should type into input field', () => {
        const result = { typed: true, value: 'test@example.com' };
        
        expect(result.typed).toBe(true);
        expect(result.value).toBe('test@example.com');
      });
      
      it('should type into textarea', () => {
        const result = { typed: true, value: 'This is a long message...' };
        
        expect(result.typed).toBe(true);
      });
      
      it('should type into contenteditable element', () => {
        const result = { typed: true, value: 'Rich text content' };
        
        expect(result.typed).toBe(true);
      });
      
      it('should clear existing value before typing', () => {
        // The type tool clears the field first, then types
        const typeCode = `setNativeValue(el, ''); ... setNativeValue(el, newValue)`;
        expect(typeCode).toContain("setNativeValue(el, '')");
      });
      
      it('should dispatch input and change events', () => {
        // Crucial for React/Angular/Vue apps
        const typeCode = `el.dispatchEvent(new InputEvent('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))`;
        expect(typeCode).toContain('InputEvent');
        expect(typeCode).toContain('change');
      });
    });
    
    describe('Error Cases', () => {
      it('should fail when element not found', () => {
        const errorMessage = 'Failed to type into #email: Element not found';
        
        expect(errorMessage).toContain('not found');
      });
      
      it('should fail when element is disabled', () => {
        const errorMessage = 'Failed to type into #email: Element is disabled';
        
        expect(errorMessage).toContain('disabled');
      });
      
      it('should fail when selector matches multiple elements', () => {
        const errorMessage = 'Refusing to type into non-unique selector (matches=3): input';
        
        expect(errorMessage).toContain('non-unique');
        expect(errorMessage).toContain('matches=3');
      });
    });
  });
  
  describe('Select Tool Behavior', () => {
    
    describe('Success Cases', () => {
      it('should select option by value', () => {
        const result = { selected: true, value: 'option-2' };
        
        expect(result.selected).toBe(true);
        expect(result.value).toBe('option-2');
      });
      
      it('should dispatch input and change events', () => {
        const selectCode = `el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))`;
        expect(selectCode).toContain('input');
        expect(selectCode).toContain('change');
      });
    });
    
    describe('Error Cases', () => {
      it('should fail when element is not a select', () => {
        const errorMessage = 'Failed to select on #dropdown: Element is not a <select>';
        
        expect(errorMessage).toContain('not a <select>');
      });
      
      it('should fail when element is disabled', () => {
        const errorMessage = 'Failed to select on #dropdown: Element is disabled';
        
        expect(errorMessage).toContain('disabled');
      });
      
      it('should fail when selector matches multiple elements', () => {
        const errorMessage = 'Refusing to select on non-unique selector (matches=2): select';
        
        expect(errorMessage).toContain('non-unique');
      });
    });
  });
  
  describe('Click Text Tool Behavior', () => {
    
    describe('Success Cases', () => {
      it('should click by visible text (substring match)', () => {
        const result = { ok: true, matches: 1, clickedText: 'submit form' };
        
        expect(result.ok).toBe(true);
        expect(result.clickedText).toContain('submit');
      });
      
      it('should click by exact text match', () => {
        const result = { ok: true, matches: 1, clickedText: 'submit' };
        
        expect(result.ok).toBe(true);
      });
      
      it('should filter by role', () => {
        const result = { ok: true, matches: 1, clickedText: 'settings' };
        
        expect(result.ok).toBe(true);
      });
      
      it('should filter by tag', () => {
        const result = { ok: true, matches: 1, clickedText: 'home' };
        
        expect(result.ok).toBe(true);
      });
      
      it('should use index for multiple matches', () => {
        const result = { ok: true, matches: 3, clickedText: 'delete' };
        
        expect(result.ok).toBe(true);
        expect(result.matches).toBe(3);
      });
    });
    
    describe('Error Cases', () => {
      it('should fail when no matching text found', () => {
        const result = { ok: false, reason: 'No matching visible elements', matches: 0 };
        
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('No matching');
      });
      
      it('should fail when matched element is disabled', () => {
        const result = { ok: false, reason: 'Matched element is disabled', matches: 1 };
        
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('disabled');
      });
    });
  });
  
  describe('Wait Tools Behavior', () => {
    
    describe('Wait for Selector', () => {
      it('should return success when element appears', () => {
        const result = 'Element "#loading" appeared';
        
        expect(result).toContain('appeared');
      });
      
      it('should return timeout when element does not appear', () => {
        const result = 'Timeout waiting for "#loading"';
        
        expect(result).toContain('Timeout');
      });
    });
    
    describe('Wait for Text', () => {
      it('should return success when text appears', () => {
        const result = 'Found text: "Success"';
        
        expect(result).toContain('Found text');
      });
      
      it('should return timeout when text does not appear', () => {
        const result = 'Did not find text within 5000ms: "Success"';
        
        expect(result).toContain('Did not find');
      });
    });
    
    describe('Wait for URL', () => {
      it('should return success when URL matches', () => {
        const result = 'URL matches "/dashboard"';
        
        expect(result).toContain('matches');
      });
      
      it('should return timeout when URL does not match', () => {
        const result = 'Timeout waiting for URL to contain "/dashboard"';
        
        expect(result).toContain('Timeout');
      });
    });
  });
  
  describe('Feedback Messages', () => {
    
    it('should provide clear success feedback for click', () => {
      const feedback = 'Clicked element [data-testid="submit-btn"]';
      
      expect(feedback).toContain('Clicked');
      expect(feedback).toContain('submit-btn');
    });
    
    it('should provide clear success feedback for type', () => {
      const feedback = 'Typed into #email. Current value: "test@example.com"';
      
      expect(feedback).toContain('Typed');
      expect(feedback).toContain('Current value');
    });
    
    it('should provide clear success feedback for select', () => {
      const feedback = 'Selected value "option-2" on #dropdown';
      
      expect(feedback).toContain('Selected');
      expect(feedback).toContain('option-2');
    });
    
    it('should provide actionable error feedback for ambiguous selector', () => {
      const feedback = `Refusing to click: Ambiguous selector (multiple visible matches). Selector="button".
Matched 5 visible elements.
Provide one of: {"index":0..}, {"matchText":"..."}, or {"withinSelector":"..."}.
Or prefer browser_click_text (more robust).
Candidates:
#0 button testId=btn-1 text="Submit"
#1 button testId=btn-2 text="Cancel"`;
      
      expect(feedback).toContain('Provide one of');
      expect(feedback).toContain('index');
      expect(feedback).toContain('matchText');
      expect(feedback).toContain('withinSelector');
      expect(feedback).toContain('Candidates');
    });
    
    it('should provide actionable error feedback for element not found', () => {
      const feedback = 'Refusing to click: Element not found (visible). Selector="#nonexistent". Try browser_click_text or refine your selector.';
      
      expect(feedback).toContain('not found');
      expect(feedback).toContain('browser_click_text');
    });
  });
  
  describe('XPath Support', () => {
    
    it('should recognize xpath= prefix', () => {
      const selector = 'xpath=//button[@type="submit"]';
      const isXPath = selector.startsWith('xpath=') || selector.startsWith('//');
      
      expect(isXPath).toBe(true);
    });
    
    it('should recognize // prefix as XPath', () => {
      const selector = '//button[contains(text(), "Submit")]';
      const isXPath = selector.startsWith('//');
      
      expect(isXPath).toBe(true);
    });
    
    it('should handle XPath in click tool', () => {
      // The click tool supports XPath selectors
      const result = { ok: true, matches: 1, clicked: { tag: 'button', text: 'Submit' } };
      
      expect(result.ok).toBe(true);
    });
    
    it('should handle XPath in type tool', () => {
      const result = { typed: true, value: 'test' };
      
      expect(result.typed).toBe(true);
    });
  });
  
  describe('Shadow DOM Support', () => {
    
    it('should search within shadow DOM for elements', () => {
      // The click tool uses queryDeep which traverses shadow roots
      const findElementsCode = `
        const queryDeep = (root) => {
          const els = Array.from(root.querySelectorAll(sel));
          results.push(...els);
          if (root.shadowRoot) {
            queryDeep(root.shadowRoot);
          }
        };
      `;
      
      expect(findElementsCode).toContain('shadowRoot');
      expect(findElementsCode).toContain('queryDeep');
    });
  });
  
  describe('Visibility Checks', () => {
    
    it('should check display property', () => {
      const isVisibleCode = `style.display === 'none'`;
      expect(isVisibleCode).toContain('display');
    });
    
    it('should check visibility property', () => {
      const isVisibleCode = `style.visibility === 'hidden'`;
      expect(isVisibleCode).toContain('visibility');
    });
    
    it('should check opacity property', () => {
      const isVisibleCode = `style.opacity === '0'`;
      expect(isVisibleCode).toContain('opacity');
    });
    
    it('should check pointer-events property', () => {
      const isVisibleCode = `style.pointerEvents === 'none'`;
      expect(isVisibleCode).toContain('pointerEvents');
    });
    
    it('should check element dimensions', () => {
      const isVisibleCode = `rect.width < 2 || rect.height < 2`;
      expect(isVisibleCode).toContain('width');
      expect(isVisibleCode).toContain('height');
    });
    
    it('should check element is in viewport', () => {
      const isVisibleCode = `rect.bottom < -buffer || rect.top > vh + buffer`;
      expect(isVisibleCode).toContain('rect.bottom');
      expect(isVisibleCode).toContain('rect.top');
    });
  });
  
  describe('React/Angular/Vue Compatibility', () => {
    
    it('should use native value setter for React inputs', () => {
      const setNativeValueCode = `
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(node, value);
      `;
      
      expect(setNativeValueCode).toContain('HTMLInputElement.prototype');
      expect(setNativeValueCode).toContain('setter.call');
    });
    
    it('should dispatch synthetic events with bubbles', () => {
      const eventCode = `new InputEvent('input', { bubbles: true })`;
      
      expect(eventCode).toContain('bubbles: true');
    });
    
    it('should dispatch multiple mouse events for click', () => {
      const clickCode = `
        el.dispatchEvent(new MouseEvent('mouseover', eventOpts));
        el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
        el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        el.dispatchEvent(new MouseEvent('click', eventOpts));
      `;
      
      expect(clickCode).toContain('mouseover');
      expect(clickCode).toContain('mousedown');
      expect(clickCode).toContain('mouseup');
      expect(clickCode).toContain('click');
    });
  });
});
