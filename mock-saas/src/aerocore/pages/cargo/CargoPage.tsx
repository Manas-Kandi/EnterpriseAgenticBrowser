import { Package } from 'lucide-react';

export function CargoPage() {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white">CargoFlow Logistics</h2>
                <p className="text-slate-400 text-sm mt-1">Manage global shipments and supply chain.</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded text-xs font-medium flex items-center gap-2">
                    <Package size={14} /> Systems Online
                </span>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-10 rounded-lg text-center">
            <p className="text-slate-400">CargoFlow Dashboard Initialized</p>
        </div>
    </div>
  );
}
