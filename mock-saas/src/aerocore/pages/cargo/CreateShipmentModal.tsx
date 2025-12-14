import React, { useState } from 'react';
import { useAero } from '../../lib/store';
import type { Shipment } from '../../lib/types';
import { X, PackagePlus } from 'lucide-react';

interface CreateShipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateShipmentModal({ isOpen, onClose }: CreateShipmentModalProps) {
    const { dispatch } = useAero();
    const [formData, setFormData] = useState({
        customer: '',
        origin: '',
        destination: '',
        weight: '',
        priority: 'Standard' as 'Standard' | 'Express'
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customer || !formData.origin || !formData.destination) return;

        const newShipment: Shipment = {
            id: `ORD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            origin: formData.origin,
            destination: formData.destination,
            status: 'Pending',
            customer: formData.customer,
            priority: formData.priority,
            weight: formData.weight ? `${formData.weight}kg` : undefined,
            // Simple mock estimation
            estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16).replace('T', ' ')
        };

        dispatch({ type: 'ADD_SHIPMENT', payload: newShipment });
        
        // Reset and close
        setFormData({
            customer: '',
            origin: '',
            destination: '',
            weight: '',
            priority: 'Standard'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[500px] flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20">
                            <PackagePlus size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Create New Shipment</h2>
                            <p className="text-xs text-slate-400">Register a cargo order for dispatch.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Customer / Sender</label>
                        <input 
                            data-testid="cargo-input-customer"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                            placeholder="e.g. Global Tech Inc..."
                            value={formData.customer}
                            onChange={e => setFormData({...formData, customer: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Origin</label>
                            <input 
                                data-testid="cargo-input-origin"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                placeholder="Warehouse A"
                                value={formData.origin}
                                onChange={e => setFormData({...formData, origin: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Destination</label>
                            <input 
                                data-testid="cargo-input-destination"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                placeholder="Sector 7"
                                value={formData.destination}
                                onChange={e => setFormData({...formData, destination: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Weight (kg)</label>
                            <input 
                                data-testid="cargo-input-weight"
                                type="number"
                                step="0.1"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                placeholder="0.0"
                                value={formData.weight}
                                onChange={e => setFormData({...formData, weight: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Priority</label>
                            <select 
                                data-testid="cargo-select-priority"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                value={formData.priority}
                                onChange={e => setFormData({...formData, priority: e.target.value as any})}
                            >
                                <option value="Standard">Standard</option>
                                <option value="Express">Express</option>
                            </select>
                        </div>
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
                            data-testid="cargo-submit-btn"
                            className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <PackagePlus size={16} />
                            Create Shipment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
