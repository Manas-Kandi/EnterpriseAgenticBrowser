/**
 * Comprehensive Unit Tests for SelectorEngine
 * 
 * Tests the semantic selector scoring and generation system
 * to ensure robust, accessibility-first selector generation.
 */

import {
  escapeXPath,
  formatAttrValue,
  isDynamicClass,
  isGenericTag,
  isSemanticAttribute,
  generateCSSSelectors,
  generateXPathSelectors,
  generateTextSelectors,
  generateAllSelectors,
  pickBestSelector,
  DEFAULT_SCORING_CONFIG,
  type ElementDescriptor,
  type SelectorCandidate,
  type SelectorKind,
} from '../../electron/lib/SelectorEngine';

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('SelectorEngine Utilities', () => {
  describe('escapeXPath', () => {
    it('should handle simple strings without quotes', () => {
      expect(escapeXPath('hello')).toBe("'hello'");
    });

    it('should handle strings with single quotes', () => {
      expect(escapeXPath("it's")).toBe('"it\'s"');
    });

    it('should handle strings with double quotes', () => {
      expect(escapeXPath('say "hello"')).toBe("'say \"hello\"'");
    });

    it('should handle strings with both quote types using concat', () => {
      const result = escapeXPath("it's a \"test\"");
      expect(result).toContain('concat(');
    });

    it('should handle empty strings', () => {
      expect(escapeXPath('')).toBe("''");
    });

    it('should handle null/undefined', () => {
      expect(escapeXPath(null as any)).toBe("''");
      expect(escapeXPath(undefined as any)).toBe("''");
    });
  });

  describe('formatAttrValue', () => {
    it('should return simple alphanumeric values without quotes', () => {
      expect(formatAttrValue('submit-btn')).toBe('submit-btn');
      expect(formatAttrValue('myId123')).toBe('myId123');
    });

    it('should quote values with special characters', () => {
      expect(formatAttrValue('hello world')).toBe("'hello world'");
      expect(formatAttrValue('value=test')).toBe("'value=test'");
    });

    it('should escape single quotes in values', () => {
      expect(formatAttrValue("it's")).toBe("'it\\'s'");
    });

    it('should handle empty strings', () => {
      expect(formatAttrValue('')).toBe("''");
    });
  });

  describe('isDynamicClass', () => {
    it('should detect CSS-in-JS generated classes', () => {
      expect(isDynamicClass('css-1abc2de')).toBe(true);
      expect(isDynamicClass('sc-bdVaJa')).toBe(true);
    });

    it('should detect CSS Modules classes', () => {
      expect(isDynamicClass('styles_button__3xK2d')).toBe(true);
      expect(isDynamicClass('style_container__abc123')).toBe(true);
    });

    it('should detect hash-like classes', () => {
      // These patterns match hex hashes and underscore-prefixed hashes
      expect(isDynamicClass('abcdef12')).toBe(true); // 8+ hex chars
      expect(isDynamicClass('_abcdef123456')).toBe(true); // underscore + 6+ chars
    });

    it('should detect long random strings', () => {
      expect(isDynamicClass('abcdefghijklmnopqrstuvwxyz')).toBe(true);
    });

    it('should NOT flag semantic class names', () => {
      expect(isDynamicClass('btn')).toBe(false);
      expect(isDynamicClass('button-primary')).toBe(false);
      expect(isDynamicClass('nav-item')).toBe(false);
      expect(isDynamicClass('form-control')).toBe(false);
      expect(isDynamicClass('container')).toBe(false);
    });

    it('should NOT flag BEM-style classes', () => {
      expect(isDynamicClass('block__element')).toBe(false);
      expect(isDynamicClass('block--modifier')).toBe(false);
      expect(isDynamicClass('header__nav-item')).toBe(false);
    });

    it('should NOT flag Tailwind-style classes', () => {
      expect(isDynamicClass('flex')).toBe(false);
      expect(isDynamicClass('p-4')).toBe(false);
      expect(isDynamicClass('text-lg')).toBe(false);
      expect(isDynamicClass('bg-blue-500')).toBe(false);
    });
  });

  describe('isGenericTag', () => {
    it('should identify generic tags', () => {
      expect(isGenericTag('div')).toBe(true);
      expect(isGenericTag('span')).toBe(true);
      expect(isGenericTag('section')).toBe(true);
      expect(isGenericTag('article')).toBe(true);
    });

    it('should NOT flag semantic tags', () => {
      expect(isGenericTag('button')).toBe(false);
      expect(isGenericTag('a')).toBe(false);
      expect(isGenericTag('input')).toBe(false);
      expect(isGenericTag('form')).toBe(false);
    });
  });

  describe('isSemanticAttribute', () => {
    it('should identify ARIA attributes', () => {
      expect(isSemanticAttribute('aria-label')).toBe(true);
      expect(isSemanticAttribute('aria-labelledby')).toBe(true);
      expect(isSemanticAttribute('aria-describedby')).toBe(true);
      expect(isSemanticAttribute('role')).toBe(true);
    });

    it('should identify testing attributes', () => {
      expect(isSemanticAttribute('data-testid')).toBe(true);
      expect(isSemanticAttribute('data-test-id')).toBe(true);
      expect(isSemanticAttribute('data-cy')).toBe(true);
    });

    it('should identify form attributes', () => {
      expect(isSemanticAttribute('name')).toBe(true);
      expect(isSemanticAttribute('placeholder')).toBe(true);
      expect(isSemanticAttribute('for')).toBe(true);
    });

    it('should NOT flag arbitrary attributes', () => {
      expect(isSemanticAttribute('class')).toBe(false);
      expect(isSemanticAttribute('style')).toBe(false);
      expect(isSemanticAttribute('data-random')).toBe(false);
    });
  });
});

