import { useAero } from '../../lib/store';
import { Battery, MapPin, Activity, Wrench, Plane } from 'lucide-react';

export function FleetPage() {
  const { state } = useAero();
  const drones = state.drones;
  
  const readyCount = drones.filter(d => d.status === 'Ready').length;
  const maintenanceCount = drones.filter(d => d.status === 'Maintenance').length;
  const inFlightCount = drones.filter(d => d.status === 'In-Flight').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'In-Flight': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Maintenance': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Offline': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Fleet Management</h2>
            <p className="text-slate-400 text-sm mt-1">Real-time status of autonomous drone assets.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ready</div>
                    <div className="text-2xl font-mono text-white mt-1">{readyCount}</div>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded text-emerald-400">
                    <Plane size={20} />
                </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">In Flight</div>
                    <div className="text-2xl font-mono text-white mt-1">{inFlightCount}</div>
                </div>
                <div className="bg-sky-500/10 p-2 rounded text-sky-400">
                    <Activity size={20} />
                </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Maintenance</div>
                    <div className="text-2xl font-mono text-white mt-1">{maintenanceCount}</div>
                </div>
                <div className="bg-amber-500/10 p-2 rounded text-amber-400">
                    <Wrench size={20} />
                </div>
            </div>
        </div>

        {/* DataGrid */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">Drone Fleet Registry</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-950 border-b border-slate-800">
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Model</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Battery</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {drones.map((drone) => (
                            <tr 
                                key={drone.id} 
                                data-testid={`fleet-drone-row-${drone.id}`}
                                className="hover:bg-slate-800/50 transition-colors"
                            >
                                <td className="px-6 py-4 text-sm font-mono text-white">{drone.id}</td>
                                <td className="px-6 py-4 text-sm text-slate-300">{drone.model}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(drone.status)}`}>
                                        {drone.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Battery size={16} className={drone.battery < 20 ? 'text-rose-500' : 'text-slate-400'} />
                                        <span>{drone.battery}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className="text-slate-500" />
                                        <span>{drone.location}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
