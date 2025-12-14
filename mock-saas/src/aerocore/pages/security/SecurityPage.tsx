import { Shield, Camera, AlertTriangle, CheckCircle } from 'lucide-react';

export function SecurityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">SecurePerimeter</h2>
          <p className="text-slate-400 text-sm mt-1">Surveillance and threat detection systems.</p>
          <span className="inline-flex items-center gap-2 text-xs text-green-400 mt-2">
            <Shield size={14} />
            Systems Online
          </span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-10 rounded-lg text-center">
        <p className="text-slate-400">SecurePerimeter Dashboard Initialized</p>
      </div>
    </div>
  );
}
