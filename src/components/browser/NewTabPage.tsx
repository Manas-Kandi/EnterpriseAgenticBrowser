import { useEffect, useState } from 'react';

type DashboardSnapshot = {
    ts: number;
    kpis: Array<{ id: string; label: string; value: string; delta?: string }>;
    events: Array<{ id: string; ts: number; title: string; severity?: 'info' | 'warn' | 'critical' }>;
    reasoning: Array<{ id: string; ts: number; markdown: string }>;
};

export function NewTabPage() {
    const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

    useEffect(() => {
        let unsub: (() => void) | undefined;
        let cancelled = false;

        (async () => {
            try {
                const initial = await window.newtab?.getDashboardSnapshot();
                if (!cancelled && initial) setSnapshot(initial as DashboardSnapshot);
            } catch {
                // silent
            }
        })();

        try {
            unsub = window.newtab?.onDashboardUpdate((next) => {
                if (!cancelled) setSnapshot(next as DashboardSnapshot);
            });
        } catch {
            // silent
        }

        return () => {
            cancelled = true;
            unsub?.();
        };
    }, []);

    const kpis = snapshot?.kpis ?? [];
    const latestSignal = snapshot?.events?.[0];
    const hasWarning = latestSignal?.severity === 'warn' || latestSignal?.severity === 'critical';

    return (
        <div className="flex items-center justify-center min-h-full bg-background text-foreground select-none">
            <div className="flex flex-col items-center gap-8">
                <div className="flex items-center gap-1.5">
                    {hasWarning && (
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse" />
                    )}
                    <span className="text-[11px] text-muted-foreground/60 uppercase tracking-widest">
                        {latestSignal ? latestSignal.title : 'All clear'}
                    </span>
                </div>

                <div className="flex items-baseline gap-6">
                    {kpis.slice(0, 4).map((k) => (
                        <div key={k.id} className="flex flex-col items-center">
                            <div className="text-3xl font-light text-foreground/80 tabular-nums tracking-tight">
                                {k.value}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                                {k.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
