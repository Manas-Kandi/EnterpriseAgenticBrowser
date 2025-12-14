import React, { useState } from 'react';
import { useAero } from '../../lib/store';
import type { Incident } from '../../lib/types';
import { X, AlertTriangle } from 'lucide-react';

interface CreateIncidentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateIncidentModal({ isOpen, onClose }: CreateIncidentModalProps) {
    const { dispatch } = useAero();
    const [formData, setFormData] = useState<Partial<Incident>>({
        type: 'Security',
        priority: 'Medium',
        location: '',
        description: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.location || !formData.description) return;

        const newIncident: Incident = {
            id: `inc-${Date.now()}`,
            type: formData.type as any,
            priority: formData.priority as any,
            location: formData.location,
            description: formData.description,
            status: 'New',
            timestamp: new Date().toLocaleString(),
        };

        dispatch({ type: 'ADD_INCIDENT', payload: newIncident });
        
        // Reset and close
        setFormData({
            type: 'Security',
            priority: 'Medium',
            location: '',
            description: ''
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[500px] flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Report New Incident</h2>
                            <p className="text-xs text-slate-400">Log a new emergency or request dispatch.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Incident Type</label>
                            <select 
                                data-testid="dispatch-select-type"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value as any})}
                            >
                                <option value="Medical">Medical</option>
                                <option value="Security">Security</option>
                                <option value="Fire">Fire</option>
                                <option value="Logistics">Logistics</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Priority Level</label>
                            <select 
                                data-testid="dispatch-select-priority"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                value={formData.priority}
                                onChange={e => setFormData({...formData, priority: e.target.value as any})}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Location / Sector</label>
                        <input 
                            data-testid="dispatch-input-location"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                            placeholder="e.g. Sector 4, North Gate..."
                            value={formData.location}
                            onChange={e => setFormData({...formData, location: e.target.value})}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Description</label>
                        <textarea 
                            data-testid="dispatch-textarea-desc"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 min-h-[100px]"
                            placeholder="Describe the situation..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                         <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            data-testid="dispatch-submit-incident"
                            className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                            Create Incident
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
