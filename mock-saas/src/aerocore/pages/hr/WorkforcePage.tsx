import { useState } from 'react';
import { useAero } from '../../lib/store';
import { Users, UserCheck, Calendar, Clock, Shield, Plane, Radio, Briefcase, Check, AlertTriangle, RefreshCw, X, ThumbsUp, ThumbsDown, DollarSign } from 'lucide-react';
import { RenewCertModal } from './RenewCertModal';
import { NewHireModal } from './NewHireModal';
import type { User } from '../../lib/types';

interface LeaveRequest {
    id: string;
    userId: string;
    name: string;
    type: 'Vacation' | 'Sick Leave' | 'Personal';
    dates: string;
    status: 'Pending' | 'Approved' | 'Rejected';
}

const INITIAL_REQUESTS: LeaveRequest[] = [
    { id: 'lr1', userId: 'u3', name: 'Maverick', type: 'Vacation', dates: 'Nov 10 - Nov 20', status: 'Pending' },
    { id: 'lr2', userId: 'u2', name: 'Sarah Connor', type: 'Sick Leave', dates: 'Oct 28', status: 'Pending' },
];

export function WorkforcePage() {
  const { state, dispatch } = useAero();
  const users = state.users || [];
  
  // Local state for shift scheduler
  const [schedule, setSchedule] = useState<Record<string, string>>({});

  // Local state for Leave Requests
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);

  // State for Cert Renewal Modal
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // State for New Hire Modal
  const [newHireModalOpen, setNewHireModalOpen] = useState(false);

  const personnel = users.filter(u => u.role !== 'Admin');
  const pilots = users.filter(u => u.role === 'Pilot');
  
  const totalCount = personnel.length;
  const activeCount = personnel.filter(u => u.dutyStatus === 'On-Duty').length;
  const pendingLeaveCount = requests.filter(r => r.status === 'Pending').length;
  
  const getShift = (id: string) => {
    if (schedule[id]) return schedule[id];
    const shifts = ['Morning (06:00 - 14:00)', 'Afternoon (14:00 - 22:00)', 'Night (22:00 - 06:00)', 'Off Duty'];
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

  const handleRenewClick = (user: User) => {
      setSelectedUser(user);
      setRenewModalOpen(true);
  };

  const handleToggleDuty = (user: User) => {
    const newStatus = user.dutyStatus === 'On-Duty' ? 'Off-Duty' : 'On-Duty';
    dispatch({ type: 'UPDATE_USER', payload: { ...user, dutyStatus: newStatus } });
  };

  const handleLeaveAction = (id: string, action: 'Approve' | 'Reject') => {
      setRequests(prev => prev.map(req => {
          if (req.id === id) {
              return { ...req, status: action === 'Approve' ? 'Approved' : 'Rejected' };
          }
          return req;
      }));
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
                onClick={() => setNewHireModalOpen(true)}
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
                    <div className="text-2xl font-mono text-white mt-1">{pendingLeaveCount}</div>
                </div>
                <div className="bg-amber-500/10 p-2 rounded text-amber-400">
                    <Calendar size={20} />
                </div>
            </div>
        </div>

        {/* Leave Request Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Pending Leave Requests</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    {pendingLeaveCount} pending review
                </div>
            </div>
            <div className="divide-y divide-slate-800">
                {requests.filter(r => r.status === 'Pending').map(req => (
                    <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors" data-testid={`leave-req-${req.id}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white flex items-center gap-2">
                                    {req.name}
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-mono uppercase">
                                        {req.type}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    Requested dates: <span className="text-slate-300">{req.dates}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleLeaveAction(req.id, 'Reject')}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                                title="Reject"
                            >
                                <X size={18} />
                            </button>
                            <button 
                                onClick={() => handleLeaveAction(req.id, 'Approve')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/20"
                                title="Approve"
                            >
                                <Check size={14} />
                                Approve
                            </button>
                        </div>
                    </div>
                ))}
                {pendingLeaveCount === 0 && (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        <Check size={24} className="mx-auto mb-2 text-slate-600" />
                        All caught up! No pending leave requests.
                    </div>
                )}
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
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duty Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Shift</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {personnel.map((user) => {
                            const expired = isCertExpired(user.certExpiry);
                            const hasCerts = user.certifications && user.certifications.length > 0;
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
                                        {user.status === 'Inactive' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border text-slate-400 bg-slate-500/10 border-slate-500/20">
                                                Inactive
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleToggleDuty(user)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                                        user.dutyStatus === 'On-Duty' ? 'bg-emerald-500' : 'bg-slate-700'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                            user.dutyStatus === 'On-Duty' ? 'translate-x-5' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                                <span className="text-xs text-slate-300 font-medium">
                                                    {user.dutyStatus === 'On-Duty' ? 'On Duty' : 'Off Duty'}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <Clock size={14} className="text-slate-500" />
                                            {getShift(user.id)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {hasCerts && (
                                                <button 
                                                    onClick={() => handleRenewClick(user)}
                                                    data-testid={`renew-btn-${user.id}`}
                                                    className={`text-xs font-medium transition-colors flex items-center gap-1 px-2 py-1 rounded border ${
                                                        expired 
                                                            ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border-emerald-500/20" 
                                                            : "text-slate-400 hover:text-sky-400 bg-slate-800 border-slate-700"
                                                    }`}
                                                >
                                                    <RefreshCw size={12} />
                                                    Renew
                                                </button>
                                            )}
                                            <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors">
                                                Manage
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Payroll Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Payroll Preview (Current Period)</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <DollarSign size={12} />
                    Oct 01 - Oct 31
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-950 border-b border-slate-800">
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Hours</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rate</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Estimated Payout</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {personnel.map(user => {
                            // Mock payroll data based on user ID for consistency
                            const seed = user.id.charCodeAt(user.id.length - 1);
                            const hours = 140 + (seed % 40); // 140-180 hours
                            const rate = user.role === 'Pilot' ? 85 : user.role === 'Dispatcher' ? 45 : 35;
                            const payout = hours * rate;
                            
                            return (
                                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-white">{user.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-400">{user.role}</td>
                                    <td className="px-6 py-4 text-sm text-slate-300 text-right font-mono">{hours}</td>
                                    <td className="px-6 py-4 text-sm text-slate-300 text-right font-mono">${rate}/hr</td>
                                    <td className="px-6 py-4 text-sm text-emerald-400 text-right font-mono font-medium">
                                        ${payout.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        <RenewCertModal 
            isOpen={renewModalOpen} 
            onClose={() => setRenewModalOpen(false)} 
            user={selectedUser} 
        />

        <NewHireModal 
            isOpen={newHireModalOpen} 
            onClose={() => setNewHireModalOpen(false)} 
        />
    </div>
  );
}
