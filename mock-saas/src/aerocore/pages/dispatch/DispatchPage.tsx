import { useAero } from '../../lib/store';
import { Radio, AlertTriangle } from 'lucide-react';

export function DispatchPage() {
  const { state } = useAero();
  const activeIncidents = state.incidents.filter(i => i.status !== 'Resolved');
  const availableDrones = state.drones.filter(d => d.status === 'Ready');

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Dispatch Command</h2>
                <p className="text-slate-400 text-sm mt-1">Monitor active incidents and fleet status.</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded text-xs font-medium flex items-center gap-2">
                    <Radio size={14} /> Live Feed Active
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Active Incidents</h3>
                <div className="flex items-center gap-4">
                    <div className="text-4xl font-mono text-white">{activeIncidents.length}</div>
                    <div className="text-xs text-slate-500">
                        Pending resolution
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Fleet Availability</h3>
                <div className="flex items-center gap-4">
                    <div className="text-4xl font-mono text-white">{availableDrones.length}</div>
                    <div className="text-xs text-slate-500">
                        Drones ready for deployment
                    </div>
                </div>
            </div>
        </div>

        {/* Content Placeholder */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-slate-500 mb-4">
                <AlertTriangle size={24} />
            </div>
            <h3 className="text-white font-medium mb-1">Dispatch Map Initializing</h3>
            <p className="text-slate-400 text-sm">Map visualization and unit controls will be loaded here.</p>
        </div>
    </div>
  );
}
