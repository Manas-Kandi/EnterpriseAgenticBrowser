var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { b as browserTargetService } from "./main-DUraoplD.js";
const DOM_EXTRACTION_SCRIPT = `
(function() {
  const startTime = performance.now();
  
  // Aggressive limits for token efficiency
  const MAX_TEXT = 60;
  const MAX_BUTTONS = 20;
  const MAX_LINKS = 30;
  const MAX_INPUTS = 20;
  const MAX_SELECTS = 10;
  const MAX_CONTENT = 50;
  
  // Viewport bounds for visibility check
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  
  // Fast visibility check (avoid getComputedStyle when possible)
  function isVisible(el) {
    if (!el || el.offsetParent === null) return false;
    const r = el.getBoundingClientRect();
    // Skip zero-size and off-screen elements
    if (r.width === 0 || r.height === 0) return false;
    // Skip elements far off-screen (allow some buffer)
    if (r.bottom < -100 || r.top > vh + 500 || r.right < -100 || r.left > vw + 100) return false;
    return true;
  }
  
  // Fast text extraction with aggressive truncation
  function getText(el) {
    if (!el) return undefined;
    // Prefer aria-label or title for buttons/links
    const label = el.getAttribute('aria-label') || el.title;
    if (label) return label.slice(0, MAX_TEXT).trim() || undefined;
    // Get innerText (faster than traversing childNodes)
    const t = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
    return t ? t.slice(0, MAX_TEXT) : undefined;
  }
  
  // Compact element extraction - only essential attributes
  function extract(el) {
    const tag = el.tagName.toLowerCase();
    const r = { t: tag };
    
    // Priority: data-testid > id > name (for selectors)
    const testId = el.getAttribute('data-testid');
    if (testId) { r.d = testId; }
    else if (el.id) { r.i = el.id; }
    else if (el.name) { r.n = el.name; }
    
    // Text content
    const text = getText(el);
    if (text) r.x = text;
    
    // Type-specific attributes
    if (tag === 'a' && el.href) {
      // Shorten URLs - just path for same-origin
      try {
        const u = new URL(el.href);
        r.h = u.origin === location.origin ? u.pathname + u.search : el.href;
      } catch { r.h = el.href; }
    }
    if (tag === 'input') {
      if (el.type && el.type !== 'text') r.y = el.type;
      if (el.placeholder) r.p = el.placeholder.slice(0, 30);
    }
    if (el.getAttribute('role')) r.r = el.getAttribute('role');
    
    return r;
  }
  
  // Deduplicate similar elements (e.g., repeated list items)
  function dedupeByText(elements) {
    const seen = new Set();
    const result = [];
    for (const el of elements) {
      const key = el.x || el.d || el.i || '';
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      result.push(el);
    }
    return result;
  }
  
  // Collect interactive elements with priority scoring
  function collectInteractive() {
    const buttons = [], links = [], inputs = [], selects = [];
    
    // Buttons - prioritize visible, with text
    for (const el of document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')) {
      if (buttons.length >= MAX_BUTTONS) break;
      if (!isVisible(el)) continue;
      const e = extract(el);
      if (e.x || e.d || e.i) buttons.push(e);
    }
    
    // Links - prioritize navigation, skip repetitive
    const linkSet = new Set();
    for (const el of document.querySelectorAll('a[href]')) {
      if (links.length >= MAX_LINKS) break;
      if (!isVisible(el)) continue;
      // Skip duplicate hrefs
      if (linkSet.has(el.href)) continue;
      linkSet.add(el.href);
      const e = extract(el);
      if (e.x || e.d || e.i) links.push(e);
    }
    
    // Inputs - all visible
    for (const el of document.querySelectorAll('input:not([type="hidden"]), textarea')) {
      if (inputs.length >= MAX_INPUTS) break;
      if (!isVisible(el)) continue;
      inputs.push(extract(el));
    }
    
    // Selects
    for (const el of document.querySelectorAll('select')) {
      if (selects.length >= MAX_SELECTS) break;
      if (!isVisible(el)) continue;
      selects.push(extract(el));
    }
    
    return { b: buttons, l: links, i: inputs, s: selects };
  }
  
  // Collect important content areas (headings, key text)
  function collectContent() {
    const content = [];
    
    // Find main content area
    const main = document.querySelector('main, [role="main"], article, #content, .content, #main');
    const scope = main || document.body;
    
    // Headings are high priority
    for (const el of scope.querySelectorAll('h1, h2, h3')) {
      if (content.length >= 10) break;
      if (!isVisible(el)) continue;
      const e = extract(el);
      if (e.x) content.push(e);
    }
    
    // Key content indicators
    for (const el of scope.querySelectorAll('[data-testid], [role="listitem"], .product, .item, .card, .result')) {
      if (content.length >= MAX_CONTENT) break;
      if (!isVisible(el)) continue;
      const e = extract(el);
      if (e.x || e.d) content.push(e);
    }
    
    return dedupeByText(content);
  }
  
  // Build result
  const ie = collectInteractive();
  const mc = collectContent();
  const metaDesc = document.querySelector('meta[name="description"]');
  
  const result = {
    u: location.href,
    t: document.title || '',
    m: metaDesc ? metaDesc.getAttribute('content')?.slice(0, 150) : undefined,
    ie,
    mc,
    _ms: Math.round(performance.now() - startTime)
  };
  
  return result;
})();
`;
const _DOMContextService = class _DOMContextService {
  /**
   * Expand compact element to full DOMElement
   */
  expandElement(compact) {
    const el = { tag: compact.t };
    if (compact.d) el.dataTestId = compact.d;
    if (compact.i) el.id = compact.i;
    if (compact.n) el.name = compact.n;
    if (compact.x) el.text = compact.x;
    if (compact.h) el.href = compact.h;
    if (compact.y) el.type = compact.y;
    if (compact.p) el.placeholder = compact.p;
    if (compact.r) el.role = compact.r;
    return el;
  }
  /**
   * Expand compact result to full DOMContext
   */
  expandResult(compact) {
    return {
      url: compact.u,
      title: compact.t,
      metaDescription: compact.m,
      interactiveElements: {
        buttons: compact.ie.b.map((e) => this.expandElement(e)),
        links: compact.ie.l.map((e) => this.expandElement(e)),
        inputs: compact.ie.i.map((e) => this.expandElement(e)),
        selects: compact.ie.s.map((e) => this.expandElement(e))
      },
      mainContent: compact.mc.map((e) => this.expandElement(e)),
      tokenEstimate: 0,
      truncated: false
    };
  }
  /**
   * Extract DOM context from the active webview
   */
  async getContext(tabId) {
    const wc = tabId ? browserTargetService.getWebContents(tabId) : browserTargetService.getActiveWebContents();
    if (!wc || wc.isDestroyed()) {
      throw new Error("No active webview available");
    }
    try {
      const compactResult = await wc.executeJavaScript(DOM_EXTRACTION_SCRIPT);
      console.log(`[DOMContext] Extracted in ${compactResult._ms}ms`);
      const result = this.expandResult(compactResult);
      const jsonStr = JSON.stringify(compactResult);
      result.tokenEstimate = Math.ceil(jsonStr.length / _DOMContextService.CHARS_PER_TOKEN);
      if (result.tokenEstimate > _DOMContextService.MAX_TOKENS) {
        return this.truncateContext(result);
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
  async getMinimalContext(tabId) {
    const wc = tabId ? browserTargetService.getWebContents(tabId) : browserTargetService.getActiveWebContents();
    if (!wc || wc.isDestroyed()) {
      throw new Error("No active webview available");
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
  truncateContext(context) {
    const result = { ...context, truncated: true };
    const maxChars = _DOMContextService.MAX_TOKENS * _DOMContextService.CHARS_PER_TOKEN;
    if (result.mainContent && result.mainContent.length > 100) {
      result.mainContent = result.mainContent.slice(0, 100);
    }
    let jsonStr = JSON.stringify(result);
    if (jsonStr.length <= maxChars) {
      result.tokenEstimate = Math.ceil(jsonStr.length / _DOMContextService.CHARS_PER_TOKEN);
      return result;
    }
    if (result.mainContent && result.mainContent.length > 50) {
      result.mainContent = result.mainContent.slice(0, 50);
    }
    jsonStr = JSON.stringify(result);
    if (jsonStr.length <= maxChars) {
      result.tokenEstimate = Math.ceil(jsonStr.length / _DOMContextService.CHARS_PER_TOKEN);
      return result;
    }
    if (result.interactiveElements.links.length > 50) {
      result.interactiveElements.links = result.interactiveElements.links.slice(0, 50);
    }
    jsonStr = JSON.stringify(result);
    if (jsonStr.length <= maxChars) {
      result.tokenEstimate = Math.ceil(jsonStr.length / _DOMContextService.CHARS_PER_TOKEN);
      return result;
    }
    result.mainContent = [];
    jsonStr = JSON.stringify(result);
    result.tokenEstimate = Math.ceil(jsonStr.length / _DOMContextService.CHARS_PER_TOKEN);
    return result;
  }
};
__publicField(_DOMContextService, "MAX_TOKENS", 2e3);
// Reduced target
__publicField(_DOMContextService, "CHARS_PER_TOKEN", 4);
let DOMContextService = _DOMContextService;
const domContextService = new DOMContextService();
export {
  DOMContextService,
  domContextService
};
