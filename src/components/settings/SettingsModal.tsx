import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrowserStore, LLMProvider } from '@/lib/store';

type ModelInfo = { id: string; name: string; supportsThinking: boolean };

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { llmSettings, setLlmSettings } = useBrowserStore();

  const [provider, setProvider] = useState<LLMProvider>(llmSettings.provider);
  const [baseUrl, setBaseUrl] = useState<string>(llmSettings.baseUrl);
  const [model, setModel] = useState<string>(llmSettings.model);
  const [apiKeyAccount, setApiKeyAccount] = useState<string>(llmSettings.apiKeyAccount);
  const [apiKey, setApiKey] = useState<string>('');
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saving, setSaving] = useState(false);

  const isNvidia = provider === 'nvidia';

  useEffect(() => {
    if (!open) return;

    setProvider(llmSettings.provider);
    setBaseUrl(llmSettings.baseUrl);
    setModel(llmSettings.model);
    setApiKeyAccount(llmSettings.apiKeyAccount);
    setApiKey('');
  }, [open, llmSettings.apiKeyAccount, llmSettings.baseUrl, llmSettings.model, llmSettings.provider]);

  useEffect(() => {
    if (!open) return;
    if (!window.agent) return;

    window.agent.getModels().then(setModels).catch(() => setModels([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!window.vault) return;

    window.vault
      .get(apiKeyAccount)
      .then((v) => setHasKey(Boolean(v)))
      .catch(() => setHasKey(false));
  }, [open, apiKeyAccount]);

  const nvidiaModelOptions = useMemo(() => {
    return models.length > 0 ? models : [];
  }, [models]);

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
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-border/60 bg-background shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="text-sm font-medium">Settings</div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Provider</div>
              <select
                value={provider}
                onChange={(e) => {
                  const v = e.target.value as LLMProvider;
                  setProvider(v);
                  if (v === 'nvidia') {
                    setBaseUrl('https://integrate.api.nvidia.com/v1');
                    setModel('llama-3.1-70b');
                    setApiKeyAccount('llm:nvidia:apiKey');
                    return;
                  }
                  setBaseUrl('http://localhost:11434/v1');
                  setModel('gpt-4o-mini');
                  setApiKeyAccount('llm:openai_compatible:apiKey');
                }}
                className="w-full h-9 px-2 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring/40"
              >
                <option value="nvidia">NVIDIA (Integrate)</option>
                <option value="openai_compatible">OpenAI Compatible (Ollama/LM Studio)</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Base URL</div>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring/40"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Model</div>
              {isNvidia ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring/40"
                >
                  {nvidiaModelOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring/40"
                />
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">API Key Account</div>
              <input
                value={apiKeyAccount}
                onChange={(e) => setApiKeyAccount(e.target.value)}
                className="w-full h-9 px-2 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring/40"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">API Key</div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 h-9 px-2 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring/40"
                />
                <button
                  onClick={onDeleteKey}
                  disabled={!hasKey}
                  className={cn(
                    'h-9 px-3 text-xs rounded-md border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors',
                    !hasKey && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  Clear
                </button>
              </div>
              <div className="text-[11px] text-muted-foreground">{hasKey ? 'Key stored' : 'No key stored'}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50">
            <button
              onClick={onClose}
              className="h-9 px-3 text-xs rounded-md bg-secondary/20 hover:bg-secondary/30 border border-border/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className={cn(
                'h-9 px-3 text-xs rounded-md bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary transition-colors',
                saving && 'opacity-60 cursor-not-allowed'
              )}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
