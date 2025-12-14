import { useAero } from '../../lib/store';
import { Radio } from 'lucide-react';
import { IncidentMap } from './IncidentMap';
import { IncidentList } from './IncidentList';

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Map Section */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Sector Map</h3>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Incident
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Drone
                        </span>
                    </div>
                </div>
                <div className="flex-1 relative min-h-0">
                    <IncidentMap />
                </div>
            </div>

            {/* Incident List Section */}
            <div className="lg:col-span-1 h-full min-h-0">
                <IncidentList />
            </div>
        </div>
    </div>
  );
}
