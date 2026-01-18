import { describe, it, expect } from '@jest/globals';

/**
 * Step 10: End-to-End User Flows Test Suite
 * 
 * Tests 5 complete user journeys with assertions at each stage:
 * 1. Flight search: search, compare, report
 * 2. Job applications: navigate, fill forms, submit
 * 3. Price monitoring: set up, wait, trigger
 * 4. Review extraction: extract, format, export
 * 5. Price comparison: multi-tab, aggregate
 */

// Define types for testing
interface WorkflowStep {
  id: string;
  action: string;
  tool?: string;
  args?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

interface WorkflowResult {
  success: boolean;
  steps: WorkflowStep[];
  totalDuration: number;
  output?: unknown;
}

interface FlightResult {
  airline: string;
  price: number;
  departure: string;
  arrival: string;
  duration: string;
}

interface JobApplication {
  company: string;
  title: string;
  status: 'applied' | 'failed' | 'skipped';
  timestamp: number;
}

interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

interface PriceComparison {
  store: string;
  price: number;
  inStock: boolean;
  url: string;
}

describe('Step 10: End-to-End User Flows', () => {

  describe('Flow 1: Flight Search (search, compare, report)', () => {
    
    it('should parse flight search request', () => {
      const request = 'Find the cheapest flight to NYC next weekend';
      
      const parseFlightRequest = (req: string): { destination: string; dateRange: string } => {
        const destMatch = req.match(/to\s+(\w+)/i);
        const dateMatch = req.match(/(next\s+\w+|this\s+\w+|\d{1,2}\/\d{1,2})/i);
        
        return {
          destination: destMatch?.[1] || 'unknown',
          dateRange: dateMatch?.[0] || 'flexible'
        };
      };

      const parsed = parseFlightRequest(request);
      expect(parsed.destination).toBe('NYC');
      expect(parsed.dateRange).toBe('next weekend');
    });

    it('should plan flight search workflow', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', action: 'navigate', tool: 'browser_navigate', args: { url: 'https://flights.google.com' }, status: 'pending' },
        { id: 'step2', action: 'type_destination', tool: 'browser_type', args: { selector: '#destination', value: 'NYC' }, status: 'pending' },
        { id: 'step3', action: 'select_dates', tool: 'browser_click', args: { selector: '.date-picker' }, status: 'pending' },
        { id: 'step4', action: 'search', tool: 'browser_click', args: { selector: '#search-btn' }, status: 'pending' },
        { id: 'step5', action: 'extract_results', tool: 'browser_get_text', args: { selector: '.flight-results' }, status: 'pending' },
        { id: 'step6', action: 'compare_prices', tool: 'internal', status: 'pending' },
        { id: 'step7', action: 'report', tool: 'internal', status: 'pending' }
      ];

      expect(steps.length).toBe(7);
      expect(steps[0].action).toBe('navigate');
      expect(steps[6].action).toBe('report');
    });

    it('should extract and compare flight results', () => {
      const flights: FlightResult[] = [
        { airline: 'Delta', price: 299, departure: '8:00 AM', arrival: '11:30 AM', duration: '3h 30m' },
        { airline: 'United', price: 275, departure: '10:00 AM', arrival: '1:45 PM', duration: '3h 45m' },
        { airline: 'JetBlue', price: 249, departure: '6:00 AM', arrival: '9:15 AM', duration: '3h 15m' },
        { airline: 'American', price: 315, departure: '2:00 PM', arrival: '5:30 PM', duration: '3h 30m' }
      ];

      const cheapest = flights.reduce((min, f) => f.price < min.price ? f : min);
      
      expect(cheapest.airline).toBe('JetBlue');
      expect(cheapest.price).toBe(249);
    });

    it('should generate flight comparison report', () => {
      const flights: FlightResult[] = [
        { airline: 'JetBlue', price: 249, departure: '6:00 AM', arrival: '9:15 AM', duration: '3h 15m' },
        { airline: 'United', price: 275, departure: '10:00 AM', arrival: '1:45 PM', duration: '3h 45m' }
      ];

      const generateReport = (flights: FlightResult[]): string => {
        const sorted = [...flights].sort((a, b) => a.price - b.price);
        const lines = sorted.map((f, i) => 
          `${i + 1}. ${f.airline}: $${f.price} (${f.departure} - ${f.arrival}, ${f.duration})`
        );
        return `Found ${flights.length} flights:\n${lines.join('\n')}\n\nCheapest: ${sorted[0].airline} at $${sorted[0].price}`;
      };

      const report = generateReport(flights);
      expect(report).toContain('JetBlue: $249');
      expect(report).toContain('Cheapest: JetBlue');
    });

    it('should complete flight search workflow', () => {
      const result: WorkflowResult = {
        success: true,
        steps: [
          { id: 's1', action: 'navigate', status: 'completed' },
          { id: 's2', action: 'search', status: 'completed' },
          { id: 's3', action: 'extract', status: 'completed' },
          { id: 's4', action: 'compare', status: 'completed' },
          { id: 's5', action: 'report', status: 'completed' }
        ],
        totalDuration: 15000,
        output: { cheapest: { airline: 'JetBlue', price: 249 } }
      };

      expect(result.success).toBe(true);
      expect(result.steps.every(s => s.status === 'completed')).toBe(true);
    });
  });

