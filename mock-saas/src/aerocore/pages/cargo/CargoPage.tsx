import { useState } from 'react';
import { Package, Truck, Clock, CheckCircle, AlertTriangle, Plus, Warehouse, Search } from 'lucide-react';
import { useAero } from '../../lib/store';
import { CreateShipmentModal } from './CreateShipmentModal';
import { ShipmentDetailPanel } from './ShipmentDetailPanel';
import { WarehouseInventory } from './WarehouseInventory';

export function CargoPage() {
  const { state } = useAero();
  const { shipments } = state;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shipments' | 'inventory'>('shipments');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShipments = shipments?.filter(s => 
    s.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'Pending': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        case 'Processing': return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
        case 'In-Transit': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        case 'Delivered': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
        case 'Exception': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
        default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
        case 'Pending': return <Clock size={14} />;
        case 'Processing': return <Package size={14} />;
        case 'In-Transit': return <Truck size={14} />;
        case 'Delivered': return <CheckCircle size={14} />;
        case 'Exception': return <AlertTriangle size={14} />;
        default: return <Clock size={14} />;
    }
  };

  return (
    <div className="space-y-6 relative">
        <CreateShipmentModal 
            isOpen={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
        />
        
        <ShipmentDetailPanel 
            shipment={selectedShipmentId ? shipments.find(s => s.id === selectedShipmentId) || null : null}
            onClose={() => setSelectedShipmentId(null)}
        />

        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white">CargoFlow Logistics</h2>
                <p className="text-slate-400 text-sm mt-1">Manage global shipments and supply chain.</p>
            </div>
            <div className="flex items-center gap-4">
                {activeTab === 'shipments' && (
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search Customer or Order..." 
                            data-testid="cargo-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-full pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 w-64 transition-all focus:w-80"
                        />
                    </div>
                )}
                
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    data-testid="cargo-create-btn"
                    className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors"
                >
                    <Plus size={14} /> New Shipment
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-800">
            <button
                onClick={() => setActiveTab('shipments')}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'shipments' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                <div className="flex items-center gap-2">
                    <Package size={16} /> Active Shipments
                </div>
                {activeTab === 'shipments' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-t-full"></div>
                )}
            </button>
            <button
                onClick={() => setActiveTab('inventory')}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'inventory' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                <div className="flex items-center gap-2">
                    <Warehouse size={16} /> Warehouse Inventory
                </div>
                {activeTab === 'inventory' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-t-full"></div>
                )}
            </button>
        </div>

        {/* Content */}
        {activeTab === 'inventory' ? (
            <WarehouseInventory />
        ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Active Shipments</h3>
                    <div className="text-xs text-slate-500">
                        Showing: <span className="text-white font-mono">{filteredShipments?.length || 0}</span> / {shipments?.length || 0}
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-slate-200 uppercase text-xs tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-3">Order ID</th>
                                <th className="px-6 py-3">Origin</th>
                                <th className="px-6 py-3">Destination</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Weight</th>
                                <th className="px-6 py-3">Est. Delivery</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredShipments?.map((shipment) => (
                                <tr 
                                    key={shipment.id} 
                                    onClick={() => setSelectedShipmentId(shipment.id)}
                                    className={`transition-colors cursor-pointer ${
                                        selectedShipmentId === shipment.id ? 'bg-sky-500/10' : 'hover:bg-slate-800/50'
                                    }`}
                                >
                                    <td className="px-6 py-4 font-mono text-white">{shipment.id}</td>
                                    <td className="px-6 py-4 text-slate-300">{shipment.origin}</td>
                                    <td className="px-6 py-4 text-slate-300">{shipment.destination}</td>
                                    <td className="px-6 py-4 text-slate-300">{shipment.customer}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium ${getStatusColor(shipment.status)}`}>
                                            {getStatusIcon(shipment.status)}
                                            {shipment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{shipment.weight || '-'}</td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{shipment.estimatedDelivery || '-'}</td>
                                </tr>
                            ))}
                            {(!filteredShipments || filteredShipments.length === 0) && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                                        {searchQuery ? 'No shipments match your search.' : 'No active shipments found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
}
