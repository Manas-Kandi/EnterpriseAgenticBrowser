import { jest, describe, it, expect } from '@jest/globals';

jest.mock('electron', () => ({
  webContents: {
    fromId: jest.fn(),
    getAllWebContents: jest.fn(() => []),
  },
}));

import { webContents } from 'electron';
import { BrowserTargetService } from '../../electron/services/BrowserTargetService';

describe('BrowserTargetService', () => {
  it('waitForTab resolves true after registerWebview', async () => {
    jest.useFakeTimers();

    const svc = new BrowserTargetService();

    (webContents.fromId as unknown as jest.Mock).mockReturnValue({
      isDestroyed: () => false,
      getURL: () => 'https://www.youtube.com/watch?v=abc',
    });

    const p = svc.waitForTab('t1', 5000);
    svc.registerWebview('t1', 123);

    // flush microtasks/timers
    jest.runOnlyPendingTimers();
    await expect(p).resolves.toBe(true);

    jest.useRealTimers();
  });

  it('getMostRecentTabForDomainToken returns MRU matching tab even if not active', () => {
    const svc = new BrowserTargetService();

    (webContents.fromId as unknown as jest.Mock)
      .mockImplementationOnce(() => ({
        isDestroyed: () => false,
        getURL: () => 'https://en.wikipedia.org/wiki/Foo',
      }))
      .mockImplementationOnce(() => ({
        isDestroyed: () => false,
        getURL: () => 'https://www.youtube.com/watch?v=abc',
      }));

    svc.registerWebview('wikipedia-tab', 1);
    svc.registerWebview('youtube-tab', 2);

    const tabId = svc.getMostRecentTabForDomainToken('youtube');
    expect(tabId).toBe('youtube-tab');
  });
});