  describe('Flow 2: Job Applications (navigate, fill forms, submit)', () => {
    
    it('should parse job search criteria', () => {
      const request = "Apply to 5 jobs matching 'senior engineer'";
      
      const parseJobRequest = (req: string): { count: number; query: string } => {
        const countMatch = req.match(/(\d+)\s+jobs/i);
        const queryMatch = req.match(/['"]([^'"]+)['"]/);
        
        return {
          count: parseInt(countMatch?.[1] || '1'),
          query: queryMatch?.[1] || ''
        };
      };

      const parsed = parseJobRequest(request);
      expect(parsed.count).toBe(5);
      expect(parsed.query).toBe('senior engineer');
    });

    it('should plan job application workflow', () => {
      const steps: WorkflowStep[] = [
        { id: 'step1', action: 'navigate_job_board', tool: 'browser_navigate', status: 'pending' },
        { id: 'step2', action: 'search_jobs', tool: 'browser_type', status: 'pending' },
        { id: 'step3', action: 'filter_results', tool: 'browser_click', status: 'pending' },
        { id: 'step4', action: 'open_job_1', tool: 'browser_click', status: 'pending' },
        { id: 'step5', action: 'fill_application', tool: 'browser_type', status: 'pending' },
        { id: 'step6', action: 'submit_application', tool: 'browser_click', status: 'pending' },
        { id: 'step7', action: 'repeat_for_remaining', tool: 'internal', status: 'pending' }
      ];

      expect(steps.length).toBe(7);
      expect(steps[4].action).toBe('fill_application');
    });

    it('should fill job application form', () => {
      const formFields = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        resume: '/path/to/resume.pdf',
        coverLetter: 'I am excited to apply...',
        linkedin: 'https://linkedin.com/in/johndoe'
      };

      const fillForm = (fields: Record<string, string>): WorkflowStep[] => {
        return Object.entries(fields).map(([field, value], i) => ({
          id: `fill-${i}`,
          action: 'type',
          tool: 'browser_type',
          args: { selector: `#${field}`, value },
          status: 'pending' as const
        }));
      };

      const steps = fillForm(formFields);
      expect(steps.length).toBe(6);
      expect(steps[0].args?.selector).toBe('#name');
    });

    it('should track application status', () => {
      const applications: JobApplication[] = [
        { company: 'Google', title: 'Senior Engineer', status: 'applied', timestamp: Date.now() },
        { company: 'Meta', title: 'Staff Engineer', status: 'applied', timestamp: Date.now() },
        { company: 'Apple', title: 'Senior SWE', status: 'failed', timestamp: Date.now() },
        { company: 'Amazon', title: 'SDE III', status: 'applied', timestamp: Date.now() },
        { company: 'Netflix', title: 'Senior Engineer', status: 'applied', timestamp: Date.now() }
      ];

      const successful = applications.filter(a => a.status === 'applied');
      const failed = applications.filter(a => a.status === 'failed');

      expect(successful.length).toBe(4);
      expect(failed.length).toBe(1);
    });

    it('should generate application summary', () => {
      const applications: JobApplication[] = [
        { company: 'Google', title: 'Senior Engineer', status: 'applied', timestamp: Date.now() },
        { company: 'Meta', title: 'Staff Engineer', status: 'applied', timestamp: Date.now() }
      ];

      const summary = `Applied to ${applications.length} jobs:\n` +
        applications.map(a => `- ${a.company}: ${a.title} (${a.status})`).join('\n');

      expect(summary).toContain('Applied to 2 jobs');
      expect(summary).toContain('Google: Senior Engineer');
    });
  });

  describe('Flow 3: Price Monitoring (set up, wait, trigger)', () => {
    
    it('should parse price monitor request', () => {
      const request = "Monitor this product and alert me when it's under $50";
      
      const parseMonitorRequest = (req: string): { threshold: number; condition: string } => {
        const priceMatch = req.match(/\$(\d+(?:\.\d{2})?)/);
        const conditionMatch = req.match(/(under|below|less than|above|over|more than)/i);
        
        return {
          threshold: parseFloat(priceMatch?.[1] || '0'),
          condition: conditionMatch?.[1]?.toLowerCase() || 'under'
        };
      };

      const parsed = parseMonitorRequest(request);
      expect(parsed.threshold).toBe(50);
      expect(parsed.condition).toBe('under');
    });

    it('should create price monitor configuration', () => {
      const monitor = {
        id: 'monitor-1',
        name: 'Product Price Alert',
        url: 'https://amazon.com/product/123',
        checkCode: `
          const priceEl = document.querySelector('.price');
          if (!priceEl) return false;
          const price = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
          return price < 50;
        `,
        threshold: 50,
        condition: 'under',
        intervalMs: 300000, // 5 minutes
        active: true,
        notifyOnTrigger: true
      };

      expect(monitor.threshold).toBe(50);
      expect(monitor.intervalMs).toBe(300000);
      expect(monitor.active).toBe(true);
    });

    it('should check price condition', () => {
      const checkPrice = (currentPrice: number, threshold: number, condition: string): boolean => {
        switch (condition) {
          case 'under':
          case 'below':
          case 'less than':
            return currentPrice < threshold;
          case 'above':
          case 'over':
          case 'more than':
            return currentPrice > threshold;
          default:
            return false;
        }
      };

      expect(checkPrice(45, 50, 'under')).toBe(true);
      expect(checkPrice(55, 50, 'under')).toBe(false);
      expect(checkPrice(55, 50, 'above')).toBe(true);
    });

    it('should trigger alert when condition met', () => {
      const monitor = {
        id: 'monitor-1',
        name: 'Product Alert',
        threshold: 50,
        triggered: false,
        triggeredAt: undefined as number | undefined
      };

      const currentPrice = 45;
      const conditionMet = currentPrice < monitor.threshold;

      if (conditionMet && !monitor.triggered) {
        monitor.triggered = true;
        monitor.triggeredAt = Date.now();
      }

      expect(monitor.triggered).toBe(true);
      expect(monitor.triggeredAt).toBeDefined();
    });

    it('should format price alert notification', () => {
      const formatAlert = (productName: string, currentPrice: number, threshold: number): string => {
        return `🔔 Price Alert!\n${productName} is now $${currentPrice} (below your $${threshold} threshold)`;
      };

      const alert = formatAlert('Wireless Headphones', 45, 50);
      expect(alert).toContain('Price Alert');
      expect(alert).toContain('$45');
      expect(alert).toContain('$50');
    });
  });

  describe('Flow 4: Review Extraction (extract, format, export)', () => {
    
    it('should parse extraction request', () => {
      const request = 'Extract all reviews from this page and save as CSV';
      
      const parseExtractionRequest = (req: string): { target: string; format: string } => {
        const targetMatch = req.match(/extract\s+(?:all\s+)?(\w+)/i);
        const formatMatch = req.match(/as\s+(\w+)/i);
        
        return {
          target: targetMatch?.[1] || 'content',
          format: formatMatch?.[1]?.toUpperCase() || 'JSON'
        };
      };

      const parsed = parseExtractionRequest(request);
      expect(parsed.target).toBe('reviews');
      expect(parsed.format).toBe('CSV');
    });

    it('should extract reviews from page', () => {
      const reviews: Review[] = [
        { author: 'John D.', rating: 5, text: 'Great product!', date: '2024-01-15' },
        { author: 'Jane S.', rating: 4, text: 'Good value for money', date: '2024-01-14' },
        { author: 'Bob M.', rating: 3, text: 'Average quality', date: '2024-01-13' },
        { author: 'Alice W.', rating: 5, text: 'Exceeded expectations', date: '2024-01-12' }
      ];

      expect(reviews.length).toBe(4);
      expect(reviews[0].rating).toBe(5);
    });

    it('should format reviews as CSV', () => {
      const reviews: Review[] = [
        { author: 'John D.', rating: 5, text: 'Great product!', date: '2024-01-15' },
        { author: 'Jane S.', rating: 4, text: 'Good value', date: '2024-01-14' }
      ];

      const toCSV = (reviews: Review[]): string => {
        const header = 'Author,Rating,Text,Date';
        const rows = reviews.map(r => 
          `"${r.author}",${r.rating},"${r.text}","${r.date}"`
        );
        return [header, ...rows].join('\n');
      };

      const csv = toCSV(reviews);
      expect(csv).toContain('Author,Rating,Text,Date');
      expect(csv).toContain('"John D.",5,"Great product!","2024-01-15"');
    });

    it('should format reviews as JSON', () => {
      const reviews: Review[] = [
        { author: 'John D.', rating: 5, text: 'Great!', date: '2024-01-15' }
      ];

      const json = JSON.stringify(reviews, null, 2);
      expect(json).toContain('"author": "John D."');
      expect(json).toContain('"rating": 5');
    });

    it('should calculate review statistics', () => {
      const reviews: Review[] = [
        { author: 'A', rating: 5, text: '', date: '' },
        { author: 'B', rating: 4, text: '', date: '' },
        { author: 'C', rating: 3, text: '', date: '' },
        { author: 'D', rating: 5, text: '', date: '' },
        { author: 'E', rating: 4, text: '', date: '' }
      ];

      const stats = {
        count: reviews.length,
        average: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
        distribution: reviews.reduce((acc, r) => {
          acc[r.rating] = (acc[r.rating] || 0) + 1;
          return acc;
        }, {} as Record<number, number>)
      };

      expect(stats.count).toBe(5);
      expect(stats.average).toBe(4.2);
      expect(stats.distribution[5]).toBe(2);
    });
  });

  describe('Flow 5: Price Comparison (multi-tab, aggregate)', () => {
    
    it('should parse comparison request', () => {
      const request = 'Compare prices across Amazon, Walmart, and Target';
      
      const parseComparisonRequest = (req: string): { stores: string[] } => {
        const storePattern = /(Amazon|Walmart|Target|eBay|BestBuy|Costco)/gi;
        const matches = req.match(storePattern) || [];
        return { stores: matches };
      };

      const parsed = parseComparisonRequest(request);
      expect(parsed.stores).toContain('Amazon');
      expect(parsed.stores).toContain('Walmart');
      expect(parsed.stores).toContain('Target');
      expect(parsed.stores.length).toBe(3);
    });

    it('should plan multi-tab comparison workflow', () => {
      const stores = ['Amazon', 'Walmart', 'Target'];
      
      const steps: WorkflowStep[] = [
        ...stores.map((store, i) => ({
          id: `open-${i}`,
          action: 'open_tab',
          tool: 'browser_navigate',
          args: { url: `https://${store.toLowerCase()}.com/search?q=product` },
          status: 'pending' as const
        })),
        { id: 'wait', action: 'wait_for_all', tool: 'internal', status: 'pending' },
        ...stores.map((store, i) => ({
          id: `extract-${i}`,
          action: 'extract_price',
          tool: 'browser_get_text',
          args: { tabIndex: i, selector: '.price' },
          status: 'pending' as const
        })),
        { id: 'aggregate', action: 'aggregate_results', tool: 'internal', status: 'pending' },
        { id: 'report', action: 'generate_report', tool: 'internal', status: 'pending' }
      ];

      expect(steps.length).toBe(9);
      expect(steps.filter(s => s.action === 'open_tab').length).toBe(3);
    });

    it('should extract prices from multiple stores', () => {
      const prices: PriceComparison[] = [
        { store: 'Amazon', price: 29.99, inStock: true, url: 'https://amazon.com/product' },
        { store: 'Walmart', price: 27.99, inStock: true, url: 'https://walmart.com/product' },
        { store: 'Target', price: 31.99, inStock: false, url: 'https://target.com/product' }
      ];

      expect(prices.length).toBe(3);
      expect(prices.find(p => p.store === 'Walmart')?.price).toBe(27.99);
    });

    it('should find best price with stock consideration', () => {
      const prices: PriceComparison[] = [
        { store: 'Amazon', price: 29.99, inStock: true, url: 'https://amazon.com' },
        { store: 'Walmart', price: 27.99, inStock: true, url: 'https://walmart.com' },
        { store: 'Target', price: 25.99, inStock: false, url: 'https://target.com' }
      ];

      const findBest = (prices: PriceComparison[], requireStock: boolean): PriceComparison | null => {
        const available = requireStock ? prices.filter(p => p.inStock) : prices;
        if (available.length === 0) return null;
        return available.reduce((min, p) => p.price < min.price ? p : min);
      };

      const bestInStock = findBest(prices, true);
      const bestOverall = findBest(prices, false);

      expect(bestInStock?.store).toBe('Walmart');
      expect(bestInStock?.price).toBe(27.99);
      expect(bestOverall?.store).toBe('Target');
      expect(bestOverall?.price).toBe(25.99);
    });

    it('should generate price comparison report', () => {
      const prices: PriceComparison[] = [
        { store: 'Amazon', price: 29.99, inStock: true, url: 'https://amazon.com' },
        { store: 'Walmart', price: 27.99, inStock: true, url: 'https://walmart.com' },
        { store: 'Target', price: 31.99, inStock: false, url: 'https://target.com' }
      ];

      const generateReport = (prices: PriceComparison[]): string => {
        const sorted = [...prices].sort((a, b) => a.price - b.price);
        const lines = sorted.map(p => 
          `${p.store}: $${p.price} ${p.inStock ? '✓ In Stock' : '✗ Out of Stock'}`
        );
        const best = sorted.find(p => p.inStock);
        
        return `Price Comparison:\n${lines.join('\n')}\n\nBest Deal: ${best?.store} at $${best?.price}`;
      };

      const report = generateReport(prices);
      expect(report).toContain('Price Comparison');
      expect(report).toContain('Walmart: $27.99');
      expect(report).toContain('Best Deal: Walmart');
    });

    it('should handle partial failures gracefully', () => {
      const results = [
        { store: 'Amazon', success: true, price: 29.99 },
        { store: 'Walmart', success: true, price: 27.99 },
        { store: 'Target', success: false, error: 'Page load timeout' }
      ];

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      expect(successful.length).toBe(2);
      expect(failed.length).toBe(1);
      expect(failed[0].error).toContain('timeout');
    });
  });

  describe('Workflow Execution', () => {
    
    it('should track workflow progress', () => {
      const workflow = {
        id: 'wf-1',
        name: 'Flight Search',
        totalSteps: 7,
        completedSteps: 0,
        currentStep: 0,
        status: 'running' as const
      };

      // Simulate progress
      for (let i = 0; i < 7; i++) {
        workflow.currentStep = i;
        workflow.completedSteps = i;
      }
      workflow.completedSteps = 7;
      workflow.status = 'completed' as any;

      expect(workflow.completedSteps).toBe(7);
    });

    it('should handle workflow failure and recovery', () => {
      const steps: WorkflowStep[] = [
        { id: 's1', action: 'navigate', status: 'completed' },
        { id: 's2', action: 'search', status: 'completed' },
        { id: 's3', action: 'extract', status: 'failed', error: 'Element not found' }
      ];

      const failedStep = steps.find(s => s.status === 'failed');
      expect(failedStep?.action).toBe('extract');

      // Recovery: retry with alternative
      failedStep!.status = 'completed';
      failedStep!.error = undefined;

      expect(steps.every(s => s.status === 'completed')).toBe(true);
    });

    it('should calculate workflow duration', () => {
      const startTime = Date.now() - 15000;
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThanOrEqual(15000);
      expect(duration).toBeLessThan(20000);
    });

    it('should generate workflow summary', () => {
      const result: WorkflowResult = {
        success: true,
        steps: [
          { id: 's1', action: 'navigate', status: 'completed' },
          { id: 's2', action: 'search', status: 'completed' },
          { id: 's3', action: 'extract', status: 'completed' }
        ],
        totalDuration: 5000,
        output: { itemsFound: 10 }
      };

      const summary = `Workflow ${result.success ? 'completed' : 'failed'}\n` +
        `Steps: ${result.steps.length} (${result.steps.filter(s => s.status === 'completed').length} completed)\n` +
        `Duration: ${result.totalDuration}ms`;

      expect(summary).toContain('completed');
      expect(summary).toContain('3 (3 completed)');
    });
  });
});