// ============================================================================
// CSS Selector Generation Tests
// ============================================================================

describe('CSS Selector Generation', () => {
  describe('generateCSSSelectors', () => {
    it('should prioritize ID selectors', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        id: 'submit-btn',
        ariaLabel: 'Submit form',
        classes: ['btn', 'btn-primary'],
      };

      const candidates = generateCSSSelectors(el);
      const idCandidate = candidates.find(c => c.strategy === 'id');

      expect(idCandidate).toBeDefined();
      expect(idCandidate!.value).toBe('#submit-btn');
      expect(idCandidate!.score).toBe(DEFAULT_SCORING_CONFIG.weights.id);
      expect(idCandidate!.confidence).toBe('high');
    });

    it('should skip dynamic IDs', () => {
      const el: ElementDescriptor = {
        tag: 'div',
        id: 'css-1abc2de',
        ariaLabel: 'Container',
      };

      const candidates = generateCSSSelectors(el);
      const idCandidate = candidates.find(c => c.strategy === 'id');

      expect(idCandidate).toBeUndefined();
    });

    it('should generate data-testid selectors', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        testId: 'submit-button',
      };

      const candidates = generateCSSSelectors(el);
      const testIdCandidate = candidates.find(c => c.strategy === 'testId');

      expect(testIdCandidate).toBeDefined();
      expect(testIdCandidate!.value).toBe('[data-testid=submit-button]');
      expect(testIdCandidate!.score).toBe(DEFAULT_SCORING_CONFIG.weights.testId);
    });

    it('should generate aria-label selectors with semantic bonus', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        ariaLabel: 'Close dialog',
      };

      const candidates = generateCSSSelectors(el);
      const ariaCandidate = candidates.find(c => c.strategy === 'ariaLabel');

      expect(ariaCandidate).toBeDefined();
      expect(ariaCandidate!.value).toBe("button[aria-label='Close dialog']");
      expect(ariaCandidate!.score).toBe(
        DEFAULT_SCORING_CONFIG.weights.ariaLabel + DEFAULT_SCORING_CONFIG.bonuses.semanticAttribute
      );
    });

    it('should generate role + aria-label combination selectors', () => {
      const el: ElementDescriptor = {
        tag: 'div',
        role: 'button',
        ariaLabel: 'Submit',
      };

      const candidates = generateCSSSelectors(el);
      const combinedCandidate = candidates.find(c => c.strategy === 'role+ariaLabel');

      expect(combinedCandidate).toBeDefined();
      // Simple alphanumeric values don't need quotes
      expect(combinedCandidate!.value).toBe("[role=button][aria-label=Submit]");
    });

    it('should generate name attribute selectors for forms', () => {
      const el: ElementDescriptor = {
        tag: 'input',
        name: 'email',
        type: 'email',
      };

      const candidates = generateCSSSelectors(el);
      const nameCandidate = candidates.find(c => c.strategy === 'name');

      expect(nameCandidate).toBeDefined();
      expect(nameCandidate!.value).toBe('input[name=email]');
    });

    it('should generate placeholder selectors', () => {
      const el: ElementDescriptor = {
        tag: 'input',
        placeholder: 'Enter your email',
      };

      const candidates = generateCSSSelectors(el);
      const placeholderCandidate = candidates.find(c => c.strategy === 'placeholder');

      expect(placeholderCandidate).toBeDefined();
      expect(placeholderCandidate!.value).toBe("input[placeholder='Enter your email']");
    });

    it('should generate href selectors for links', () => {
      const el: ElementDescriptor = {
        tag: 'a',
        href: '/dashboard',
        text: 'Dashboard',
      };

      const candidates = generateCSSSelectors(el);
      const hrefCandidate = candidates.find(c => c.strategy === 'href');

      expect(hrefCandidate).toBeDefined();
      // Paths with slashes need quotes
      expect(hrefCandidate!.value).toBe("a[href='/dashboard']");
    });

    it('should generate type+name combination for inputs', () => {
      const el: ElementDescriptor = {
        tag: 'input',
        type: 'password',
        name: 'password',
      };

      const candidates = generateCSSSelectors(el);
      const typeNameCandidate = candidates.find(c => c.strategy === 'type+name');

      expect(typeNameCandidate).toBeDefined();
      expect(typeNameCandidate!.value).toBe('input[type=password][name=password]');
    });

    it('should filter out dynamic classes', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        classes: ['css-1abc2de', 'btn', 'sc-bdVaJa', 'primary'],
      };

      const candidates = generateCSSSelectors(el);
      const classCandidate = candidates.find(c => c.strategy === 'classes');

      expect(classCandidate).toBeDefined();
      // Should only include stable classes: btn, primary
      expect(classCandidate!.value).toContain('.btn');
      expect(classCandidate!.value).toContain('.primary');
      expect(classCandidate!.value).not.toContain('css-');
      expect(classCandidate!.value).not.toContain('sc-');
    });

    it('should handle elements with no useful attributes', () => {
      const el: ElementDescriptor = {
        tag: 'div',
        classes: ['css-random123'],
      };

      const candidates = generateCSSSelectors(el);
      // Should have no candidates since all classes are dynamic
      expect(candidates.length).toBe(0);
    });
  });
});

