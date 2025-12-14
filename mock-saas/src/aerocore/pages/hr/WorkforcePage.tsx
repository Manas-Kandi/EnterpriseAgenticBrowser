import { useAero } from '../../lib/store';
import { Users, UserCheck, Calendar, Clock } from 'lucide-react';

export function WorkforcePage() {
  const { state } = useAero();
  const users = state.users || [];
  
  const totalCount = users.length;
  // Assuming roles are available on user objects, or we'll filter by what we have.
  // For now just basic stats
  const activeCount = users.filter(u => u.status === 'Active').length;
  
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white">WorkforceHub</h2>
                <p className="text-slate-400 text-sm mt-1">Human Resources for scheduling and pilot management.</p>
            </div>
            <button 
                className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
                <Users size={16} />
                Add Personnel
            </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Personnel</div>
                    <div className="text-2xl font-mono text-white mt-1">{totalCount}</div>
                </div>
                <div className="bg-slate-800 p-2 rounded text-slate-400">
                    <Users size={20} />
                </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Shifts</div>
                    <div className="text-2xl font-mono text-white mt-1">{activeCount}</div>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded text-emerald-400">
                    <UserCheck size={20} />
                </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pending Leaves</div>
                    <div className="text-2xl font-mono text-white mt-1">0</div>
                </div>
                <div className="bg-amber-500/10 p-2 rounded text-amber-400">
                    <Calendar size={20} />
                </div>
            </div>
        </div>

        {/* Placeholder Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
            <Clock className="mx-auto h-12 w-12 text-slate-500 mb-4" />
            <h3 className="text-lg font-medium text-white">Workforce Management Module</h3>
            <p className="text-slate-400 mt-2">Personnel list, scheduling, and certification tracking coming soon.</p>
        </div>
    </div>
  );
}
