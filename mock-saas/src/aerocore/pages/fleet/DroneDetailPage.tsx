import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAero } from '../../lib/store';
import { ArrowLeft, MapPin, Cpu, Scale, Gauge, ShieldAlert, Wrench, RefreshCw, CheckCircle } from 'lucide-react';

function BatteryIndicator({ level }: { level: number }) {
  let colorClass = 'bg-emerald-500';
  if (level < 30) colorClass = 'bg-rose-500';
  else if (level < 70) colorClass = 'bg-amber-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-500`} 
          style={{ width: `${level}%` }}
        />
      </div>
      <span className={`text-sm font-mono ${level < 30 ? 'text-rose-400' : 'text-slate-400'}`}>
        {level}%
      </span>
    </div>
  );
}

export function DroneDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAero();
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'updating' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  
  const drone = state.drones.find(d => d.id === id);
  const activeIncident = drone?.assignedMissionId 
    ? state.incidents.find(i => i.id === drone.assignedMissionId) 
    : null;

  const toggleMaintenance = () => {
    if (!drone) return;
    const newStatus = drone.status === 'Maintenance' ? 'Ready' : 'Maintenance';
    dispatch({
        type: 'UPDATE_DRONE',
        payload: { ...drone, status: newStatus }
    });
  };

  const handleUpdateFirmware = () => {
    if (!drone || updateStatus !== 'idle') return;
    
    setUpdateStatus('checking');
    
    // Simulate check delay
    setTimeout(() => {
        setUpdateStatus('updating');
        setProgress(0);
        
        // Simulate download/install progress
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    
                    // Update complete
                    dispatch({
                        type: 'UPDATE_DRONE',
                        payload: { ...drone, firmwareVersion: 'v3.5.0-stable' }
                    });
                    setUpdateStatus('complete');
                    
                    // Reset after delay
                    setTimeout(() => {
                        setUpdateStatus('idle');
                        setProgress(0);
                    }, 3000);
                    
                    return 100;
                }
                return prev + 10;
            });
        }, 500);
    }, 1500);
  };

  const handleRecall = () => {
    if (!drone) return;
    dispatch({
        type: 'UPDATE_DRONE',
        payload: { 
            ...drone, 
            status: 'Ready',
            location: 'Base Alpha',
            assignedMissionId: undefined
        }
    });
  };

  if (!drone) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl text-white font-bold mb-4">Drone Not Found</h2>
        <button 
            onClick={() => navigate('/aerocore/fleet')}
            className="text-sky-400 hover:text-sky-300 underline"
        >
            Return to Fleet
        </button>
      </div>
    );
  }

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
      <div className="flex items-center gap-4">
        <Link to="/aerocore/fleet" className="p-2 bg-slate-800 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
        </Link>
        <div>
            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-white">{drone.model}</h2>
                <span className="text-slate-500 font-mono text-sm border border-slate-800 px-2 py-0.5 rounded">
                    ID: {drone.id}
                </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">Autonomous Unit Detail View</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Status & Live Data */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Live Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-6">Live Telemetry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="text-slate-500 text-sm mb-2">Operational Status</div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(drone.status)}`}>
                            {drone.status}
                        </span>
                    </div>
                    <div>
                        <div className="text-slate-500 text-sm mb-2">Battery Level</div>
                        <BatteryIndicator level={drone.battery} />
                    </div>
                    <div>
                         <div className="text-slate-500 text-sm mb-2">Current Location</div>
                         <div className="flex items-center gap-2 text-white">
                            <MapPin size={18} className="text-sky-500" />
                            <span>{drone.location}</span>
                         </div>
                    </div>
                    {activeIncident && (
                         <div>
                            <div className="text-slate-500 text-sm mb-2">Assigned Mission</div>
                            <div className="flex items-start gap-2 text-white bg-slate-950 p-3 rounded border border-slate-800">
                                <ShieldAlert size={18} className="text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium text-sm">{activeIncident.type} Incident</div>
                                    <div className="text-xs text-slate-400">{activeIncident.id}</div>
                                </div>
                            </div>
                         </div>
                    )}
                </div>
            </div>

            {/* Mission Map Placeholder */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg h-64 flex items-center justify-center relative overflow-hidden group">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 to-transparent opacity-50"></div>
                 <div className="text-center z-10">
                    <MapPin size={32} className="mx-auto text-slate-600 mb-2 group-hover:text-sky-500 transition-colors" />
                    <p className="text-slate-500 text-sm">Live GPS Feed Inactive</p>
                    <p className="text-slate-600 text-xs">Connecting to satellite link...</p>
                 </div>
            </div>
        </div>

        {/* Right Column: Technical Specs */}
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-6">Technical Specs</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3 text-slate-300">
                            <Gauge size={18} className="text-slate-500" />
                            <span className="text-sm">Max Speed</span>
                        </div>
                        <span className="font-mono text-white">{drone.maxSpeed} km/h</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3 text-slate-300">
                            <Scale size={18} className="text-slate-500" />
                            <span className="text-sm">Payload Cap.</span>
                        </div>
                        <span className="font-mono text-white">{drone.payloadCapacity}</span>
                    </div>

                    <div className="border-b border-slate-800 pb-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Cpu size={18} className="text-slate-500" />
                                <span className="text-sm">Firmware</span>
                            </div>
                            <span className="font-mono text-white">{drone.firmwareVersion}</span>
                        </div>
                        
                        {/* Update Workflow */}
                        <div className="pl-8">
                            {updateStatus === 'idle' && (
                                <button 
                                    onClick={handleUpdateFirmware}
                                    className="text-xs text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
                                >
                                    Check for Updates
                                </button>
                            )}
                            
                            {updateStatus === 'checking' && (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <RefreshCw size={12} className="animate-spin" />
                                    Checking repository...
                                </div>
                            )}

                            {updateStatus === 'updating' && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span>Installing v3.5.0...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-sky-500 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {updateStatus === 'complete' && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <CheckCircle size={12} />
                                    Update Successful
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Actions</h3>
                <div className="space-y-3">
                    <button className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm transition-colors border border-slate-700">
                        Initiate Diagnostics
                    </button>
                    <button 
                        onClick={handleRecall}
                        disabled={drone.status !== 'In-Flight'}
                        className={`w-full py-2 px-4 rounded text-sm transition-colors border ${
                            drone.status === 'In-Flight'
                                ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-600'
                                : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        Recall to Base
                    </button>
                    
                    <button 
                        onClick={toggleMaintenance}
                        disabled={drone.status === 'In-Flight'}
                        className={`w-full py-2 px-4 rounded text-sm transition-colors border flex items-center justify-center gap-2 ${
                            drone.status === 'Maintenance' 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                        <Wrench size={16} />
                        {drone.status === 'Maintenance' ? 'Exit Maintenance' : 'Set to Maintenance'}
                    </button>

                    <button className="w-full py-2 px-4 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded text-sm transition-colors">
                        Emergency Land
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