// ============================================================================
// XPath Selector Generation Tests
// ============================================================================

describe('XPath Selector Generation', () => {
  describe('generateXPathSelectors', () => {
    it('should generate XPath by ID', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        id: 'submit-btn',
      };

      const candidates = generateXPathSelectors(el);
      const idCandidate = candidates.find(c => c.strategy === 'xpath-id');

      expect(idCandidate).toBeDefined();
      expect(idCandidate!.value).toBe("xpath=//*[@id='submit-btn']");
    });

    it('should generate XPath by data-testid', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        testId: 'login-button',
      };

      const candidates = generateXPathSelectors(el);
      const testIdCandidate = candidates.find(c => c.strategy === 'xpath-testId');

      expect(testIdCandidate).toBeDefined();
      expect(testIdCandidate!.value).toBe("xpath=//*[@data-testid='login-button']");
    });

    it('should generate XPath by aria-label', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        ariaLabel: 'Close modal',
      };

      const candidates = generateXPathSelectors(el);
      const ariaCandidate = candidates.find(c => c.strategy === 'xpath-ariaLabel');

      expect(ariaCandidate).toBeDefined();
      expect(ariaCandidate!.value).toBe("xpath=//button[@aria-label='Close modal']");
    });

    it('should generate XPath by exact text', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        text: 'Submit',
      };

      const candidates = generateXPathSelectors(el);
      const textCandidate = candidates.find(c => c.strategy === 'xpath-exactText');

      expect(textCandidate).toBeDefined();
      // Implementation uses normalize-space(text()) for exact text match
      expect(textCandidate!.value).toBe("xpath=//button[normalize-space(text())='Submit']");
    });

    it('should generate XPath by contains text', () => {
      const el: ElementDescriptor = {
        tag: 'a',
        text: 'Learn more',
      };

      const candidates = generateXPathSelectors(el);
      const containsCandidate = candidates.find(c => c.strategy === 'xpath-containsText');

      expect(containsCandidate).toBeDefined();
      expect(containsCandidate!.value).toBe("xpath=//a[contains(normalize-space(.), 'Learn more')]");
    });

    it('should generate XPath by role + aria-label', () => {
      const el: ElementDescriptor = {
        tag: 'div',
        role: 'button',
        ariaLabel: 'Toggle menu',
      };

      const candidates = generateXPathSelectors(el);
      const combinedCandidate = candidates.find(c => c.strategy === 'xpath-role+ariaLabel');

      expect(combinedCandidate).toBeDefined();
      expect(combinedCandidate!.value).toBe("xpath=//*[@role='button' and @aria-label='Toggle menu']");
    });

    it('should generate XPath with parent context for nth-of-type', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        nthOfType: 2,
        parentDescriptor: {
          id: 'toolbar',
        },
      };

      const candidates = generateXPathSelectors(el);
      const nthCandidate = candidates.find(c => c.strategy === 'xpath-parentId+nth');

      expect(nthCandidate).toBeDefined();
      expect(nthCandidate!.value).toBe("xpath=//*[@id='toolbar']//button[2]");
    });

    it('should handle text with special characters', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        text: "It's a test",
      };

      const candidates = generateXPathSelectors(el);
      const textCandidate = candidates.find(c => c.strategy === 'xpath-exactText');

      expect(textCandidate).toBeDefined();
      // Should use double quotes for strings with single quotes
      expect(textCandidate!.value).toBe('xpath=//button[normalize-space(text())="It\'s a test"]');
    });

    it('should skip text-based XPath for long text', () => {
      const el: ElementDescriptor = {
        tag: 'p',
        text: 'A'.repeat(100), // Very long text
      };

      const candidates = generateXPathSelectors(el);
      const textCandidate = candidates.find(c => c.strategy === 'xpath-exactText');

      expect(textCandidate).toBeUndefined();
    });
  });
});

