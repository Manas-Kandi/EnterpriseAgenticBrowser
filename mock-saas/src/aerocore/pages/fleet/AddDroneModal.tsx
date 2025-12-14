import { useState } from 'react';
import { useAero } from '../../lib/store';
import { X, Plus, Plane } from 'lucide-react';
import type { Drone } from '../../lib/types';

interface AddDroneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddDroneModal({ isOpen, onClose }: AddDroneModalProps) {
  const { dispatch } = useAero();
  const [model, setModel] = useState<Drone['model']>('Sentinel-X');
  const [location, setLocation] = useState('Base Alpha');
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newDrone: Drone = {
        id: `d${Date.now()}`,
        model,
        status: 'Ready',
        battery: 100,
        location,
        maxSpeed: model === 'Sentinel-X' ? 120 : model === 'CargoLifter-9' ? 80 : 150,
        payloadCapacity: model === 'Sentinel-X' ? '2kg' : model === 'CargoLifter-9' ? '15kg' : '0.5kg',
        firmwareVersion: 'v1.0.0',
    };

    dispatch({ type: 'ADD_DRONE', payload: newDrone });
    onClose();
    
    // Reset defaults
    setModel('Sentinel-X');
    setLocation('Base Alpha');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
                <div className="bg-sky-500/10 p-2 rounded text-sky-400">
                    <Plane size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Deploy New Drone</h2>
                    <p className="text-slate-400 text-xs">Add a new unit to the fleet.</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label className="block text-xs uppercase text-slate-500 mb-1 font-semibold tracking-wider">Model</label>
                <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value as Drone['model'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                >
                    <option value="Sentinel-X">Sentinel-X (Surveillance)</option>
                    <option value="CargoLifter-9">CargoLifter-9 (Transport)</option>
                    <option value="Scout-Mini">Scout-Mini (Recon)</option>
                </select>
            </div>

            <div>
                <label className="block text-xs uppercase text-slate-500 mb-1 font-semibold tracking-wider">Base Location</label>
                <select 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:border-sky-500 focus:outline-none"
                >
                    <option value="Base Alpha">Base Alpha (HQ)</option>
                    <option value="Hangar B">Hangar B (Maintenance)</option>
                    <option value="Sector 4">Sector 4 Outpost</option>
                    <option value="Sector 7">Sector 7 Outpost</option>
                </select>
            </div>

            <div className="pt-4 flex gap-3">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 py-2 px-4 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded text-sm transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="flex-1 py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Deploy Unit
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
