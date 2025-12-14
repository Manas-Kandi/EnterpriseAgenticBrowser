import { useState } from 'react';
import { useAero } from '../../lib/store';
import type { Shipment } from '../../lib/types';
import { X, MapPin, Package, Calendar, Truck, ArrowRight, Loader2, Navigation, CheckCircle, AlertTriangle, FileSignature } from 'lucide-react';

interface ShipmentDetailPanelProps {
    shipment: Shipment | null;
    onClose: () => void;
}

export function ShipmentDetailPanel({ shipment, onClose }: ShipmentDetailPanelProps) {
    const { state, dispatch } = useAero();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isDispatching, setIsDispatching] = useState(false);
    const [optimizedRoute, setOptimizedRoute] = useState<string[] | null>(null);

    if (!shipment) return null;

    const availableDrones = state.drones.filter(d => d.status === 'Ready');

    const handleOptimizeRoute = () => {
        setIsOptimizing(true);
        // Simulate API call
        setTimeout(() => {
            setOptimizedRoute([
                shipment.origin,
                'Distribution Hub Alpha',
                'Sortation Center West',
                shipment.destination
            ]);
            setIsOptimizing(false);
        }, 1500);
    };

    const handleDispatch = () => {
        setIsDispatching(true);
        // Find best drone (mock logic: just take first available)
        const drone = availableDrones[0];
        
        if (!drone) {
            alert("No available drones!");
            setIsDispatching(false);
            return;
        }

        setTimeout(() => {
            // Update Shipment
            dispatch({
                type: 'UPDATE_SHIPMENT',
                payload: { 
                    ...shipment, 
                    status: 'In-Transit',
                    assignedDroneId: drone.id
                }
            });

            // Update Drone
            dispatch({
                type: 'UPDATE_DRONE',
                payload: {
                    ...drone,
                    status: 'In-Flight',
                    assignedMissionId: `SHIP-${shipment.id}`
                }
            });

            setIsDispatching(false);
        }, 1000);
    };

    const handleReportIssue = () => {
        if (confirm('Are you sure you want to report an issue with this shipment?')) {
            dispatch({
                type: 'UPDATE_SHIPMENT',
                payload: {
                    ...shipment,
                    status: 'Exception'
                }
            });
        }
    };

    return (
        <div className="absolute inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider
                            ${shipment.status === 'Exception' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              shipment.priority === 'Express' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                              'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                            {shipment.status === 'Exception' ? 'ISSUE REPORTED' : shipment.priority}
                        </span>
                        <span className="text-xs font-mono text-slate-500">#{shipment.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white leading-tight">Shipment Details</h2>
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
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status</h3>
                    <div className="flex items-center gap-4 bg-slate-950 p-4 rounded border border-slate-800">
                        <div className={`p-2 rounded-full ${
                            shipment.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                            shipment.status === 'In-Transit' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-sky-500/10 text-sky-400'
                        }`}>
                            <Package size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">{shipment.status}</div>
                            <div className="text-xs text-slate-400">Customer: {shipment.customer}</div>
                        </div>
                    </div>
                </div>

                {/* Logistics Info */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Logistics Data</h3>
                    
                    <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-slate-400 mt-0.5" />
                        <div className="w-full">
                            <div className="text-xs text-slate-500 uppercase">Route</div>
                            <div className="flex items-center gap-2 text-sm text-slate-200 mt-1">
                                <span>{shipment.origin}</span>
                                <ArrowRight size={12} className="text-slate-500" />
                                <span>{shipment.destination}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Package size={16} className="text-slate-400 mt-0.5" />
                        <div>
                            <div className="text-xs text-slate-500 uppercase">Weight</div>
                            <div className="text-sm text-slate-200 font-mono">{shipment.weight || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-slate-400 mt-0.5" />
                        <div>
                            <div className="text-xs text-slate-500 uppercase">Est. Delivery</div>
                            <div className="text-sm text-slate-200 font-mono">{shipment.estimatedDelivery || 'Pending Calculation'}</div>
                        </div>
                    </div>
                </div>

                {/* Proof of Delivery (Task 9) */}
                {shipment.status === 'Delivered' && (
                    <div>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <FileSignature size={14} /> Proof of Delivery
                        </h3>
                        <div className="bg-slate-950 border border-slate-800 rounded p-4">
                            <div className="h-24 bg-white/5 rounded border border-white/10 flex items-center justify-center relative overflow-hidden">
                                <span className="text-slate-600 font-cursive text-2xl italic select-none absolute transform -rotate-12">
                                    Signed by Customer
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                            </div>
                            <div className="mt-2 text-xs text-slate-400 flex justify-between">
                                <span>Signed at: {shipment.estimatedDelivery}</span>
                                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={10} /> Verified</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Route Optimizer (Mock) */}
                <div className="bg-slate-950 border border-slate-800 rounded p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                            <Navigation size={14} className="text-sky-400" /> AI Route Optimizer
                        </h3>
                    </div>

                    {!optimizedRoute ? (
                        <div className="text-center">
                            {isOptimizing ? (
                                <div className="py-6 flex flex-col items-center gap-3 text-slate-400">
                                    <Loader2 size={24} className="animate-spin text-sky-500" />
                                    <span className="text-xs animate-pulse">Calculating optimal path...</span>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleOptimizeRoute}
                                    data-testid="cargo-optimize-btn"
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors border border-slate-700"
                                >
                                    Optimize Route
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-xs text-emerald-400 mb-2 font-medium flex items-center gap-1">
                                <CheckCircle size={12} /> Optimization Complete
                            </div>
                            <div className="space-y-3 relative">
                                {/* Connector Line */}
                                <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-800 -z-10"></div>
                                
                                {optimizedRoute.map((stop, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full border-2 ${
                                            i === 0 || i === optimizedRoute.length - 1 ? 'border-sky-500 bg-sky-950' : 'border-slate-600 bg-slate-900'
                                        }`}></div>
                                        <span className="text-xs text-slate-300">{stop}</span>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={() => setOptimizedRoute(null)}
                                className="mt-4 w-full text-xs text-slate-500 hover:text-white transition-colors"
                            >
                                Reset Route
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
                 <button 
                    onClick={handleDispatch}
                    disabled={isDispatching || shipment.status !== 'Pending'}
                    data-testid="cargo-dispatch-btn"
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white py-2 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDispatching ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                    {isDispatching ? 'Dispatching Drone...' : 'Dispatch to Drone'}
                </button>

                {shipment.status !== 'Exception' && shipment.status !== 'Delivered' && (
                    <button 
                        onClick={handleReportIssue}
                        data-testid="cargo-report-issue-btn"
                        className="w-full bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/20 py-2 rounded font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                        <AlertTriangle size={16} />
                        Report Issue
                    </button>
                )}
            </div>
        </div>
    );
}