// ============================================================================
// Text Selector Generation Tests
// ============================================================================

describe('Text Selector Generation', () => {
  describe('generateTextSelectors', () => {
    it('should generate text selector from visible text', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        text: 'Click me',
      };

      const candidates = generateTextSelectors(el);
      const textCandidate = candidates.find(c => c.strategy === 'text-exact');

      expect(textCandidate).toBeDefined();
      expect(textCandidate!.kind).toBe('text');
      expect(textCandidate!.value).toBe('Click me');
    });

    it('should generate text selector from aria-label', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        ariaLabel: 'Close',
      };

      const candidates = generateTextSelectors(el);
      const ariaCandidate = candidates.find(c => c.strategy === 'text-ariaLabel');

      expect(ariaCandidate).toBeDefined();
      expect(ariaCandidate!.value).toBe('Close');
    });

    it('should skip empty text', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        text: '   ',
      };

      const candidates = generateTextSelectors(el);
      expect(candidates.filter(c => c.strategy === 'text-exact').length).toBe(0);
    });
  });
});

// ============================================================================
// Integrated Selector Generation Tests
// ============================================================================

describe('Integrated Selector Generation', () => {
  describe('generateAllSelectors', () => {
    it('should generate and rank all selector types', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        id: 'submit',
        testId: 'submit-btn',
        ariaLabel: 'Submit form',
        text: 'Submit',
      };

      const candidates = generateAllSelectors(el, { maxCandidates: 20 });

      // Should have multiple candidates
      expect(candidates.length).toBeGreaterThan(5);

      // Should be sorted by score (descending)
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
      }

      // Top candidates should include high-value strategies
      const topStrategies = candidates.slice(0, 5).map(c => c.strategy);
      expect(topStrategies).toContain('id');
    });

    it('should respect maxCandidates option', () => {
      const el: ElementDescriptor = {
        tag: 'button',
        id: 'btn',
        testId: 'btn',
        ariaLabel: 'Button',
        name: 'btn',
        placeholder: 'Click',
        text: 'Click me',
      };

      const candidates = generateAllSelectors(el, { maxCandidates: 3 });
      expect(candidates.length).toBeLessThanOrEqual(3);
    });
  });

  describe('pickBestSelector', () => {
    it('should pick unique selector over higher-scored non-unique', () => {
      const candidates: SelectorCandidate[] = [
        { kind: 'css', value: '#btn', score: 100, matches: 3, isUnique: false, strategy: 'id', confidence: 'high' },
        { kind: 'css', value: '[data-testid=submit]', score: 95, matches: 1, isUnique: true, strategy: 'testId', confidence: 'high' },
        { kind: 'css', value: 'button.primary', score: 30, matches: 5, isUnique: false, strategy: 'classes', confidence: 'low' },
      ];

      const validateUniqueness = (selector: string, _kind: SelectorKind) => {
        const found = candidates.find(c => c.value === selector);
        return found?.matches ?? 0;
      };

      const best = pickBestSelector(candidates, validateUniqueness);

      expect(best).toBeDefined();
      expect(best!.value).toBe('[data-testid=submit]');
      expect(best!.isUnique).toBe(true);
    });

    it('should return highest-scored if no unique selector exists', () => {
      const candidates: SelectorCandidate[] = [
        { kind: 'css', value: 'button.btn', score: 50, matches: 3, isUnique: false, strategy: 'classes', confidence: 'low' },
        { kind: 'css', value: 'button', score: 20, matches: 10, isUnique: false, strategy: 'tag', confidence: 'low' },
      ];

      const validateUniqueness = (selector: string, _kind: SelectorKind) => {
        const found = candidates.find(c => c.value === selector);
        return found?.matches ?? 0;
      };

      const best = pickBestSelector(candidates, validateUniqueness);

      expect(best).toBeDefined();
      expect(best!.value).toBe('button.btn');
    });

    it('should return null for empty candidates', () => {
      const best = pickBestSelector([], () => 0);
      expect(best).toBeNull();
    });
  });
});

