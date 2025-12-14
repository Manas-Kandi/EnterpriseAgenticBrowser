import { useState } from 'react';
import { X, CheckCircle, ArrowRight, User as UserIcon, Shield, Plane, Radio, Briefcase } from 'lucide-react';
import { useAero } from '../../lib/store';
import type { User } from '../../lib/types';

interface NewHireModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewHireModal({ isOpen, onClose }: NewHireModalProps) {
  const { dispatch } = useAero();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Pilot' as User['role'],
    certifications: [] as string[]
  });

  if (!isOpen) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = () => {
    const newUser: User = {
        id: `u${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: 'Active',
        dutyStatus: 'Off-Duty',
        certifications: formData.certifications,
        certExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    };
    dispatch({ type: 'ADD_USER', payload: newUser });
    onClose();
    // Reset form
    setStep(1);
    setFormData({ name: '', email: '', role: 'Pilot', certifications: [] });
  };

  const toggleCert = (cert: string) => {
      setFormData(prev => {
          const certs = prev.certifications.includes(cert)
              ? prev.certifications.filter(c => c !== cert)
              : [...prev.certifications, cert];
          return { ...prev, certifications: certs };
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                  {[1, 2, 3].map(s => (
                      <div key={s} className={`w-2 h-2 rounded-full ${step >= s ? 'bg-sky-500' : 'bg-slate-700'}`} />
                  ))}
              </div>
              <h3 className="text-lg font-semibold text-white">Onboarding Wizard</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 min-h-[300px]">
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-md font-medium text-white flex items-center gap-2">
                        <UserIcon size={18} className="text-sky-400" />
                        Personal Information
                    </h4>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Full Name</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Email Address</label>
                        <input 
                            type="email" 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                            placeholder="e.g. j.doe@aerocore.com"
                        />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-md font-medium text-white flex items-center gap-2">
                        <Briefcase size={18} className="text-sky-400" />
                        Role Selection
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {['Pilot', 'Dispatcher', 'Security', 'Manager'].map((role) => (
                            <button
                                key={role}
                                onClick={() => setFormData({...formData, role: role as any})}
                                className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                                    formData.role === role 
                                        ? 'bg-sky-500/10 border-sky-500 text-sky-400' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                                }`}
                            >
                                {role === 'Pilot' && <Plane size={24} />}
                                {role === 'Dispatcher' && <Radio size={24} />}
                                {role === 'Security' && <Shield size={24} />}
                                {role === 'Manager' && <Briefcase size={24} />}
                                <span className="text-sm font-medium">{role}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-md font-medium text-white flex items-center gap-2">
                        <CheckCircle size={18} className="text-sky-400" />
                        Initial Certifications
                    </h4>
                    <p className="text-xs text-slate-400">Select all valid certifications for this new hire.</p>
                    <div className="space-y-2">
                        {['Pilot License A', 'Pilot License B', 'Night Flight', 'Dispatcher L1', 'Crisis Mgmt', 'Security Clearance', 'First Aid'].map(cert => (
                            <label key={cert} className="flex items-center gap-3 p-3 bg-slate-800 rounded border border-slate-700 cursor-pointer hover:bg-slate-750">
                                <input 
                                    type="checkbox"
                                    checked={formData.certifications.includes(cert)}
                                    onChange={() => toggleCert(cert)}
                                    className="w-4 h-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-900"
                                />
                                <span className="text-sm text-slate-200">{cert}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          {step > 1 ? (
              <button onClick={handleBack} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
                  Back
              </button>
          ) : <div></div>}
          
          {step < 3 ? (
              <button 
                onClick={handleNext}
                disabled={!formData.name || !formData.email}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-md flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
                <ArrowRight size={16} />
              </button>
          ) : (
              <button 
                onClick={handleSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
              >
                <CheckCircle size={16} />
                Complete Onboarding
              </button>
          )}
        </div>
      </div>
    </div>
  );
}
