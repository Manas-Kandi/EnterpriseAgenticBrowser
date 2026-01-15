/**
 * IntentClassifier Unit Tests
 *
 * Validates tab/context routing rules:
 * - Same-site followups (e.g. YouTube) should stay in the same tab
 * - New tasks default to opening a new tab and switching to it
 * - Explicit background requests enable true background work
 */

import { classifyIntent, shouldNavigateActiveTab } from '../../electron/services/IntentClassifier';

describe('IntentClassifier', () => {
  describe('classifyIntent', () => {
    test('treats same-site followup as in-context (YouTube)', () => {
      const currentUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const intent = classifyIntent('look up lo-fi mixes on youtube', currentUrl);

      expect(intent.type).toBe('in_context');
      expect(intent.reason.toLowerCase()).toContain('mentions_current_site');
    });

    test('defaults to new tab + foreground for new thing', () => {
      const intent = classifyIntent('research alternatives to react query');
      expect(intent.type).toBe('exploratory');
      expect(intent.openInBackground).toBe(false);
    });

    test('explicit background override sets openInBackground true', () => {
      const intent = classifyIntent('look up oauth docs in the background');
      expect(intent.type).toBe('exploratory');
      expect(intent.openInBackground).toBe(true);
      expect(intent.explicitOverride).toBe('background');
    });
  });

  describe('shouldNavigateActiveTab', () => {
    test('allows same-domain navigation', () => {
      const currentUrl = 'https://www.youtube.com/watch?v=abc';
      const targetUrl = 'https://www.youtube.com/results?search_query=lofi';

      const decision = shouldNavigateActiveTab('look up lofi on youtube', targetUrl, currentUrl);
      expect(decision.allowNavigation).toBe(true);
    });

    test('blocks navigation when explicit new tab requested', () => {
      const currentUrl = 'https://www.youtube.com/watch?v=abc';
      const targetUrl = 'https://en.wikipedia.org/wiki/Lo-fi';

      const decision = shouldNavigateActiveTab('open wikipedia in a new tab', targetUrl, currentUrl);
      expect(decision.allowNavigation).toBe(false);
    });

    test('blocks navigation for exploratory new-site by default', () => {
      const currentUrl = 'https://www.youtube.com/watch?v=abc';
      const targetUrl = 'https://en.wikipedia.org/wiki/Lo-fi';

      const decision = shouldNavigateActiveTab('research lo-fi history', targetUrl, currentUrl);
      expect(decision.allowNavigation).toBe(false);
    });
  });
});
