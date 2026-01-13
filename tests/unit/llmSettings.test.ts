/**
 * Unit Tests for LLM Settings
 * 
 * Tests the LLM provider configuration, presets, and store functionality.
 */

import { LLM_PROVIDER_PRESETS, LLMProvider } from '../../src/lib/store';

describe('LLM Provider Presets', () => {
  describe('Preset Configuration', () => {
    it('should have all required providers', () => {
      const providerIds = LLM_PROVIDER_PRESETS.map(p => p.id);
      
      expect(providerIds).toContain('nvidia');
      expect(providerIds).toContain('openai');
      expect(providerIds).toContain('anthropic');
      expect(providerIds).toContain('groq');
      expect(providerIds).toContain('together');
      expect(providerIds).toContain('openrouter');
      expect(providerIds).toContain('ollama');
      expect(providerIds).toContain('lmstudio');
      expect(providerIds).toContain('custom');
    });

    it('should have valid base URLs for cloud providers', () => {
      const cloudProviders = LLM_PROVIDER_PRESETS.filter(p => p.requiresApiKey);
      
      for (const provider of cloudProviders) {
        expect(provider.baseUrl).toMatch(/^https:\/\//);
        expect(provider.baseUrl).toContain('/v1');
      }
    });

    it('should have localhost URLs for local providers', () => {
      const localProviders = LLM_PROVIDER_PRESETS.filter(
        p => p.id === 'ollama' || p.id === 'lmstudio'
      );
      
      for (const provider of localProviders) {
        expect(provider.baseUrl).toMatch(/^http:\/\/localhost/);
        expect(provider.requiresApiKey).toBe(false);
      }
    });

    it('should have default models for all providers except custom', () => {
      const nonCustomProviders = LLM_PROVIDER_PRESETS.filter(p => p.id !== 'custom');
      
      for (const provider of nonCustomProviders) {
        expect(provider.defaultModel).toBeTruthy();
        expect(provider.defaultModel.length).toBeGreaterThan(0);
      }
    });

    it('should have descriptions for all providers', () => {
      for (const provider of LLM_PROVIDER_PRESETS) {
        expect(provider.description).toBeTruthy();
        expect(provider.description.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Provider-specific Configuration', () => {
    it('should have correct NVIDIA configuration', () => {
      const nvidia = LLM_PROVIDER_PRESETS.find(p => p.id === 'nvidia');
      
      expect(nvidia).toBeDefined();
      expect(nvidia!.baseUrl).toBe('https://integrate.api.nvidia.com/v1');
      expect(nvidia!.requiresApiKey).toBe(true);
      expect(nvidia!.defaultModel).toContain('llama');
    });

    it('should have correct OpenAI configuration', () => {
      const openai = LLM_PROVIDER_PRESETS.find(p => p.id === 'openai');
      
      expect(openai).toBeDefined();
      expect(openai!.baseUrl).toBe('https://api.openai.com/v1');
      expect(openai!.requiresApiKey).toBe(true);
      expect(openai!.models).toBeDefined();
      expect(openai!.models).toContain('gpt-4o');
      expect(openai!.models).toContain('gpt-4o-mini');
    });

    it('should have correct Anthropic configuration', () => {
      const anthropic = LLM_PROVIDER_PRESETS.find(p => p.id === 'anthropic');
      
      expect(anthropic).toBeDefined();
      expect(anthropic!.baseUrl).toBe('https://api.anthropic.com/v1');
      expect(anthropic!.requiresApiKey).toBe(true);
      expect(anthropic!.models).toBeDefined();
      expect(anthropic!.models!.some(m => m.includes('claude'))).toBe(true);
    });

    it('should have correct Groq configuration', () => {
      const groq = LLM_PROVIDER_PRESETS.find(p => p.id === 'groq');
      
      expect(groq).toBeDefined();
      expect(groq!.baseUrl).toBe('https://api.groq.com/openai/v1');
      expect(groq!.requiresApiKey).toBe(true);
      expect(groq!.models).toBeDefined();
    });

    it('should have correct Ollama configuration', () => {
      const ollama = LLM_PROVIDER_PRESETS.find(p => p.id === 'ollama');
      
      expect(ollama).toBeDefined();
      expect(ollama!.baseUrl).toBe('http://localhost:11434/v1');
      expect(ollama!.requiresApiKey).toBe(false);
      expect(ollama!.models).toBeDefined();
      expect(ollama!.models).toContain('llama3.2');
    });

    it('should have correct LM Studio configuration', () => {
      const lmstudio = LLM_PROVIDER_PRESETS.find(p => p.id === 'lmstudio');
      
      expect(lmstudio).toBeDefined();
      expect(lmstudio!.baseUrl).toBe('http://localhost:1234/v1');
      expect(lmstudio!.requiresApiKey).toBe(false);
    });

    it('should have correct custom provider configuration', () => {
      const custom = LLM_PROVIDER_PRESETS.find(p => p.id === 'custom');
      
      expect(custom).toBeDefined();
      expect(custom!.baseUrl).toBe('');
      expect(custom!.defaultModel).toBe('');
      expect(custom!.requiresApiKey).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should have unique provider IDs', () => {
      const ids = LLM_PROVIDER_PRESETS.map(p => p.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid LLMProvider type for all presets', () => {
      const validProviders: LLMProvider[] = [
        'nvidia', 'openai', 'anthropic', 'groq', 'together',
        'openrouter', 'ollama', 'lmstudio', 'custom'
      ];
      
      for (const preset of LLM_PROVIDER_PRESETS) {
        expect(validProviders).toContain(preset.id);
      }
    });
  });
});

describe('API Key Account Naming', () => {
  it('should generate consistent keychain account names', () => {
    const providers: LLMProvider[] = ['nvidia', 'openai', 'anthropic', 'groq'];
    
    for (const provider of providers) {
      const account = `llm:${provider}:apiKey`;
      expect(account).toMatch(/^llm:[a-z]+:apiKey$/);
    }
  });
});
