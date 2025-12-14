import { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle } from 'lucide-react';
import { useAero } from '../../lib/store';
import type { User } from '../../lib/types';

interface RenewCertModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function RenewCertModal({ isOpen, onClose, user }: RenewCertModalProps) {
  const { dispatch } = useAero();
  const [selectedCert, setSelectedCert] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (isOpen && user) {
        // Default to first cert or empty
        if (user.certifications && user.certifications.length > 0) {
            setSelectedCert(user.certifications[0]);
        }
        // Default date: 1 year from now
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        setExpiryDate(nextYear.toISOString().split('T')[0]);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleRenew = () => {
    if (!expiryDate) return;

    // Update the user's certification expiry
    const updatedUser: User = {
        ...user,
        certExpiry: expiryDate
    };

    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <h3 className="text-lg font-semibold text-white">Renew Certification</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
            <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Employee</label>
                <div className="text-white font-medium">{user.name}</div>
                <div className="text-sm text-slate-500">{user.role}</div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Certification to Renew</label>
                <select 
                    value={selectedCert}
                    onChange={(e) => setSelectedCert(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                    {user.certifications?.map(cert => (
                        <option key={cert} value={cert}>{cert}</option>
                    ))}
                    {!user.certifications?.length && <option value="">No Certifications</option>}
                </select>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">New Expiry Date</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input 
                        type="date" 
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-3 py-2 text-white focus:outline-none focus:border-sky-500 appearance-none"
                    />
                </div>
            </div>
        </div>

        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleRenew}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
          >
            <CheckCircle size={16} />
            Renew
          </button>
        </div>
      </div>
    </div>
  );
}
