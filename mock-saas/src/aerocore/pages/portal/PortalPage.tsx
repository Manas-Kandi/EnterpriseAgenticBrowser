import React, { useState } from 'react';
import { useAero } from '../../lib/store';
import { Search, Clock, FileText, MessageSquare, MapPin, Plane, Shield, Truck, Calendar, Check } from 'lucide-react';
import type { Shipment, Incident } from '../../lib/types';

export const PortalPage: React.FC = () => {
    const { state, dispatch } = useAero();
    const [trackingId, setTrackingId] = useState('');
    const [foundShipment, setFoundShipment] = useState<Shipment | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Service Request State
    const [reqType, setReqType] = useState<'Security' | 'Logistics'>('Security');
    const [reqLocation, setReqLocation] = useState('');
    const [reqDate, setReqDate] = useState('');
    const [reqSubmitted, setReqSubmitted] = useState(false);

    const handleTrack = () => {
        if (!trackingId.trim()) return;
        const shipment = state.shipments.find(s => s.id.toLowerCase() === trackingId.trim().toLowerCase());
        setFoundShipment(shipment || null);
        setHasSearched(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleTrack();
    };

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reqLocation || !reqDate) return;

        const newIncident: Incident = {
            id: `REQ-${Math.floor(Math.random() * 10000)}`,
            type: reqType,
            priority: reqType === 'Security' ? 'High' : 'Medium',
            status: 'New',
            location: reqLocation,
            description: `Client requested ${reqType === 'Security' ? 'Security Patrol' : 'Urgent Delivery'}`,
            timestamp: reqDate.replace('T', ' '),
        };

        dispatch({ type: 'ADD_INCIDENT', payload: newIncident });
        setReqSubmitted(true);
        
        // Reset form after delay
        setTimeout(() => {
            setReqSubmitted(false);
            setReqLocation('');
            setReqDate('');
        }, 3000);
    };

    const getProgress = (status: Shipment['status']) => {
        switch (status) {
            case 'Pending': return 10;
            case 'Processing': return 35;
            case 'In-Transit': return 70;
            case 'Delivered': return 100;
            case 'Exception': return 100;
            default: return 0;
        }
    };

    const getStatusColor = (status: Shipment['status']) => {
        switch (status) {
            case 'Delivered': return 'bg-emerald-500';
            case 'Exception': return 'bg-rose-500';
            default: return 'bg-sky-500';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-100">Client Portal</h1>
                    <p className="text-slate-400 mt-1">Track shipments and manage service requests.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Track Shipment Hero */}
                <div className="col-span-full bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-xl font-semibold text-sky-400 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Track Shipment
                    </h2>
                    <div className="flex gap-4 mb-6">
                        <input 
                            type="text" 
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter Tracking Number (e.g. ORD-001)" 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                        />
                        <button 
                            onClick={handleTrack}
                            className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-md font-medium transition-colors"
                        >
                            Track
                        </button>
                    </div>

                    {hasSearched && !foundShipment && (
                        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-center text-slate-400">
                            No shipment found with tracking number <span className="text-slate-200 font-mono">{trackingId}</span>
                        </div>
                    )}

                    {foundShipment && (
                        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 animate-in slide-in-from-top-2">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-2xl font-bold text-white tracking-tight">{foundShipment.id}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                                            foundShipment.status === 'Exception' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                            foundShipment.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                        }`}>
                                            {foundShipment.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-400 flex items-center gap-2">
                                        <span>From: <span className="text-slate-300">{foundShipment.origin}</span></span>
                                        <span className="text-slate-600">&rarr;</span>
                                        <span>To: <span className="text-slate-300">{foundShipment.destination}</span></span>
                                    </div>
                                </div>
                                {foundShipment.estimatedDelivery && (
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider">Estimated Delivery</div>
                                        <div className="text-lg font-mono text-emerald-400">{foundShipment.estimatedDelivery}</div>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="relative pt-4 pb-2 mb-6">
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out ${getStatusColor(foundShipment.status)}`}
                                        style={{ width: `${getProgress(foundShipment.status)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-xs font-medium text-slate-500">
                                    <div className={getProgress(foundShipment.status) >= 10 ? 'text-sky-400' : ''}>Ordered</div>
                                    <div className={getProgress(foundShipment.status) >= 35 ? 'text-sky-400' : ''}>Processing</div>
                                    <div className={getProgress(foundShipment.status) >= 70 ? 'text-sky-400' : ''}>In-Transit</div>
                                    <div className={getProgress(foundShipment.status) >= 100 ? (foundShipment.status === 'Exception' ? 'text-rose-400' : 'text-emerald-400') : ''}>
                                        {foundShipment.status === 'Exception' ? 'Exception' : 'Delivered'}
                                    </div>
                                </div>
                            </div>

                            {/* Shipment Details Card (Map & Info) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/50 rounded-lg p-4 border border-slate-800">
                                {/* Map Placeholder */}
                                <div className="bg-slate-900 rounded border border-slate-800 h-48 flex items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500"></div>
                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                        <MapPin className="text-sky-500 w-8 h-8 animate-bounce" />
                                        <span className="text-xs font-mono bg-black/50 px-2 py-1 rounded text-white backdrop-blur-sm">Live Tracking</span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">Shipment Details</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Weight</span>
                                            <span className="text-slate-300 font-mono">{foundShipment.weight}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Priority</span>
                                            <span className={`font-medium ${
                                                foundShipment.priority === 'Critical' ? 'text-rose-400' :
                                                foundShipment.priority === 'Express' ? 'text-amber-400' :
                                                'text-slate-300'
                                            }`}>{foundShipment.priority}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Customer</span>
                                            <span className="text-slate-300">{foundShipment.customer}</span>
                                        </div>

                                        {foundShipment.status === 'In-Transit' && foundShipment.assignedDroneId && (
                                            <div className="mt-4 p-3 bg-sky-500/10 border border-sky-500/20 rounded-md flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sky-400">
                                                    <Plane className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Airborne</span>
                                                </div>
                                                <div className="text-xs text-sky-300 font-mono">
                                                    Drone ID: {foundShipment.assignedDroneId}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Request Service Form */}
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-sky-400" />
                        Request Service
                    </h3>
                    
                    {reqSubmitted ? (
                        <div className="h-64 flex flex-col items-center justify-center text-center p-4 animate-in fade-in zoom-in">
                            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-3">
                                <Check className="w-6 h-6" />
                            </div>
                            <h4 className="text-white font-medium mb-1">Request Received</h4>
                            <p className="text-sm text-slate-400">An agent will review your request shortly.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleRequestSubmit} className="space-y-4">
                            <div className="flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setReqType('Security')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                                        reqType === 'Security' 
                                            ? 'bg-slate-800 text-sky-400 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <Shield className="w-4 h-4" />
                                    Patrol
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReqType('Logistics')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                                        reqType === 'Logistics' 
                                            ? 'bg-slate-800 text-sky-400 shadow-sm' 
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <Truck className="w-4 h-4" />
                                    Delivery
                                </button>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    <input 
                                        type="text" 
                                        value={reqLocation}
                                        onChange={(e) => setReqLocation(e.target.value)}
                                        placeholder="Sector 4, Building A..." 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Date & Time</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                                    <input 
                                        type="datetime-local" 
                                        value={reqDate}
                                        onChange={(e) => setReqDate(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-md font-medium text-sm transition-colors mt-2"
                            >
                                Submit Request
                            </button>
                        </form>
                    )}
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-sky-400" />
                        Recent Orders
                    </h3>
                    <p className="text-slate-400 text-sm">No recent orders found.</p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-400" />
                        Invoices
                    </h3>
                    <p className="text-slate-400 text-sm">All payments up to date.</p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-sky-400" />
                        Support
                    </h3>
                    <p className="text-slate-400 text-sm">Need help? Start a chat.</p>
                </div>
            </div>
        </div>
    );
};
