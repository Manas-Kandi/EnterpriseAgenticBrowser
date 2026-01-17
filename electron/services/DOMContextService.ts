import { browserTargetService } from './BrowserTargetService';

/**
 * Represents a simplified DOM element for LLM consumption
 */
export interface DOMElement {
  tag: string;
  id?: string;
  classes?: string[];
  text?: string;
  href?: string;
  src?: string;
  type?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  role?: string;
  ariaLabel?: string;
  dataTestId?: string;
  children?: DOMElement[];
}

/**
 * Represents the full DOM context for a page
 */
export interface DOMContext {
  url: string;
  title: string;
  metaDescription?: string;
  interactiveElements: {
    buttons: DOMElement[];
    links: DOMElement[];
    inputs: DOMElement[];
    selects: DOMElement[];
  };
  mainContent?: DOMElement[];
  tokenEstimate: number;
  truncated: boolean;
}

/**
 * JavaScript code to inject into the page for DOM extraction.
 * This runs in the page context, not Node.js.
 */
const DOM_EXTRACTION_SCRIPT = `
(function() {
  const MAX_TEXT_LENGTH = 100;
  const MAX_ELEMENTS = 500;
  const MAX_DEPTH = 10;
  
  function truncateText(text, maxLen = MAX_TEXT_LENGTH) {
    if (!text) return undefined;
    const cleaned = text.trim().replace(/\\s+/g, ' ');
    if (cleaned.length <= maxLen) return cleaned || undefined;
    return cleaned.slice(0, maxLen) + '...';
  }
  
  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  }
  
  function extractElement(el, depth = 0) {
    if (!el || depth > MAX_DEPTH) return null;
    
    const tag = el.tagName?.toLowerCase();
    if (!tag) return null;
    
    // Skip script, style, svg internals, etc.
    if (['script', 'style', 'noscript', 'svg', 'path', 'meta', 'link', 'head'].includes(tag)) {
      return null;
    }
    
    const result = { tag };
    
    if (el.id) result.id = el.id;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c.trim()).slice(0, 5);
      if (classes.length > 0) result.classes = classes;
    }
    
    // Get text content (direct text only, not children)
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent)
      .join(' ');
    const text = truncateText(directText);
    if (text) result.text = text;
    
    // Common attributes
    if (el.href) result.href = el.href;
    if (el.src) result.src = el.src;
    if (el.type) result.type = el.type;
    if (el.name) result.name = el.name;
    if (el.placeholder) result.placeholder = el.placeholder;
    if (el.value && ['input', 'select', 'textarea'].includes(tag)) {
      result.value = truncateText(el.value, 50);
    }
    if (el.getAttribute('role')) result.role = el.getAttribute('role');
    if (el.getAttribute('aria-label')) result.ariaLabel = el.getAttribute('aria-label');
    if (el.getAttribute('data-testid')) result.dataTestId = el.getAttribute('data-testid');
    
    return result;
  }
  
  function collectInteractiveElements() {
    const buttons = [];
    const links = [];
    const inputs = [];
    const selects = [];
    
    // Buttons
    document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach(el => {
      if (isVisible(el) && buttons.length < 50) {
        const extracted = extractElement(el);
        if (extracted) buttons.push(extracted);
      }
    });
    
    // Links
    document.querySelectorAll('a[href]').forEach(el => {
      if (isVisible(el) && links.length < 100) {
        const extracted = extractElement(el);
        if (extracted) links.push(extracted);
      }
    });
    
    // Inputs
    document.querySelectorAll('input, textarea').forEach(el => {
      if (isVisible(el) && inputs.length < 50) {
        const extracted = extractElement(el);
        if (extracted) inputs.push(extracted);
      }
    });
    
    // Selects
    document.querySelectorAll('select').forEach(el => {
      if (isVisible(el) && selects.length < 20) {
        const extracted = extractElement(el);
        if (extracted) selects.push(extracted);
      }
    });
    
    return { buttons, links, inputs, selects };
  }
  
  function collectMainContent() {
    const content = [];
    const mainEl = document.querySelector('main, [role="main"], article, .content, #content');
    const target = mainEl || document.body;
    
    // Get significant elements from main content area
    const significantTags = ['h1', 'h2', 'h3', 'h4', 'p', 'li', 'td', 'th', 'span', 'div'];
    
    target.querySelectorAll(significantTags.join(',')).forEach(el => {
      if (content.length >= MAX_ELEMENTS) return;
      if (!isVisible(el)) return;
      
      const extracted = extractElement(el);
      if (extracted && (extracted.text || extracted.id || extracted.dataTestId)) {
        content.push(extracted);
      }
    });
    
    return content;
  }
  
  // Main extraction
  const interactiveElements = collectInteractiveElements();
  const mainContent = collectMainContent();
  
  // Get meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  
  const result = {
    url: window.location.href,
    title: document.title || '',
    metaDescription: metaDesc ? metaDesc.getAttribute('content') : undefined,
    interactiveElements,
    mainContent: mainContent.slice(0, 200), // Limit main content
    truncated: mainContent.length > 200
  };
  
  return result;
})();
`;

