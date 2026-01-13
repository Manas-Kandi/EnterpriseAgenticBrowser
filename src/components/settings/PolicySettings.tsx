import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  Shield, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Lock, 
  Unlock,
  Globe,
  Ban,
  Wrench,
  MessageSquare,
  ChevronDown
} from 'lucide-react';

type PolicyStatus = {
  configuredUrl: string | null;
  hasRemotePolicy: boolean;
  version: number | null;
  fetchedAt: number | null;
  expiresAt: number | null;
  allowlistCount: number;
  blocklistCount: number;
  toolRestrictionsCount: number;
  timeBasedRulesCount: number;
  developerOverrideEnabled: boolean;
  message: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncError: string | null;
  isExpired: boolean;
};

export function PolicySettings() {
  const [status, setStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [policyUrl, setPolicyUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [devOverrideToken, setDevOverrideToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!window.policy?.status) return;
    try {
      const s = await window.policy.status();
      setStatus(s);
      if (s.configuredUrl) {
        setPolicyUrl(s.configuredUrl);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSync = async () => {
    if (!window.policy?.sync) return;
    setSyncing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await window.policy.sync(policyUrl || undefined);
      if (result.success) {
        setSuccess('Policy synced successfully');
        await loadStatus();
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleConfigure = async () => {
    if (!window.policy?.configure || !policyUrl.trim()) return;
    setSyncing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await window.policy.configure({
        url: policyUrl.trim(),
        authToken: authToken.trim() || undefined,
      });
      if (result.success) {
        setSuccess('Policy configured and synced successfully');
        setAuthToken('');
        await loadStatus();
      } else {
        setError(result.error || 'Configuration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Configuration failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDevOverride = async (enabled: boolean) => {
    if (!window.policy?.setDevOverride) return;
    setError(null);
    
    try {
      const result = await window.policy.setDevOverride(enabled, devOverrideToken || undefined);
      if (result.success) {
        setSuccess(enabled ? 'Developer override enabled' : 'Developer override disabled');
        setDevOverrideToken('');
        await loadStatus();
      } else {
        setError('Failed to set developer override - check your token');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set developer override');
    }
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return '';
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-primary" />
        <h3 className="text-sm font-medium">Remote Policy Management</h3>
      </div>

      {/* Admin Message */}
      {status?.message && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <MessageSquare size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-foreground">{status.message}</p>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-secondary/20 border border-border/40">
          <div className="flex items-center gap-2 mb-1">
            {status?.hasRemotePolicy ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <AlertCircle size={12} className="text-muted-foreground" />
            )}
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
          </div>
          <p className="text-xs font-medium">
            {status?.hasRemotePolicy ? 'Policy Active' : 'No Remote Policy'}
          </p>
          {status?.version && (
            <p className="text-[10px] text-muted-foreground">Version {status.version}</p>
          )}
        </div>

        <div className="p-3 rounded-lg bg-secondary/20 border border-border/40">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Sync</span>
          </div>
          <p className="text-xs font-medium">
            {status?.fetchedAt ? formatTimeAgo(status.fetchedAt) : 'Never'}
          </p>
          {status?.isExpired && (
            <p className="text-[10px] text-red-500">Policy expired</p>
          )}
        </div>
      </div>

      {/* Policy Stats */}
      {status?.hasRemotePolicy && (
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-md bg-secondary/10 border border-border/30 text-center">
            <Globe size={12} className="mx-auto mb-1 text-green-500" />
            <p className="text-xs font-medium">{status.allowlistCount}</p>
            <p className="text-[9px] text-muted-foreground">Allowed</p>
          </div>
          <div className="p-2 rounded-md bg-secondary/10 border border-border/30 text-center">
            <Ban size={12} className="mx-auto mb-1 text-red-500" />
            <p className="text-xs font-medium">{status.blocklistCount}</p>
            <p className="text-[9px] text-muted-foreground">Blocked</p>
          </div>
          <div className="p-2 rounded-md bg-secondary/10 border border-border/30 text-center">
            <Wrench size={12} className="mx-auto mb-1 text-yellow-500" />
            <p className="text-xs font-medium">{status.toolRestrictionsCount}</p>
            <p className="text-[9px] text-muted-foreground">Tool Rules</p>
          </div>
          <div className="p-2 rounded-md bg-secondary/10 border border-border/30 text-center">
            <Clock size={12} className="mx-auto mb-1 text-blue-500" />
            <p className="text-xs font-medium">{status.timeBasedRulesCount}</p>
            <p className="text-[9px] text-muted-foreground">Time Rules</p>
          </div>
        </div>
      )}

      {/* Sync Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
          <p className="text-xs text-green-500">{success}</p>
        </div>
      )}

      {/* Policy URL Configuration */}
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Policy Endpoint URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={policyUrl}
            onChange={(e) => setPolicyUrl(e.target.value)}
            placeholder="https://your-company.com/api/browser-policy"
            className="flex-1 h-9 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={handleSync}
            disabled={syncing || !policyUrl.trim()}
            className={cn(
              'h-9 px-3 rounded-md border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors',
              (syncing || !policyUrl.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {syncing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Auth Token */}
      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Authentication Token (Optional)
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Bearer token for authenticated endpoints"
            className="flex-1 h-9 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={handleConfigure}
            disabled={syncing || !policyUrl.trim()}
            className={cn(
              'h-9 px-4 text-xs rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors',
              (syncing || !policyUrl.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            Configure
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Token is stored securely in your system keychain
        </p>
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-border/30 pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown size={12} className={cn('transition-transform', showAdvanced && 'rotate-180')} />
          Developer Options
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Developer Override */}
            <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                {status?.developerOverrideEnabled ? (
                  <Unlock size={14} className="text-yellow-500" />
                ) : (
                  <Lock size={14} className="text-muted-foreground" />
                )}
                <span className="text-xs font-medium">Developer Override</span>
                {status?.developerOverrideEnabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">Active</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mb-3">
                Bypass all policy restrictions for local development. Requires secret token.
              </p>
              
              {status?.developerOverrideEnabled ? (
                <button
                  onClick={() => handleDevOverride(false)}
                  className="h-8 px-3 text-xs rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 border border-yellow-500/30 transition-colors"
                >
                  Disable Override
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={devOverrideToken}
                    onChange={(e) => setDevOverrideToken(e.target.value)}
                    placeholder="Developer secret token"
                    className="flex-1 h-8 px-3 text-xs rounded-md bg-secondary/20 border border-border/40 focus:outline-none focus:ring-1 focus:ring-yellow-500/40"
                  />
                  <button
                    onClick={() => handleDevOverride(true)}
                    disabled={!devOverrideToken.trim()}
                    className={cn(
                      'h-8 px-3 text-xs rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 border border-yellow-500/30 transition-colors',
                      !devOverrideToken.trim() && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    Enable
                  </button>
                </div>
              )}
            </div>

            {/* Policy Details */}
            {status?.hasRemotePolicy && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground">
                  <strong>Fetched:</strong> {formatTime(status.fetchedAt)}
                </p>
                {status.expiresAt && (
                  <p className="text-[10px] text-muted-foreground">
                    <strong>Expires:</strong> {formatTime(status.expiresAt)}
                  </p>
                )}
                {status.configuredUrl && (
                  <p className="text-[10px] text-muted-foreground break-all">
                    <strong>URL:</strong> {status.configuredUrl}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
