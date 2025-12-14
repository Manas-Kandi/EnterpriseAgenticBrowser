import { useState } from 'react';
import { useAero } from '../../lib/store';
import { Radio, Plus, Megaphone } from 'lucide-react';
import { IncidentMap } from './IncidentMap';
import { IncidentList } from './IncidentList';
import { IncidentDetailPanel } from './IncidentDetailPanel';
import { CreateIncidentModal } from './CreateIncidentModal';

export function DispatchPage() {
  const { state } = useAero();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  const activeIncidents = state.incidents.filter(i => i.status !== 'Resolved');
  const availableDrones = state.drones.filter(d => d.status === 'Ready');

  const handleBroadcast = () => {
    setBroadcastMessage("ALERT: ALL UNITS REPORT STATUS IMMEDIATELY");
    setTimeout(() => setBroadcastMessage(null), 3000);
  };

  return (
    <div className="space-y-6 relative">
        {/* Broadcast Toast */}
        {broadcastMessage && (
             <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-rose-600 text-white px-6 py-3 rounded-md shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in">
                <Megaphone size={20} className="animate-pulse" />
                <span className="font-bold tracking-wide">{broadcastMessage}</span>
            </div>
        )}

        <CreateIncidentModal 
            isOpen={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
        />
        <IncidentDetailPanel 
            incident={selectedIncidentId ? state.incidents.find(i => i.id === selectedIncidentId) || null : null} 
            onClose={() => setSelectedIncidentId(null)} 
        />
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Dispatch Command</h2>
                <p className="text-slate-400 text-sm mt-1">Monitor active incidents and fleet status.</p>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleBroadcast}
                    data-testid="dispatch-broadcast-btn"
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors mr-2"
                >
                    <Megaphone size={14} /> Broadcast Alert
                </button>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    data-testid="dispatch-create-btn"
                    className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors mr-2"
                >
                    <Plus size={14} /> Report Incident
                </button>
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
                    <IncidentMap onSelectIncident={setSelectedIncidentId} />
                </div>
            </div>

            {/* Incident List Section */}
            <div className="lg:col-span-1 h-full min-h-0">
                <IncidentList onSelectIncident={setSelectedIncidentId} />
            </div>
        </div>
    </div>
  );
}
