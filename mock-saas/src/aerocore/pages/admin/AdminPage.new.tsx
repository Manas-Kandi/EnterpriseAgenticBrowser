import React, { useState } from 'react';
import { useAero } from '../../lib/store';
import type { User } from '../../lib/types';
import { Plus, Search, Shield, Trash2, Edit, RefreshCw, Lock, CheckSquare, Square, Key, Activity, Server, Database, Wifi, Settings } from 'lucide-react';

export function AdminPage() {
  const { state, dispatch } = useAero();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'system' | 'settings'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'Pilot', status: 'Active' });
  const [resetPassword, setResetPassword] = useState<{name: string, tempPass: string} | null>(null);
  
  // Global Settings State
  const [settings, setSettings] = useState({
      companyName: 'AeroCore Logistics',
      timezone: 'UTC-06:00',
      securityLevel: 'High'
  });

  // System Health Mock Data
  const systemMetrics = {
      serverStatus: 'Online',
      uptime: '99.98%',
      dbLatency: '12ms',
      apiLatency: '45ms',
      activeConnections: 1240,
      load: [45, 52, 48, 60, 55, 67, 70, 65, 50, 45, 42, 48] // Mock load data for graph
  };

  // Permissions Matrix Mock Data
  const apps = ['Admin', 'Dispatch', 'Fleet', 'Workforce', 'Cargo', 'Security'];
  const roles = ['Admin', 'Dispatcher', 'Pilot', 'Manager', 'Security'];
  const defaultPermissions: Record<string, string[]> = {
      'Admin': ['Admin', 'Dispatch', 'Fleet', 'Workforce', 'Cargo', 'Security'],
      'Dispatcher': ['Dispatch', 'Fleet', 'Cargo'],
      'Pilot': ['Fleet', 'Workforce'],
      'Manager': ['Dispatch', 'Fleet', 'Workforce', 'Cargo'],
      'Security': ['Security', 'Dispatch']
  };

  const handleEdit = (user: User) => {
      setNewUser(user);
      setIsModalOpen(true);
  };

  const handleToggleStatus = (user: User) => {
      const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
      dispatch({
          type: 'UPDATE_USER',
          payload: { ...user, status: newStatus }
      });
  };

  const handleResetPassword = (user: User) => {
      const tempPass = `temp-${Math.random().toString(36).slice(-8)}`;
      setResetPassword({ name: user.name, tempPass });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
    if (newUser.id) {
        // Edit Mode
        dispatch({
            type: 'UPDATE_USER',
            payload: newUser as User
        });
    } else {
        // Create Mode
        dispatch({
            type: 'ADD_USER',
            payload: {
                id: `u${Date.now()}`,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role as any,
                status: 'Active'
            }
        });
    }
    setIsModalOpen(false);
    setNewUser({ role: 'Pilot', status: 'Active' });
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">System Administration</h2>
            {activeTab === 'users' && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    data-testid="admin-create-user-btn"
                    className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus size={16} /> New User
                </button>
            )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 border-b border-slate-800">
            <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
                User Management
            </button>
            <button 
                onClick={() => setActiveTab('permissions')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'permissions' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
                Role Permissions
            </button>
            <button 
                onClick={() => setActiveTab('system')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'system' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
                System Health
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
                Global Settings
            </button>
        </div>

        {activeTab === 'users' && (
            <>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                        <div className="text-slate-500 text-xs uppercase font-semibold">Total Users</div>
                        <div className="text-2xl font-mono text-white mt-1">{state.users.length}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                        <div className="text-slate-500 text-xs uppercase font-semibold">Active Pilots</div>
                        <div className="text-2xl font-mono text-emerald-400 mt-1">{state.users.filter(u => u.role === 'Pilot').length}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                        <div className="text-slate-500 text-xs uppercase font-semibold">Dispatchers</div>
                        <div className="text-2xl font-mono text-amber-400 mt-1">{state.users.filter(u => u.role === 'Dispatcher').length}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                        <div className="text-slate-500 text-xs uppercase font-semibold">Admins</div>
                        <div className="text-2xl font-mono text-rose-400 mt-1">{state.users.filter(u => u.role === 'Admin').length}</div>
                    </div>
                </div>

                {/* User Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                                data-testid="admin-search-input"
                                className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                                placeholder="Search users..."
                            />
                        </div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {state.users.map(user => (
                                <tr key={user.id} className={`hover:bg-slate-800/50 group transition-colors ${user.status === 'Inactive' ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div>
                                            <div className="font-medium text-slate-200" data-testid={`user-name-${user.id}`}>{user.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border
                                            ${user.role === 'Admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                            user.role === 'Pilot' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                            }
                                        `}>
                                            {user.role === 'Admin' && <Shield size={10} />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 text-xs ${user.status === 'Active' ? 'text-slate-300' : 'text-slate-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-500 flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleResetPassword(user)}
                                            data-testid={`admin-reset-pass-${user.id}`}
                                            className="p-1 hover:text-amber-400 transition-colors"
                                            title="Reset Password"
                                        >
                                            <Key size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(user)}
                                            data-testid={`admin-edit-user-${user.id}`}
                                            className="p-1 hover:text-sky-400 transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleToggleStatus(user)}
                                            data-testid={`admin-toggle-status-${user.id}`}
                                            className={`p-1 transition-colors ${user.status === 'Active' ? 'hover:text-rose-400' : 'hover:text-emerald-400 text-slate-600'}`}
                                            title={user.status === 'Active' ? 'Deactivate User' : 'Reactivate User'}
                                        >
                                            {user.status === 'Active' ? <Trash2 size={14} /> : <RefreshCw size={14} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {activeTab === 'permissions' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Lock size={16} className="text-sky-400" />
                        Role Access Matrix
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Configure application access for each user role.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3 uppercase text-xs tracking-wider">Role</th>
                                {apps.map(app => (
                                    <th key={app} className="px-6 py-3 text-center uppercase text-xs tracking-wider">{app}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {roles.map(role => (
                                <tr key={role} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        {role}
                                    </td>
                                    {apps.map(app => {
                                        const hasAccess = defaultPermissions[role]?.includes(app);
                                        return (
                                            <td key={app} className="px-6 py-4 text-center">
                                                <button className={`transition-colors ${hasAccess ? 'text-emerald-400' : 'text-slate-700'}`}>
                                                    {hasAccess ? <CheckSquare size={18} /> : <Square size={18} />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'system' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Server size={20} className="text-emerald-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-300">Server Status</span>
                        </div>
                        <div className="text-2xl font-mono text-white flex items-center gap-2">
                            {systemMetrics.serverStatus}
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Uptime: {systemMetrics.uptime}</div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-sky-500/10 rounded-lg">
                                <Database size={20} className="text-sky-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-300">Database</span>
                        </div>
                        <div className="text-2xl font-mono text-white">{systemMetrics.dbLatency}</div>
                        <div className="text-xs text-slate-500 mt-1">Average Latency</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <Activity size={20} className="text-amber-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-300">API Response</span>
                        </div>
                        <div className="text-2xl font-mono text-white">{systemMetrics.apiLatency}</div>
                        <div className="text-xs text-slate-500 mt-1">95th Percentile</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-violet-500/10 rounded-lg">
                                <Wifi size={20} className="text-violet-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-300">Connections</span>
                        </div>
                        <div className="text-2xl font-mono text-white">{systemMetrics.activeConnections}</div>
                        <div className="text-xs text-slate-500 mt-1">Active Sessions</div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-white mb-6">System Load (Last Hour)</h3>
                    <div className="h-40 flex items-end gap-2">
                        {systemMetrics.load.map((val, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end gap-2 group">
                                <div 
                                    className="bg-sky-500/20 hover:bg-sky-500/40 transition-colors rounded-t-sm relative"
                                    style={{ height: `${val}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {val}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                        <span>60m ago</span>
                        <span>Now</span>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <Settings size={20} className="text-sky-400" />
                    <h3 className="text-lg font-bold text-white">Global Configuration</h3>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Company Name</label>
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                            value={settings.companyName}
                            onChange={e => setSettings({...settings, companyName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Timezone</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                            value={settings.timezone}
                            onChange={e => setSettings({...settings, timezone: e.target.value})}
                        >
                            <option value="UTC-08:00">Pacific Time (US & Canada)</option>
                            <option value="UTC-06:00">Central Time (US & Canada)</option>
                            <option value="UTC-05:00">Eastern Time (US & Canada)</option>
                            <option value="UTC+00:00">UTC</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Security Level</label>
                        <div className="flex gap-4 mt-2">
                            {['Low', 'Medium', 'High'].map(level => (
                                <label key={level} className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="securityLevel"
                                        value={level}
                                        checked={settings.securityLevel === level}
                                        onChange={e => setSettings({...settings, securityLevel: e.target.value})}
                                        className="text-sky-600 focus:ring-sky-500 bg-slate-950 border-slate-800"
                                    />
                                    <span className="text-sm text-slate-300">{level}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-800">
                        <button className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[400px] p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                        {newUser.id ? 'Edit User' : 'Create New User'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Full Name</label>
                            <input 
                                autoFocus
                                data-testid="admin-input-name"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                value={newUser.name || ''}
                                onChange={e => setNewUser({...newUser, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Email Address</label>
                            <input 
                                data-testid="admin-input-email"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                value={newUser.email || ''}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Role</label>
                            <select 
                                data-testid="admin-select-role"
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                            >
                                <option value="Pilot">Pilot</option>
                                <option value="Dispatcher">Dispatcher</option>
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="Security">Security</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                data-testid="admin-submit-user"
                                className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                            >
                                {newUser.id ? 'Update User' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Password Reset Modal */}
        {resetPassword && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[400px] p-6 text-center">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                        <Key size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Password Reset Successful</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Temporary password for <span className="text-white font-medium">{resetPassword.name}</span>:
                    </p>
                    <div className="bg-slate-950 border border-slate-800 rounded p-4 mb-6 font-mono text-xl text-emerald-400 select-all" data-testid="temp-password-display">
                        {resetPassword.tempPass}
                    </div>
                    <button 
                        onClick={() => setResetPassword(null)}
                        data-testid="close-reset-modal"
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
