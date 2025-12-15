import React, { useState } from 'react';
import { useAero } from '../../lib/store';
import type { User } from '../../lib/types';
import { Plus, Search, Shield, Trash2, Edit } from 'lucide-react';

export function AdminPage() {
  const { state, dispatch } = useAero();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'Pilot', status: 'Active' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
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
    setIsModalOpen(false);
    setNewUser({ role: 'Pilot', status: 'Active' });
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">System Administration</h2>
            <button 
                onClick={() => setIsModalOpen(true)}
                data-testid="admin-create-user-btn"
                className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
            >
                <Plus size={16} /> New User
            </button>
        </div>

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
                        <tr key={user.id} className="hover:bg-slate-800/50 group">
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
                                <span className="inline-flex items-center gap-1.5 text-slate-300 text-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {user.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500">
                                <button 
                                    data-testid={`admin-edit-user-${user.id}`}
                                    className="p-1 hover:text-sky-400 transition-colors"
                                >
                                    <Edit size={14} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Create Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[400px] p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Create New User</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
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
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}
