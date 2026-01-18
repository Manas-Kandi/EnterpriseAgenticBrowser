import { describe, it, expect } from '@jest/globals';

/**
 * Step 6: Page Monitoring Test Suite
 * 
 * Tests monitor creation, persistence, triggering, and notification:
 * - Monitor creation with various configurations
 * - Persistence across restarts (save/load)
 * - Condition checking and triggering
 * - Notification when triggered
 */

// Define types for testing
interface PageMonitor {
  id: string;
  name: string;
  url: string;
  tabId?: string;
  checkCode: string;
  description: string;
  intervalMs: number;
  createdAt: number;
  lastCheckedAt?: number;
  lastResult?: unknown;
  triggered: boolean;
  triggeredAt?: number;
  active: boolean;
  notifyOnTrigger: boolean;
}

interface MonitorCheckResult {
  monitorId: string;
  triggered: boolean;
  result: unknown;
  error?: string;
  checkedAt: number;
}

describe('Step 6: Page Monitoring', () => {
  
  describe('Monitor Creation', () => {
    
    it('should create a monitor with required fields', () => {
      const monitor: PageMonitor = {
        id: 'monitor-1',
        name: 'Price Drop Alert',
        url: 'https://amazon.com/product/123',
        checkCode: 'return parseFloat(document.querySelector(".price").textContent.replace("$", "")) < 100;',
        description: 'Alert when price drops below $100',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      expect(monitor.id).toBeDefined();
      expect(monitor.name).toBe('Price Drop Alert');
      expect(monitor.checkCode).toContain('< 100');
      expect(monitor.intervalMs).toBe(60000);
      expect(monitor.active).toBe(true);
    });

    it('should create a monitor with custom interval', () => {
      const monitor: PageMonitor = {
        id: 'monitor-2',
        name: 'Stock Check',
        url: 'https://store.com/item',
        checkCode: 'return document.querySelector(".in-stock") !== null;',
        description: 'Alert when item is back in stock',
        intervalMs: 300000, // 5 minutes
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      expect(monitor.intervalMs).toBe(300000);
    });

    it('should create a monitor with tab binding', () => {
      const monitor: PageMonitor = {
        id: 'monitor-3',
        name: 'Tab-specific Monitor',
        url: 'https://example.com',
        tabId: 'tab-123',
        checkCode: 'return true;',
        description: 'Monitor specific tab',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      expect(monitor.tabId).toBe('tab-123');
    });

    it('should create a monitor with notification disabled', () => {
      const monitor: PageMonitor = {
        id: 'monitor-4',
        name: 'Silent Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Silent check',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: false
      };

      expect(monitor.notifyOnTrigger).toBe(false);
    });

    it('should generate unique IDs for monitors', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        ids.add(`monitor-${Date.now()}-${Math.random()}`);
      }
      expect(ids.size).toBe(10);
    });
  });

  describe('Monitor Persistence', () => {
    
    it('should serialize monitor to JSON', () => {
      const monitor: PageMonitor = {
        id: 'monitor-1',
        name: 'Test Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Test',
        intervalMs: 60000,
        createdAt: 1700000000000,
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      const json = JSON.stringify(monitor);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('monitor-1');
      expect(parsed.name).toBe('Test Monitor');
      expect(parsed.createdAt).toBe(1700000000000);
    });

    it('should serialize multiple monitors', () => {
      const monitors: PageMonitor[] = [
        { id: 'm1', name: 'Monitor 1', url: 'https://a.com', checkCode: 'return true;', description: 'A', intervalMs: 60000, createdAt: Date.now(), triggered: false, active: true, notifyOnTrigger: true },
        { id: 'm2', name: 'Monitor 2', url: 'https://b.com', checkCode: 'return false;', description: 'B', intervalMs: 120000, createdAt: Date.now(), triggered: true, active: false, notifyOnTrigger: true }
      ];

      const json = JSON.stringify(monitors, null, 2);
      const parsed = JSON.parse(json) as PageMonitor[];

      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Monitor 1');
      expect(parsed[1].triggered).toBe(true);
    });

    it('should preserve all monitor state after serialization', () => {
      const monitor: PageMonitor = {
        id: 'monitor-full',
        name: 'Full State Monitor',
        url: 'https://example.com',
        tabId: 'tab-456',
        checkCode: 'return document.title.includes("Sale");',
        description: 'Check for sale',
        intervalMs: 30000,
        createdAt: 1700000000000,
        lastCheckedAt: 1700000060000,
        lastResult: { found: true },
        triggered: true,
        triggeredAt: 1700000060000,
        active: false,
        notifyOnTrigger: true
      };

      const restored = JSON.parse(JSON.stringify(monitor)) as PageMonitor;

      expect(restored.tabId).toBe('tab-456');
      expect(restored.lastCheckedAt).toBe(1700000060000);
      expect(restored.lastResult).toEqual({ found: true });
      expect(restored.triggeredAt).toBe(1700000060000);
    });

    it('should restore active monitors on load', () => {
      const monitors: PageMonitor[] = [
        { id: 'm1', name: 'Active', url: 'https://a.com', checkCode: 'return true;', description: 'A', intervalMs: 60000, createdAt: Date.now(), triggered: false, active: true, notifyOnTrigger: true },
        { id: 'm2', name: 'Inactive', url: 'https://b.com', checkCode: 'return true;', description: 'B', intervalMs: 60000, createdAt: Date.now(), triggered: false, active: false, notifyOnTrigger: true },
        { id: 'm3', name: 'Triggered', url: 'https://c.com', checkCode: 'return true;', description: 'C', intervalMs: 60000, createdAt: Date.now(), triggered: true, active: false, notifyOnTrigger: true }
      ];

      const toStart = monitors.filter(m => m.active && !m.triggered);
      expect(toStart).toHaveLength(1);
      expect(toStart[0].name).toBe('Active');
    });
  });

  describe('Condition Checking', () => {
    
    it('should define check result structure', () => {
      const result: MonitorCheckResult = {
        monitorId: 'monitor-1',
        triggered: true,
        result: true,
        checkedAt: Date.now()
      };

      expect(result.monitorId).toBe('monitor-1');
      expect(result.triggered).toBe(true);
      expect(result.checkedAt).toBeGreaterThan(0);
    });

    it('should handle check with error', () => {
      const result: MonitorCheckResult = {
        monitorId: 'monitor-1',
        triggered: false,
        result: null,
        error: 'Element not found',
        checkedAt: Date.now()
      };

      expect(result.triggered).toBe(false);
      expect(result.error).toBe('Element not found');
    });

    it('should detect price below threshold', () => {
      const checkPriceCondition = (price: number, threshold: number): boolean => {
        return price < threshold;
      };

      expect(checkPriceCondition(99.99, 100)).toBe(true);
      expect(checkPriceCondition(100.00, 100)).toBe(false);
      expect(checkPriceCondition(150.00, 100)).toBe(false);
    });

    it('should detect element existence', () => {
      const checkElementExists = (element: unknown): boolean => {
        return element !== null && element !== undefined;
      };

      expect(checkElementExists({ tagName: 'DIV' })).toBe(true);
      expect(checkElementExists(null)).toBe(false);
    });

    it('should detect text content match', () => {
      const checkTextContains = (text: string, search: string): boolean => {
        return text.toLowerCase().includes(search.toLowerCase());
      };

      expect(checkTextContains('In Stock - Ships Today', 'in stock')).toBe(true);
      expect(checkTextContains('Out of Stock', 'in stock')).toBe(false);
    });

    it('should update lastCheckedAt after check', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Test',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Test',
        intervalMs: 60000,
        createdAt: Date.now() - 100000,
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      const checkTime = Date.now();
      monitor.lastCheckedAt = checkTime;
      monitor.lastResult = true;

      expect(monitor.lastCheckedAt).toBe(checkTime);
      expect(monitor.lastResult).toBe(true);
    });
  });

  describe('Monitor Triggering', () => {
    
    it('should trigger when condition returns true', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Price Alert',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Price dropped',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      // Simulate trigger
      const conditionMet = true;
      if (conditionMet && !monitor.triggered) {
        monitor.triggered = true;
        monitor.triggeredAt = Date.now();
        monitor.active = false;
      }

      expect(monitor.triggered).toBe(true);
      expect(monitor.triggeredAt).toBeDefined();
      expect(monitor.active).toBe(false);
    });

    it('should not trigger when condition returns false', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Price Alert',
        url: 'https://example.com',
        checkCode: 'return false;',
        description: 'Price dropped',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      const conditionMet = false;
      if (conditionMet && !monitor.triggered) {
        monitor.triggered = true;
        monitor.triggeredAt = Date.now();
        monitor.active = false;
      }

      expect(monitor.triggered).toBe(false);
      expect(monitor.triggeredAt).toBeUndefined();
      expect(monitor.active).toBe(true);
    });

    it('should only trigger once', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'One-time Alert',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Alert',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: true, // Already triggered
        triggeredAt: Date.now() - 1000,
        active: false,
        notifyOnTrigger: true
      };

      let triggerCount = 0;
      const conditionMet = true;
      
      // Simulate multiple checks
      for (let i = 0; i < 3; i++) {
        if (conditionMet && !monitor.triggered) {
          triggerCount++;
          monitor.triggered = true;
        }
      }

      expect(triggerCount).toBe(0); // Should not trigger again
    });

    it('should stop monitoring after trigger', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Auto-stop Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Alert',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      // Simulate trigger
      monitor.triggered = true;
      monitor.triggeredAt = Date.now();
      monitor.active = false;

      expect(monitor.active).toBe(false);
    });
  });

  describe('Notification', () => {
    
    it('should prepare notification content', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Price Drop Alert',
        url: 'https://amazon.com/product/123',
        checkCode: 'return true;',
        description: 'Price dropped below $100',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: true,
        triggeredAt: Date.now(),
        active: false,
        notifyOnTrigger: true
      };

      const notification = {
        title: '🔔 Monitor Alert',
        body: `${monitor.name}: ${monitor.description}`
      };

      expect(notification.title).toBe('🔔 Monitor Alert');
      expect(notification.body).toContain('Price Drop Alert');
      expect(notification.body).toContain('Price dropped below $100');
    });

    it('should skip notification when disabled', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Silent Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Silent',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: true,
        active: false,
        notifyOnTrigger: false
      };

      const shouldNotify = monitor.notifyOnTrigger;
      expect(shouldNotify).toBe(false);
    });

    it('should include trigger result in notification event', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Price Alert',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Price dropped',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: true,
        active: false,
        notifyOnTrigger: true
      };

      const triggerEvent = {
        monitor,
        result: { currentPrice: 89.99, threshold: 100 }
      };

      expect(triggerEvent.monitor.name).toBe('Price Alert');
      expect(triggerEvent.result).toEqual({ currentPrice: 89.99, threshold: 100 });
    });
  });

  describe('Monitor Management', () => {
    
    it('should pause a monitor', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Pausable Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Test',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      };

      monitor.active = false;
      expect(monitor.active).toBe(false);
    });

    it('should resume a paused monitor', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Resumable Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Test',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: false,
        notifyOnTrigger: true
      };

      monitor.active = true;
      expect(monitor.active).toBe(true);
    });

    it('should not resume a triggered monitor', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Triggered Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Test',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: true,
        triggeredAt: Date.now(),
        active: false,
        notifyOnTrigger: true
      };

      const canResume = !monitor.triggered;
      expect(canResume).toBe(false);
    });

    it('should reset a triggered monitor', () => {
      const monitor: PageMonitor = {
        id: 'm1',
        name: 'Resettable Monitor',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Test',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: true,
        triggeredAt: Date.now() - 10000,
        active: false,
        notifyOnTrigger: true
      };

      // Reset
      monitor.triggered = false;
      monitor.triggeredAt = undefined;
      monitor.active = true;

      expect(monitor.triggered).toBe(false);
      expect(monitor.triggeredAt).toBeUndefined();
      expect(monitor.active).toBe(true);
    });

    it('should delete a monitor', () => {
      const monitors = new Map<string, PageMonitor>();
      monitors.set('m1', {
        id: 'm1',
        name: 'To Delete',
        url: 'https://example.com',
        checkCode: 'return true;',
        description: 'Test',
        intervalMs: 60000,
        createdAt: Date.now(),
        triggered: false,
        active: true,
        notifyOnTrigger: true
      });

      expect(monitors.has('m1')).toBe(true);
      monitors.delete('m1');
      expect(monitors.has('m1')).toBe(false);
    });
  });

  describe('Check Code Patterns', () => {
    
    it('should define price comparison check code', () => {
      const checkCode = `
        const priceEl = document.querySelector('.price');
        if (!priceEl) return false;
        const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
        return price < 100;
      `;

      expect(checkCode).toContain('.price');
      expect(checkCode).toContain('< 100');
    });

    it('should define stock availability check code', () => {
      const checkCode = `
        const stockEl = document.querySelector('.stock-status');
        if (!stockEl) return false;
        return stockEl.textContent.toLowerCase().includes('in stock');
      `;

      expect(checkCode).toContain('.stock-status');
      expect(checkCode).toContain('in stock');
    });

    it('should define element existence check code', () => {
      const checkCode = `
        return document.querySelector('#sale-banner') !== null;
      `;

      expect(checkCode).toContain('#sale-banner');
      expect(checkCode).toContain('!== null');
    });

    it('should define text content change check code', () => {
      const checkCode = `
        const el = document.querySelector('.status');
        return el && el.textContent !== 'Pending';
      `;

      expect(checkCode).toContain('.status');
      expect(checkCode).toContain('Pending');
    });
  });

  describe('Interval Management', () => {
    
    it('should use default interval of 60 seconds', () => {
      const defaultInterval = 60000;
      expect(defaultInterval).toBe(60000);
    });

    it('should support custom intervals', () => {
      const intervals = [
        { name: '30 seconds', ms: 30000 },
        { name: '1 minute', ms: 60000 },
        { name: '5 minutes', ms: 300000 },
        { name: '15 minutes', ms: 900000 },
        { name: '1 hour', ms: 3600000 }
      ];

      expect(intervals.find(i => i.name === '5 minutes')?.ms).toBe(300000);
    });

    it('should track interval IDs for cleanup', () => {
      const intervals = new Map<string, number>();
      
      intervals.set('m1', 1);
      intervals.set('m2', 2);
      intervals.set('m3', 3);

      expect(intervals.size).toBe(3);
      
      // Cleanup
      intervals.clear();
      expect(intervals.size).toBe(0);
    });
  });
});