// ============================================================================
// Scoring Configuration Tests
// ============================================================================

describe('Scoring Configuration', () => {
  it('should have correct weight hierarchy', () => {
    const weights = DEFAULT_SCORING_CONFIG.weights;

    // ID should be highest
    expect(weights.id).toBeGreaterThan(weights.testId);
    
    // testId should be higher than semantic attributes
    expect(weights.testId).toBeGreaterThan(weights.ariaLabel);
    
    // Semantic attributes should be higher than classes
    expect(weights.ariaLabel).toBeGreaterThan(weights.classes);
    expect(weights.role).toBeGreaterThan(weights.classes);
    expect(weights.name).toBeGreaterThan(weights.classes);
    
    // Classes should be higher than positional
    expect(weights.classes).toBeGreaterThan(weights.nthOfType);
  });

  it('should have meaningful penalties', () => {
    const penalties = DEFAULT_SCORING_CONFIG.penalties;

    // Non-unique penalty should be significant
    expect(penalties.nonUnique).toBeLessThan(-30);
    
    // Dynamic class penalty should be moderate
    expect(penalties.dynamicClass).toBeLessThan(0);
  });

  it('should have meaningful bonuses', () => {
    const bonuses = DEFAULT_SCORING_CONFIG.bonuses;

    // Semantic bonus should be positive
    expect(bonuses.semanticAttribute).toBeGreaterThan(0);
    
    // Stable attribute bonus should be positive
    expect(bonuses.stableAttribute).toBeGreaterThan(0);
  });
});

