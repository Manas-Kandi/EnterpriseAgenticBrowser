import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { useBrowserStore } from '@/lib/store';

export function NewTabPage() {
    const { appMode } = useBrowserStore();
    const isDevMode = appMode === 'dev';

    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsError, setInsightsError] = useState<string | null>(null);
    const [insightsMarkdown, setInsightsMarkdown] = useState<string>('');

    const handleGenerateInsights = async () => {
        if (!isDevMode) return;
        setInsightsLoading(true);
        setInsightsError(null);
        try {
            const res = await window.newtab?.getInsights();
            if (!res) {
                setInsightsError('Insights API unavailable.');
                return;
            }
            if (!res.ok) {
                setInsightsError(res.error ?? 'Failed to generate insights.');
                return;
            }
            setInsightsMarkdown(res.markdown ?? '');
        } catch (e: any) {
            setInsightsError(String(e?.message ?? e));
        } finally {
            setInsightsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-full bg-background text-foreground p-8">
            <div className="w-full max-w-4xl">
                {!isDevMode ? (
                    <div className="text-sm text-muted-foreground">
                        New Tab
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-1">Mock SaaS Insights</h2>
                            <button
                                onClick={handleGenerateInsights}
                                disabled={insightsLoading}
                                className="h-8 px-3 rounded-md border border-border/40 bg-card hover:bg-secondary/20 transition-colors text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                                {insightsLoading ? 'Generating…' : 'Generate'}
                            </button>
                        </div>

                        {insightsError && (
                            <div className="text-xs text-destructive px-1">{insightsError}</div>
                        )}

                        {insightsMarkdown ? (
                            <div className="rounded-lg border border-border/30 bg-card/40 p-4">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{insightsMarkdown}</ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground px-1">
                                Uses <span className="font-medium">NVIDIA_API_KEY</span> and the local mock SaaS docs.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