/**
 * Service for extracting DOM context from the active browser tab
 */
export class DOMContextService {
  private static readonly MAX_TOKENS = 8000;
  private static readonly CHARS_PER_TOKEN = 4; // Rough estimate

  /**
   * Extract DOM context from the active webview
   */
  async getContext(tabId?: string): Promise<DOMContext> {
    const wc = tabId 
      ? browserTargetService.getWebContents(tabId)
      : browserTargetService.getActiveWebContents();

    if (!wc || wc.isDestroyed()) {
      throw new Error('No active webview available');
    }

    try {
      const rawResult = await wc.executeJavaScript(DOM_EXTRACTION_SCRIPT);
      
      // Estimate token count
      const jsonStr = JSON.stringify(rawResult);
      const tokenEstimate = Math.ceil(jsonStr.length / DOMContextService.CHARS_PER_TOKEN);
      
      // Truncate if needed
      let result = rawResult as DOMContext;
      result.tokenEstimate = tokenEstimate;
      
      if (tokenEstimate > DOMContextService.MAX_TOKENS) {
        result = this.truncateContext(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to extract DOM context: ${errorMessage}`);
    }
  }

  /**
   * Get a minimal context (just URL, title, and interactive element counts)
   */
  async getMinimalContext(tabId?: string): Promise<{ url: string; title: string; summary: string }> {
    const wc = tabId 
      ? browserTargetService.getWebContents(tabId)
      : browserTargetService.getActiveWebContents();

    if (!wc || wc.isDestroyed()) {
      throw new Error('No active webview available');
    }

    const url = wc.getURL();
    const title = wc.getTitle();
    
    const countScript = `
      (function() {
        return {
          buttons: document.querySelectorAll('button, [role="button"]').length,
          links: document.querySelectorAll('a[href]').length,
          inputs: document.querySelectorAll('input, textarea').length,
          selects: document.querySelectorAll('select').length
        };
      })();
    `;
    
    const counts = await wc.executeJavaScript(countScript);
    const summary = `Page has ${counts.buttons} buttons, ${counts.links} links, ${counts.inputs} inputs, ${counts.selects} selects`;
    
    return { url, title, summary };
  }

  /**
   * Truncate context to fit within token limit
   */
  private truncateContext(context: DOMContext): DOMContext {
    const result = { ...context, truncated: true };
    
    // Progressively reduce content until under limit
    const maxChars = DOMContextService.MAX_TOKENS * DOMContextService.CHARS_PER_TOKEN;
    
    // First, limit main content
    if (result.mainContent && result.mainContent.length > 100) {
      result.mainContent = result.mainContent.slice(0, 100);
    }
    
    let jsonStr = JSON.stringify(result);
    if (jsonStr.length <= maxChars) {
      result.tokenEstimate = Math.ceil(jsonStr.length / DOMContextService.CHARS_PER_TOKEN);
      return result;
    }
    
    // Reduce main content further
    if (result.mainContent && result.mainContent.length > 50) {
      result.mainContent = result.mainContent.slice(0, 50);
    }
    
    jsonStr = JSON.stringify(result);
    if (jsonStr.length <= maxChars) {
      result.tokenEstimate = Math.ceil(jsonStr.length / DOMContextService.CHARS_PER_TOKEN);
      return result;
    }
    
    // Reduce links
    if (result.interactiveElements.links.length > 50) {
      result.interactiveElements.links = result.interactiveElements.links.slice(0, 50);
    }
    
    jsonStr = JSON.stringify(result);
    if (jsonStr.length <= maxChars) {
      result.tokenEstimate = Math.ceil(jsonStr.length / DOMContextService.CHARS_PER_TOKEN);
      return result;
    }
    
    // Remove main content entirely if still too large
    result.mainContent = [];
    
    jsonStr = JSON.stringify(result);
    result.tokenEstimate = Math.ceil(jsonStr.length / DOMContextService.CHARS_PER_TOKEN);
    
    return result;
  }
}

export const domContextService = new DOMContextService();
