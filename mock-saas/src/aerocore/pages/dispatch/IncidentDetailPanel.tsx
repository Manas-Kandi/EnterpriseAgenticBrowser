import type { Incident } from '../../lib/types';
import { X, AlertTriangle, MapPin, Clock, Navigation, CheckCircle, ShieldAlert } from 'lucide-react';

interface IncidentDetailPanelProps {
    incident: Incident | null;
    onClose: () => void;
}

export function IncidentDetailPanel({ incident, onClose }: IncidentDetailPanelProps) {
    if (!incident) return null;

    return (
        <div className="absolute inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider
                            ${incident.priority === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                              incident.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                              'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                            {incident.priority} Priority
                        </span>
                        <span className="text-xs font-mono text-slate-500">#{incident.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-tight">{incident.type} Incident</h2>
                </div>
                <button 
                    onClick={onClose}
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Status Section */}
                <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status Report</h3>
                    <div className="flex items-center gap-4 bg-slate-950 p-4 rounded border border-slate-800">
                        <div className={`p-2 rounded-full ${
                            incident.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                            incident.status === 'Dispatched' ? 'bg-sky-500/10 text-sky-400' :
                            'bg-rose-500/10 text-rose-400'
                        }`}>
                            {incident.status === 'Resolved' ? <CheckCircle size={24} /> :
                             incident.status === 'Dispatched' ? <Navigation size={24} /> :
                             <AlertTriangle size={24} />}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">{incident.status}</div>
                            <div className="text-xs text-slate-400">Last updated: {incident.timestamp}</div>
                        </div>
                    </div>
                </div>

                {/* Location & Details */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Incident Details</h3>
                    
                    <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-slate-400 mt-0.5" />
                        <div>
                            <div className="text-xs text-slate-500 uppercase">Location</div>
                            <div className="text-sm text-slate-200">{incident.location}</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Clock size={16} className="text-slate-400 mt-0.5" />
                        <div>
                            <div className="text-xs text-slate-500 uppercase">Time Reported</div>
                            <div className="text-sm text-slate-200 font-mono">{incident.timestamp}</div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="text-xs text-slate-500 uppercase mb-2">Description</div>
                        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded border border-slate-800/50">
                            {incident.description}
                        </p>
                    </div>
                </div>

                {/* Assigned Assets */}
                <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Assigned Assets</h3>
                    {incident.assignedDroneId ? (
                        <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded border border-slate-700">
                            <Navigation size={18} className="text-sky-400" />
                            <div>
                                <div className="text-sm font-bold text-white">Drone {incident.assignedDroneId}</div>
                                <div className="text-xs text-sky-400">En Route / On Scene</div>
                            </div>
                        </div>
                    ) : (
                         <div className="text-sm text-slate-500 italic border border-dashed border-slate-700 rounded p-3 text-center">
                            No assets currently assigned.
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
                <button 
                    data-testid="dispatch-action-assign"
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white py-2 rounded font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    <Navigation size={16} /> Assign Drone Unit
                </button>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                         data-testid="dispatch-action-resolve"
                         className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20 py-2 rounded font-medium text-sm transition-colors"
                    >
                        Resolve
                    </button>
                    <button 
                        data-testid="dispatch-action-escalate"
                        className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/20 py-2 rounded font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                        <ShieldAlert size={14} /> Escalate
                    </button>
                </div>
            </div>
        </div>
    );
}
