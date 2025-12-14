import { useState } from 'react';
import { useAero } from '../../lib/store';
import { AlertCircle, Clock, MapPin, Radio } from 'lucide-react';

interface IncidentListProps {
    onSelectIncident?: (id: string) => void;
}

type FilterStatus = 'All' | 'New' | 'Dispatched' | 'Resolved';

export function IncidentList({ onSelectIncident }: IncidentListProps) {
    const { state } = useAero();
    const [filter, setFilter] = useState<FilterStatus>('All');

    const incidents = [...state.incidents]
        .filter(i => filter === 'All' ? true : i.status === filter)
        .reverse(); 

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return 'text-rose-500';
            case 'High': return 'text-amber-500';
            case 'Medium': return 'text-sky-500';
            default: return 'text-slate-400';
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'New': return 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
            case 'Dispatched': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                        <Radio size={14} className="text-sky-500" />
                        Incident Feed
                    </h3>
                    
                    {/* Filters */}
                    <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800">
                        {(['All', 'New', 'Dispatched', 'Resolved'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                data-testid={`dispatch-filter-${f.toLowerCase()}`}
                                className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded transition-colors ${
                                    filter === f 
                                        ? 'bg-slate-800 text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <span className="text-xs text-slate-500 font-mono">LIVE</span>
            </div>
            
            <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-2 border-b border-slate-800">Priority</th>
                            <th className="px-4 py-2 border-b border-slate-800">Type / ID</th>
                            <th className="px-4 py-2 border-b border-slate-800">Location</th>
                            <th className="px-4 py-2 border-b border-slate-800">Status</th>
                            <th className="px-4 py-2 border-b border-slate-800 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {incidents.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                                    No active incidents reported. System normal.
                                </td>
                            </tr>
                        ) : incidents.map(incident => (
                            <tr 
                                key={incident.id} 
                                onClick={() => onSelectIncident?.(incident.id)}
                                className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                data-testid={`dispatch-incident-row-${incident.id}`}
                            >
                                <td className="px-4 py-3">
                                    <div className={`flex items-center gap-2 font-bold ${getPriorityColor(incident.priority)}`}>
                                        <AlertCircle size={14} />
                                        {incident.priority}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-200">{incident.type}</span>
                                        <span className="text-xs font-mono text-slate-500">#{incident.id}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <MapPin size={12} />
                                        {incident.location}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusStyle(incident.status)}`}>
                                        {incident.status}
                                    </span>
                                    {incident.assignedDroneId && (
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-sky-500"></span>
                                            Drone {incident.assignedDroneId}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5 text-slate-400 font-mono text-xs">
                                        <Clock size={12} />
                                        {incident.timestamp.split(' ')[1]}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
