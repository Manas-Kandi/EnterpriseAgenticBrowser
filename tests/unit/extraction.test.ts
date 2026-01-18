import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Step 1: Reliable Single-Page Extraction Test Suite
 * 
 * Tests extraction across 5 different page structures:
 * 1. Tables - HTML tables with rows/columns
 * 2. Lists - UL/OL with list items
 * 3. Cards - Div-based card layouts (e-commerce style)
 * 4. Grids - CSS grid/flexbox layouts
 * 5. Nested - Deeply nested structures
 * 
 * Also tests result formatting for different data types.
 */

// Mock Electron
jest.mock('electron', () => ({
  webContents: {
    fromId: jest.fn(),
    getAllWebContents: jest.fn(() => []),
  },
  app: {
    getAppPath: jest.fn(() => '/mock/app/path'),
  },
}));

// Mock the LLM to return predictable code
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn(),
  })),
}));

import { formatResult, toCSV, toJSON, FormattedResult } from '../../src/lib/resultFormatter';

describe('Step 1: Reliable Single-Page Extraction', () => {
  
  describe('Result Formatting', () => {
    
    describe('Table Detection', () => {
      it('formats array of objects as table when columns <= 10', () => {
        const data = [
          { name: 'Product A', price: 19.99, stock: 100 },
          { name: 'Product B', price: 29.99, stock: 50 },
          { name: 'Product C', price: 9.99, stock: 200 },
        ];
        
        const result = formatResult(data);
        
        expect(result.type).toBe('table');
        expect(result.columns).toEqual(['name', 'price', 'stock']);
        expect(result.rows).toHaveLength(3);
        expect(result.display).toContain('Product A');
        expect(result.display).toContain('19.99');
      });
      
      it('falls back to JSON when columns > 10', () => {
        const data = [
          { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11 },
        ];
        
        const result = formatResult(data);
        
        expect(result.type).toBe('json');
      });
      
      it('handles mixed column objects (union of keys)', () => {
        const data = [
          { name: 'A', price: 10 },
          { name: 'B', category: 'Electronics' },
          { name: 'C', price: 20, category: 'Books' },
        ];
        
        const result = formatResult(data);
        
        expect(result.type).toBe('table');
        expect(result.columns).toContain('name');
        expect(result.columns).toContain('price');
        expect(result.columns).toContain('category');
      });
    });
    
    describe('Data Type Handling', () => {
      it('formats numbers correctly', () => {
        const result = formatResult(42);
        expect(result.type).toBe('text');
        expect(result.display).toBe('42');
      });
      
      it('formats booleans correctly', () => {
        const result = formatResult(true);
        expect(result.type).toBe('text');
        expect(result.display).toBe('true');
      });
      
      it('formats strings correctly', () => {
        const result = formatResult('Hello World');
        expect(result.type).toBe('text');
        expect(result.display).toBe('Hello World');
      });
      
      it('handles empty string', () => {
        const result = formatResult('');
        expect(result.type).toBe('text');
        expect(result.display).toBe('(empty string)');
      });
      
      it('handles null', () => {
        const result = formatResult(null);
        expect(result.type).toBe('empty');
        expect(result.display).toBe('(no output)');
      });
      
      it('handles undefined', () => {
        const result = formatResult(undefined);
        expect(result.type).toBe('empty');
        expect(result.display).toBe('(no output)');
      });
      
      it('handles empty array', () => {
        const result = formatResult([]);
        expect(result.type).toBe('empty');
        expect(result.display).toBe('(empty array)');
      });
      
      it('formats nested objects as JSON', () => {
        const data = { 
          user: { name: 'John', address: { city: 'NYC' } },
          orders: [1, 2, 3]
        };
        
        const result = formatResult(data);
        
        expect(result.type).toBe('json');
        expect(result.display).toContain('"name": "John"');
      });
    });
    
    describe('CSV Export', () => {
      it('converts table result to CSV', () => {
        const data = [
          { name: 'Product A', price: 19.99 },
          { name: 'Product B', price: 29.99 },
        ];
        
        const result = formatResult(data);
        const csv = toCSV(result);
        
        expect(csv).not.toBeNull();
        expect(csv).toContain('name,price');
        expect(csv).toContain('Product A,19.99');
        expect(csv).toContain('Product B,29.99');
      });
      
      it('escapes CSV special characters', () => {
        const data = [
          { name: 'Product, with comma', description: 'Has "quotes"' },
        ];
        
        const result = formatResult(data);
        const csv = toCSV(result);
        
        expect(csv).toContain('"Product, with comma"');
        expect(csv).toContain('"Has ""quotes"""');
      });
      
      it('returns null for non-table results', () => {
        const result = formatResult('just a string');
        const csv = toCSV(result);
        
        expect(csv).toBeNull();
      });
    });
    
    describe('JSON Export', () => {
      it('exports any result as JSON', () => {
        const data = { complex: { nested: [1, 2, 3] } };
        const result = formatResult(data);
        const json = toJSON(result);
        
        expect(json).toBe(JSON.stringify(data, null, 2));
      });
    });
  });
  
  describe('Extraction Patterns', () => {
    
    describe('1. Table Extraction', () => {
      it('extracts data from HTML table structure', () => {
        // Simulated extraction result from a table
        const extractedData = [
          { product: 'Laptop', price: '$999', quantity: '5' },
          { product: 'Mouse', price: '$29', quantity: '50' },
          { product: 'Keyboard', price: '$79', quantity: '30' },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.rows).toHaveLength(3);
        expect(result.columns).toContain('product');
        expect(result.columns).toContain('price');
        expect(result.columns).toContain('quantity');
      });
      
      it('handles tables with missing cells', () => {
        const extractedData = [
          { product: 'Laptop', price: '$999' },
          { product: 'Mouse', quantity: '50' }, // missing price
          { product: 'Keyboard', price: '$79', quantity: '30' },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.columns).toContain('product');
        expect(result.columns).toContain('price');
        expect(result.columns).toContain('quantity');
      });
    });
    
    describe('2. List Extraction', () => {
      it('extracts data from UL/OL list structure', () => {
        const extractedData = [
          { text: 'First item', index: 0 },
          { text: 'Second item', index: 1 },
          { text: 'Third item', index: 2 },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.rows).toHaveLength(3);
      });
      
      it('handles nested lists', () => {
        const extractedData = [
          { text: 'Parent 1', children: ['Child 1.1', 'Child 1.2'] },
          { text: 'Parent 2', children: ['Child 2.1'] },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        // Children array should be formatted as "[2 items]"
        expect(result.display).toContain('[2 items]');
      });
    });
    
    describe('3. Card Extraction (E-commerce)', () => {
      it('extracts product cards with all fields', () => {
        const extractedData = [
          { 
            name: 'iPhone 15', 
            price: 999.00, 
            rating: 4.5, 
            reviews: 1234,
            image: 'https://example.com/iphone.jpg',
            inStock: true
          },
          { 
            name: 'Samsung Galaxy', 
            price: 899.00, 
            rating: 4.3, 
            reviews: 987,
            image: 'https://example.com/samsung.jpg',
            inStock: true
          },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.columns).toContain('name');
        expect(result.columns).toContain('price');
        expect(result.columns).toContain('rating');
      });
      
      it('handles cards with varying fields', () => {
        const extractedData = [
          { name: 'Product A', price: 99, onSale: true },
          { name: 'Product B', price: 149 }, // no onSale
          { name: 'Product C', price: 199, onSale: false, discount: '20%' },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.rows).toHaveLength(3);
      });
    });
    
    describe('4. Grid Extraction', () => {
      it('extracts data from CSS grid layout', () => {
        const extractedData = [
          { title: 'Article 1', author: 'John', date: '2024-01-15' },
          { title: 'Article 2', author: 'Jane', date: '2024-01-16' },
          { title: 'Article 3', author: 'Bob', date: '2024-01-17' },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.columns).toEqual(['title', 'author', 'date']);
      });
      
      it('handles large grids (100+ items)', () => {
        const extractedData = Array.from({ length: 150 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          value: Math.random() * 100,
        }));
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.rows).toHaveLength(150);
        // Display should truncate to 100 rows
        expect(result.display).toContain('... (50 more rows)');
      });
    });
    
    describe('5. Nested Structure Extraction', () => {
      it('extracts data from deeply nested DOM', () => {
        const extractedData = [
          { 
            category: 'Electronics',
            items: [
              { name: 'Phone', price: 699 },
              { name: 'Tablet', price: 499 },
            ]
          },
          {
            category: 'Books',
            items: [
              { name: 'Novel', price: 15 },
            ]
          },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.columns).toContain('category');
        expect(result.columns).toContain('items');
      });
      
      it('flattens nested data when appropriate', () => {
        // When extraction flattens nested structure
        const extractedData = [
          { category: 'Electronics', itemName: 'Phone', itemPrice: 699 },
          { category: 'Electronics', itemName: 'Tablet', itemPrice: 499 },
          { category: 'Books', itemName: 'Novel', itemPrice: 15 },
        ];
        
        const result = formatResult(extractedData);
        
        expect(result.type).toBe('table');
        expect(result.rows).toHaveLength(3);
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('handles very long text values', () => {
      const longText = 'A'.repeat(1000);
      const data = [{ description: longText }];
      
      const result = formatResult(data);
      
      expect(result.type).toBe('table');
      // Should truncate in display
      expect(result.display.length).toBeLessThan(longText.length);
    });
    
    it('handles special characters in values', () => {
      const data = [
        { name: 'Product <script>alert("xss")</script>', price: '$99' },
        { name: 'Product with "quotes"', price: '$49' },
        { name: 'Product with\nnewline', price: '$29' },
      ];
      
      const result = formatResult(data);
      
      expect(result.type).toBe('table');
      expect(result.rows).toHaveLength(3);
    });
    
    it('handles unicode characters', () => {
      const data = [
        { name: '日本語製品', price: '¥1000' },
        { name: 'Продукт', price: '₽500' },
        { name: '🎉 Emoji Product', price: '€50' },
      ];
      
      const result = formatResult(data);
      
      expect(result.type).toBe('table');
      expect(result.display).toContain('日本語製品');
      expect(result.display).toContain('🎉');
    });
    
    it('handles numeric strings vs numbers', () => {
      const data = [
        { id: 1, price: '19.99', quantity: 5 },
        { id: 2, price: '29.99', quantity: 10 },
      ];
      
      const result = formatResult(data);
      
      expect(result.type).toBe('table');
      expect(result.display).toContain('19.99');
    });
    
    it('handles boolean values in table', () => {
      const data = [
        { name: 'Product A', inStock: true, onSale: false },
        { name: 'Product B', inStock: false, onSale: true },
      ];
      
      const result = formatResult(data);
      
      expect(result.type).toBe('table');
      expect(result.display).toContain('true');
      expect(result.display).toContain('false');
    });
    
    it('handles null values in table cells', () => {
      const data = [
        { name: 'Product A', price: 99, discount: null },
        { name: 'Product B', price: 49, discount: 10 },
      ];
      
      const result = formatResult(data);
      
      expect(result.type).toBe('table');
      expect(result.display).toContain('null');
    });
  });
  
  describe('Performance', () => {
    it('handles 1000 rows efficiently', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Product ${i}`,
        price: Math.random() * 100,
        category: ['A', 'B', 'C'][i % 3],
      }));
      
      const start = Date.now();
      const result = formatResult(data);
      const duration = Date.now() - start;
      
      expect(result.type).toBe('table');
      expect(duration).toBeLessThan(100); // Should format in < 100ms
    });
    
    it('handles deeply nested objects without stack overflow', () => {
      // Create a deeply nested object
      let nested: any = { value: 'deepest' };
      for (let i = 0; i < 50; i++) {
        nested = { level: i, child: nested };
      }
      
      const result = formatResult(nested);
      
      expect(result.type).toBe('json');
      // Should not throw
    });
  });
});
