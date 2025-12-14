import { useAero } from '../../lib/store';
import { Package, Search, Warehouse } from 'lucide-react';

export function WarehouseInventory() {
    const { state } = useAero();
    const { inventory } = state;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Warehouse size={16} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Warehouse Inventory</h3>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1.5 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Search SKU or Name..." 
                        data-testid="cargo-inventory-search"
                        className="bg-slate-950 border border-slate-700 rounded-full pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:border-sky-500 w-64"
                    />
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950/50 text-slate-200 uppercase text-xs tracking-wider font-semibold">
                        <tr>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3">Item Name</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">Zone</th>
                            <th className="px-6 py-3 text-right">Quantity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {inventory?.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sky-400">{item.id}</td>
                                <td className="px-6 py-4 text-slate-200 font-medium">{item.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2 py-0.5 rounded border ${
                                        item.category === 'Medical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                        item.category === 'Hazardous' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                        {item.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400">{item.zone}</td>
                                <td className="px-6 py-4 text-right font-mono text-white">{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