// ============================================================================
// Edge Cases and Robustness Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle element with only tag', () => {
    const el: ElementDescriptor = {
      tag: 'button',
    };

    const candidates = generateAllSelectors(el);
    // Should still generate some candidates (even if just tag-based)
    expect(candidates).toBeDefined();
  });

  it('should handle special characters in attribute values', () => {
    const el: ElementDescriptor = {
      tag: 'input',
      placeholder: 'Enter "value" here',
      ariaLabel: "It's important",
    };

    const candidates = generateCSSSelectors(el);
    
    // Should not throw
    expect(candidates.length).toBeGreaterThan(0);
    
    // Values should be properly escaped
    const placeholderCandidate = candidates.find(c => c.strategy === 'placeholder');
    expect(placeholderCandidate).toBeDefined();
  });

  it('should handle unicode in text', () => {
    const el: ElementDescriptor = {
      tag: 'button',
      text: '提交',
      ariaLabel: 'Soumettre',
    };

    const candidates = generateAllSelectors(el);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('should handle very long attribute values', () => {
    const el: ElementDescriptor = {
      tag: 'div',
      ariaLabel: 'A'.repeat(200),
    };

    const candidates = generateCSSSelectors(el);
    // Should still generate selector (truncation is caller's responsibility)
    const ariaCandidate = candidates.find(c => c.strategy === 'ariaLabel');
    expect(ariaCandidate).toBeDefined();
  });

  it('should handle empty classes array', () => {
    const el: ElementDescriptor = {
      tag: 'button',
      classes: [],
    };

    const candidates = generateCSSSelectors(el);
    const classCandidate = candidates.find(c => c.strategy === 'classes');
    expect(classCandidate).toBeUndefined();
  });

  it('should handle all dynamic classes', () => {
    const el: ElementDescriptor = {
      tag: 'div',
      classes: ['css-abc123', 'sc-def456', '_ghijkl789'],
    };

    const candidates = generateCSSSelectors(el);
    const classCandidate = candidates.find(c => c.strategy === 'classes');
    expect(classCandidate).toBeUndefined();
  });
});

// ============================================================================
// Real-World Scenario Tests
// ============================================================================

describe('Real-World Scenarios', () => {
  it('should handle Salesforce-like element (complex classes, aria)', () => {
    const el: ElementDescriptor = {
      tag: 'button',
      classes: ['slds-button', 'slds-button_brand', 'cSaveButton'],
      ariaLabel: 'Save Record',
      role: 'button',
    };

    const candidates = generateAllSelectors(el);
    
    // Should prefer aria-label over classes
    const ariaCandidate = candidates.find(c => c.strategy === 'ariaLabel');
    const classCandidate = candidates.find(c => c.strategy === 'classes');
    
    expect(ariaCandidate).toBeDefined();
    expect(classCandidate).toBeDefined();
    expect(ariaCandidate!.score).toBeGreaterThan(classCandidate!.score);
  });

  it('should handle React app element (dynamic classes)', () => {
    const el: ElementDescriptor = {
      tag: 'button',
      classes: ['css-1abc2de', 'emotion-xyz'],
      testId: 'submit-form',
      text: 'Submit',
    };

    const candidates = generateAllSelectors(el);
    
    // Should prefer testId over dynamic classes
    const testIdCandidate = candidates.find(c => c.strategy === 'testId');
    expect(testIdCandidate).toBeDefined();
    expect(testIdCandidate!.score).toBeGreaterThan(30); // Higher than classes
  });

  it('should handle form input with multiple attributes', () => {
    const el: ElementDescriptor = {
      tag: 'input',
      type: 'email',
      name: 'user_email',
      placeholder: 'Enter your email',
      ariaLabel: 'Email address',
      id: 'email-input',
    };

    const candidates = generateAllSelectors(el);
    
    // Should have many high-quality candidates
    expect(candidates.length).toBeGreaterThan(5);
    
    // High-value strategies should be present
    const strategies = candidates.map(c => c.strategy);
    expect(strategies).toContain('id');
    
    // Should have name-based selector
    const nameCandidate = candidates.find(c => c.strategy === 'name');
    expect(nameCandidate).toBeDefined();
  });

  it('should handle navigation link', () => {
    const el: ElementDescriptor = {
      tag: 'a',
      href: '/dashboard/settings',
      text: 'Settings',
      ariaLabel: 'Go to settings',
    };

    const candidates = generateAllSelectors(el);
    
    // Should have href-based selector
    const hrefCandidate = candidates.find(c => c.strategy === 'href');
    expect(hrefCandidate).toBeDefined();
    
    // Should have text-based XPath
    const textXPath = candidates.find(c => c.strategy === 'xpath-exactText');
    expect(textXPath).toBeDefined();
  });

  it('should handle custom web component', () => {
    const el: ElementDescriptor = {
      tag: 'custom-button',
      role: 'button',
      ariaLabel: 'Custom action',
      testId: 'custom-btn',
    };

    const candidates = generateAllSelectors(el);
    
    // Should still generate valid selectors
    expect(candidates.length).toBeGreaterThan(0);
    
    // testId should work
    const testIdCandidate = candidates.find(c => c.strategy === 'testId');
    expect(testIdCandidate).toBeDefined();
  });
});
