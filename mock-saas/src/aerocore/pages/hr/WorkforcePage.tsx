import { useState } from 'react';
import { useAero } from '../../lib/store';
import { Users, UserCheck, Calendar, Clock, Shield, Plane, Radio, Briefcase, Check, AlertTriangle } from 'lucide-react';

export function WorkforcePage() {
  const { state } = useAero();
  const users = state.users || [];
  
  // Local state for shift scheduler (overrides mock defaults)
  const [schedule, setSchedule] = useState<Record<string, string>>({});

  const personnel = users.filter(u => u.role !== 'Admin');
  const pilots = users.filter(u => u.role === 'Pilot');
  
  const totalCount = personnel.length;
  const activeCount = personnel.filter(u => u.status === 'Active').length;
  
  const getShift = (id: string) => {
    // Check local schedule first
    if (schedule[id]) return schedule[id];

    // Mock deterministic shift assignment
    const shifts = ['Morning (06:00 - 14:00)', 'Afternoon (14:00 - 22:00)', 'Night (22:00 - 06:00)', 'Off Duty'];
    // Use last char of ID or similar to pick
    const idx = (id.charCodeAt(id.length - 1) || 0) % shifts.length;
    return shifts[idx];
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
        case 'Pilot': return <Plane size={14} className="mr-1" />;
        case 'Dispatcher': return <Radio size={14} className="mr-1" />;
        case 'Security': return <Shield size={14} className="mr-1" />;
        default: return <Briefcase size={14} className="mr-1" />;
    }
  };

  const isCertExpired = (expiry?: string) => {
      if (!expiry) return false;
      return new Date(expiry) < new Date();
  };
  
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

        {/* Shift Scheduler */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Shift Scheduler (Pilots)</h3>
                <div className="text-xs text-slate-500">
                    Click to assign shifts
                </div>
            </div>
            <div className="p-6 overflow-x-auto">
                <div className="min-w-[600px]">
                    <div className="grid grid-cols-4 gap-4 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div>Pilot</div>
                        <div>Morning</div>
                        <div>Afternoon</div>
                        <div>Night</div>
                    </div>
                    <div className="space-y-2">
                        {pilots.map(pilot => (
                            <div key={pilot.id} className="grid grid-cols-4 gap-4 items-center p-3 bg-slate-950/50 rounded border border-slate-800/50" data-testid={`scheduler-row-${pilot.id}`}>
                                <div className="font-medium text-slate-200 flex items-center gap-2">
                                    <Plane size={14} className="text-sky-400" />
                                    {pilot.name}
                                </div>
                                {['Morning', 'Afternoon', 'Night'].map(shift => {
                                    // Check if this shift is assigned (either explicitly or via default mock)
                                    // We only highlight if it matches EXACTLY the start
                                    const currentShift = getShift(pilot.id);
                                    const isAssigned = currentShift.startsWith(shift);
                                    
                                    return (
                                        <button
                                            key={shift}
                                            data-testid={`shift-btn-${pilot.id}-${shift}`}
                                            onClick={() => setSchedule(prev => ({...prev, [pilot.id]: shift}))}
                                            className={`h-8 rounded flex items-center justify-center text-xs font-medium transition-all ${
                                                isAssigned
                                                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20'
                                                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                            }`}
                                        >
                                            {isAssigned && <Check size={12} className="mr-1" />}
                                            {shift}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                        {pilots.length === 0 && (
                            <div className="text-center text-slate-500 py-8">No pilots available for scheduling.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Personnel List DataGrid */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Personnel Roster</h3>
                <div className="text-xs text-slate-500">
                    Showing {personnel.length} records
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-950 border-b border-slate-800">
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name / ID</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Certifications</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Shift</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {personnel.map((user) => {
                            const expired = isCertExpired(user.certExpiry);
                            return (
                                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors" data-testid={`hr-user-row-${user.id}`}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-white">{user.name}</div>
                                        <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-sm text-slate-300">
                                            {getRoleIcon(user.role)}
                                            {user.role}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.certifications?.map((cert, i) => (
                                                <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                    expired 
                                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                                }`}>
                                                    {cert}
                                                </span>
                                            ))}
                                            {!user.certifications?.length && <span className="text-slate-600 text-xs">-</span>}
                                            {expired && (
                                                <div className="flex items-center gap-1 text-rose-500 text-xs font-bold mt-1">
                                                    <AlertTriangle size={10} />
                                                    Expired
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            user.status === 'Active' 
                                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                                : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                                        }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <Clock size={14} className="text-slate-500" />
                                            {getShift(user.id)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors">
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
