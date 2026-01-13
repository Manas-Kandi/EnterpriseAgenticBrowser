import { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Check, AlertCircle, Loader2, RefreshCw, Zap, Cloud, Server, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrowserStore, LLMProvider, LLM_PROVIDER_PRESETS } from '@/lib/store';

type ModelInfo = { id: string; name: string; supportsThinking?: boolean };
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { llmSettings, setLlmSettings } = useBrowserStore();

  const [provider, setProvider] = useState<LLMProvider>(llmSettings.provider);
  const [baseUrl, setBaseUrl] = useState<string>(llmSettings.baseUrl);
  const [model, setModel] = useState<string>(llmSettings.model);
  const [apiKeyAccount, setApiKeyAccount] = useState<string>(llmSettings.apiKeyAccount);
  const [apiKey, setApiKey] = useState<string>('');
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [storedApiKey, setStoredApiKey] = useState<string | null>(null);
  const [nvidiaModels, setNvidiaModels] = useState<ModelInfo[]>([]);
  const [remoteModels, setRemoteModels] = useState<ModelInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string>('');
  const [connectionResponse, setConnectionResponse] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentPreset = useMemo(() => 
    LLM_PROVIDER_PRESETS.find(p => p.id === provider), 
    [provider]
  );

  const requiresApiKey = currentPreset?.requiresApiKey ?? false;
  const isLocalProvider = provider === 'ollama' || provider === 'lmstudio';

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return;
    setProvider(llmSettings.provider);
    setBaseUrl(llmSettings.baseUrl);
    setModel(llmSettings.model);
    setApiKeyAccount(llmSettings.apiKeyAccount);
    setApiKey('');
    setConnectionStatus('idle');
    setConnectionError('');
    setConnectionResponse('');
  }, [open, llmSettings]);

  // Load NVIDIA models
  useEffect(() => {
    if (!open || !window.agent) return;
    window.agent.getModels().then(setNvidiaModels).catch(() => setNvidiaModels([]));
  }, [open]);

  // Check if API key exists in vault
  useEffect(() => {
    if (!open || !window.vault) return;
    window.vault
      .get(apiKeyAccount)
      .then((v) => {
        setHasKey(Boolean(v));
        setStoredApiKey(v);
      })
      .catch(() => {
        setHasKey(false);
        setStoredApiKey(null);
      });
  }, [open, apiKeyAccount]);

  // Handle provider change
  const handleProviderChange = useCallback((newProvider: LLMProvider) => {
    const preset = LLM_PROVIDER_PRESETS.find(p => p.id === newProvider);
    if (!preset) return;

    setProvider(newProvider);
    setBaseUrl(preset.baseUrl);
    setModel(preset.defaultModel);
    setApiKeyAccount(`llm:${newProvider}:apiKey`);
    setConnectionStatus('idle');
    setConnectionError('');
    setRemoteModels([]);
  }, []);

  // Fetch remote models
  const fetchRemoteModels = useCallback(async () => {
    if (!window.agent?.listRemoteModels) return;
    const effectiveKey = apiKey.trim() || storedApiKey || undefined;
    try {
      const result = await window.agent.listRemoteModels({ baseUrl, apiKey: effectiveKey });
      if (result.success && result.models) {
        setRemoteModels(result.models);
      }
    } catch {
      // Ignore errors
    }
  }, [baseUrl, apiKey, storedApiKey]);

  // Test connection
  const testConnection = useCallback(async () => {
    if (!window.agent?.testConnection) return;
    
    setConnectionStatus('testing');
    setConnectionError('');
    setConnectionResponse('');

    const effectiveKey = apiKey.trim() || storedApiKey || undefined;

    try {
      const result = await window.agent.testConnection({
        baseUrl,
        apiKey: effectiveKey,
        model,
      });

      if (result.success) {
        setConnectionStatus('success');
        setConnectionResponse(result.response || 'Connected successfully');
      } else {
        setConnectionStatus('error');
        setConnectionError(result.error || 'Connection failed');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionError(err.message || 'Connection failed');
    }
  }, [baseUrl, apiKey, storedApiKey, model]);

  // Get model options based on provider
  const modelOptions = useMemo(() => {
    if (provider === 'nvidia') {
      return nvidiaModels;
    }
    if (remoteModels.length > 0) {
      return remoteModels;
    }
    if (currentPreset?.models) {
      return currentPreset.models.map(m => ({ id: m, name: m }));
    }
    return [];
  }, [provider, nvidiaModels, remoteModels, currentPreset]);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setLlmSettings({ provider, baseUrl, model, apiKeyAccount });

      if (apiKey.trim() && window.vault) {
        await window.vault.set(apiKeyAccount, apiKey.trim());
        setApiKey('');
        setHasKey(true);
      }

      if (window.agent?.setLlmConfig) {
        await window.agent.setLlmConfig({
          provider,
          baseUrl,
          apiKeyAccount,
          modelId: model,
        });
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  const onDeleteKey = async () => {
    if (!window.vault) return;
    await window.vault.delete(apiKeyAccount).catch(() => undefined);
    setHasKey(false);
    setStoredApiKey(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-xl border border-border/60 bg-background shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <span className="text-sm font-medium">LLM Settings</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {/* Provider Selection */}
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Provider</div>
              <div className="grid grid-cols-3 gap-2">
                {LLM_PROVIDER_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleProviderChange(preset.id)}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border text-left transition-all',
                      provider === preset.id
                        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/40 bg-secondary/10 hover:bg-secondary/20 hover:border-border/60'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {preset.requiresApiKey ? (
                        <Cloud size={12} className="text-muted-foreground" />
                      ) : (
                        <Server size={12} className="text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium">{preset.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.description}</span>
                  </button>
                ))}
              </div>
              
              {/* More providers dropdown */}
              <div className="flex gap-2">
                {LLM_PROVIDER_PRESETS.slice(6).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleProviderChange(preset.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-all',
                      provider === preset.id
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/40 bg-secondary/10 hover:bg-secondary/20'
                    )}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Base URL</div>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full h-9 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Model</div>
                {!isLocalProvider && (
                  <button
                    onClick={fetchRemoteModels}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw size={10} />
                    Fetch models
                  </button>
                )}
              </div>
              {modelOptions.length > 0 ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  {modelOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Model name (e.g., gpt-4o, llama3.2)"
                  className="w-full h-9 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              )}
            </div>

            {/* API Key */}
            {requiresApiKey && (
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">API Key</div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={hasKey ? '••••••••••••••••' : 'Enter your API key'}
                      className="w-full h-9 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    {hasKey && !apiKey && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Check size={12} className="text-green-500" />
                      </div>
                    )}
                  </div>
                  {hasKey && (
                    <button
                      onClick={onDeleteKey}
                      className="h-9 px-3 text-xs rounded-md border border-border/40 bg-secondary/20 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {hasKey ? (
                    <span className="text-green-500/80">Key stored securely in system keychain</span>
                  ) : (
                    'Key will be stored securely in your system keychain'
                  )}
                </div>
              </div>
            )}

            {/* Connection Test */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing' || !model || !baseUrl}
                  className={cn(
                    'flex items-center gap-2 h-9 px-4 text-xs rounded-md border transition-all',
                    connectionStatus === 'testing' && 'opacity-60 cursor-not-allowed',
                    connectionStatus === 'success' && 'border-green-500/30 bg-green-500/10 text-green-500',
                    connectionStatus === 'error' && 'border-red-500/30 bg-red-500/10 text-red-500',
                    connectionStatus === 'idle' && 'border-border/40 bg-secondary/20 hover:bg-secondary/30'
                  )}
                >
                  {connectionStatus === 'testing' ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : connectionStatus === 'success' ? (
                    <Check size={12} />
                  ) : connectionStatus === 'error' ? (
                    <AlertCircle size={12} />
                  ) : (
                    <Zap size={12} />
                  )}
                  {connectionStatus === 'testing' ? 'Testing...' : 
                   connectionStatus === 'success' ? 'Connected' :
                   connectionStatus === 'error' ? 'Failed' : 'Test Connection'}
                </button>
              </div>
              {connectionStatus === 'error' && connectionError && (
                <div className="text-[10px] text-red-500 bg-red-500/10 rounded-md px-3 py-2 border border-red-500/20">
                  {connectionError}
                </div>
              )}
              {connectionStatus === 'success' && connectionResponse && (
                <div className="text-[10px] text-green-500 bg-green-500/10 rounded-md px-3 py-2 border border-green-500/20">
                  Response: "{connectionResponse}"
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="border-t border-border/30 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown size={12} className={cn('transition-transform', showAdvanced && 'rotate-180')} />
                Advanced Settings
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">API Key Account (Keychain ID)</div>
                    <input
                      value={apiKeyAccount}
                      onChange={(e) => setApiKeyAccount(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
                    />
                    <div className="text-[10px] text-muted-foreground">
                      Identifier used to store the API key in your system keychain
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border/50 bg-secondary/5">
            <div className="text-[10px] text-muted-foreground">
              {currentPreset && (
                <span>Using {currentPreset.name}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="h-9 px-4 text-xs rounded-md bg-secondary/20 hover:bg-secondary/30 border border-border/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className={cn(
                  'h-9 px-4 text-xs rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors',
                  saving && 'opacity-60 cursor-not-allowed'
                )}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
