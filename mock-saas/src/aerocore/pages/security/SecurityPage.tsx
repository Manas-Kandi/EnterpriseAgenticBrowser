import { useState, useRef } from 'react';
import { Lock, Unlock, AlertTriangle, FileText, CheckCircle, XCircle, Radio, Eye } from 'lucide-react';
import { useAero } from '../../lib/store';

// Types
type Camera = {
  id: number;
  name: string;
  status: 'ACTIVE' | 'OFFLINE' | 'ALERT' | 'DRONE_EN_ROUTE';
};

type AccessPoint = {
  id: number;
  name: string;
  type: 'Door' | 'Gate';
  location: string;
  isLocked: boolean;
};

type BioScan = {
  id: number;
  userId: string;
  userName: string;
  timestamp: string;
  status: 'Authorized' | 'Denied';
  location: string;
  scanType: 'Facial' | 'Fingerprint' | 'Retina';
};

type SensorLog = {
  id: number;
  timestamp: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'MOTION' | 'DOOR' | 'ENVIRONMENT';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
};

export function SecurityPage() {
  const { dispatch } = useAero();
  
  // -- State --
  const [activeTab, setActiveTab] = useState<'cameras' | 'access' | 'bioscan'>('cameras');
  const [cameras, setCameras] = useState<Camera[]>([
    { id: 1, name: "North Entrance", status: "ACTIVE" },
    { id: 2, name: "South Entrance", status: "ACTIVE" },
    { id: 3, name: "Loading Dock A", status: "ACTIVE" },
    { id: 4, name: "Loading Dock B", status: "ACTIVE" },
    { id: 5, name: "Perimeter Fence", status: "ACTIVE" },
    { id: 6, name: "Storage Area", status: "ACTIVE" }
  ]);
  
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([
    { id: 1, name: "Main Entrance", type: "Door", location: "Building A", isLocked: true },
    { id: 2, name: "North Gate", type: "Gate", location: "Perimeter", isLocked: true },
    { id: 3, name: "Loading Dock A", type: "Door", location: "Warehouse", isLocked: false },
    { id: 4, name: "Loading Dock B", type: "Door", location: "Warehouse", isLocked: true },
    { id: 5, name: "South Gate", type: "Gate", location: "Perimeter", isLocked: true },
    { id: 6, name: "Server Room", type: "Door", location: "Building B", isLocked: true },
    { id: 7, name: "Emergency Exit", type: "Door", location: "All Buildings", isLocked: false },
    { id: 8, name: "Vehicle Bay", type: "Gate", location: "Garage", isLocked: false }
  ]);

  const [bioScans, setBioScans] = useState<BioScan[]>([
    { id: 1, userId: 'u1', userName: 'Admin User', timestamp: new Date(Date.now() - 300000).toLocaleTimeString(), status: 'Authorized', location: 'Main Entrance', scanType: 'Facial' },
    { id: 2, userId: 'u2', userName: 'Sarah Connor', timestamp: new Date(Date.now() - 600000).toLocaleTimeString(), status: 'Authorized', location: 'North Gate', scanType: 'Fingerprint' },
    { id: 3, userId: 'unknown', userName: 'Unknown Person', timestamp: new Date(Date.now() - 900000).toLocaleTimeString(), status: 'Denied', location: 'South Gate', scanType: 'Retina' },
  ]);

  const [sensorLogs, setSensorLogs] = useState<SensorLog[]>([
    { id: 1, timestamp: new Date(Date.now() - 7200000).toLocaleTimeString(), message: "System initialized - All sensors online", type: "INFO", severity: "Low" },
    { id: 2, timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(), message: "Motion detected - Sector 4", type: "MOTION", severity: "Medium" },
    { id: 3, timestamp: new Date(Date.now() - 1800000).toLocaleTimeString(), message: "Door Open - Sector 1", type: "DOOR", severity: "High" },
  ]);

  const [isLockdownActive, setIsLockdownActive] = useState(false);
  const [showLockdownModal, setShowLockdownModal] = useState(false);
  const [showShiftReport, setShowShiftReport] = useState(false);
  // removed unused alertCameraId

  const logContainerRef = useRef<HTMLDivElement>(null);

  // -- Helpers --
  const addLog = (message: string, type: SensorLog['type'], severity: SensorLog['severity'] = 'Low') => {
    const newLog: SensorLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
      severity
    };
    setSensorLogs(prev => [newLog, ...prev]);
  };

  const getCurrentTimestamp = () => {
    return new Date().toLocaleString('en-US', { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  // -- Actions --

  // Task 4: Trigger Alert
  const simulateBreach = () => {
    const randomCameraId = Math.floor(Math.random() * cameras.length) + 1;
    // setAlertCameraId(randomCameraId); // Unused
    
    setCameras(prev => prev.map(c => 
      c.id === randomCameraId ? { ...c, status: 'ALERT' } : c
    ));

    addLog(`BREACH CONFIRMED - ${cameras.find(c => c.id === randomCameraId)?.name}`, 'ALERT', 'Critical');
    
    // Auto-resolve after 15s for demo purposes
    setTimeout(() => {
      // setAlertCameraId(null);
      setCameras(prev => prev.map(c => 
        c.id === randomCameraId && c.status === 'ALERT' ? { ...c, status: 'ACTIVE' } : c
      ));
    }, 15000);
  };

  // Task 5: Dispatch Drone
  const deployDrone = (cameraId: number) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;

    // Update Global Store
    dispatch({ 
      type: 'ADD_INCIDENT', 
      payload: {
        id: `inc_${Date.now()}`,
        type: 'Security',
        priority: 'High',
        status: 'Dispatched',
        location: camera.name,
        description: `Security breach detected at ${camera.name}. Drone deployed.`,
        timestamp: new Date().toLocaleString()
      }
    });

    // Update Local State
    setCameras(prev => prev.map(c => 
      c.id === cameraId ? { ...c, status: 'DRONE_EN_ROUTE' } : c
    ));

    addLog(`DRONE DEPLOYED - ${camera.name}`, 'INFO', 'Medium');
  };

  // Task 6: Access Control
  const toggleLock = (id: number) => {
    if (isLockdownActive) return; // Prevent unlocking during lockdown

    setAccessPoints(prev => prev.map(p => {
      if (p.id === id) {
        const newStatus = !p.isLocked;
        addLog(`${p.name} ${newStatus ? 'LOCKED' : 'UNLOCKED'}`, 'DOOR', 'Low');
        return { ...p, isLocked: newStatus };
      }
      return p;
    }));
  };

  // Task 7: Simulate Bio Scan
  const simulateBioScan = () => {
    const isAuth = Math.random() > 0.3;
    const scan: BioScan = {
      id: Date.now(),
      userId: isAuth ? `u${Math.floor(Math.random() * 5)}` : 'unknown',
      userName: isAuth ? 'Authorized Personnel' : 'Unknown Subject',
      timestamp: new Date().toLocaleTimeString(),
      status: isAuth ? 'Authorized' : 'Denied',
      location: accessPoints[Math.floor(Math.random() * accessPoints.length)].name,
      scanType: 'Facial'
    };
    
    setBioScans(prev => [scan, ...prev]);
    addLog(`Bio-Scan ${scan.status} at ${scan.location}`, 'INFO', isAuth ? 'Low' : 'High');
  };

  // Task 8: System Lockdown
  const initiateLockdown = () => {
    setIsLockdownActive(true);
    setShowLockdownModal(false);
    
    // Lock all doors
    setAccessPoints(prev => prev.map(p => ({ ...p, isLocked: true })));
    
    addLog("SYSTEM LOCKDOWN INITIATED - ALL POINTS SECURED", "ALERT", "Critical");
    
    dispatch({
      type: 'ADD_INCIDENT',
      payload: {
        id: `inc_lockdown_${Date.now()}`,
        type: 'Security',
        priority: 'Critical',
        status: 'Dispatched',
        location: 'Facility Wide',
        description: 'SYSTEM LOCKDOWN INITIATED',
        timestamp: new Date().toLocaleString()
      }
    });
  };

  const releaseLockdown = () => {
    setIsLockdownActive(false);
    addLog("System Lockdown Released", "INFO", "High");
  };

  return (
    <div className={`space-y-6 transition-colors duration-500 ${isLockdownActive ? 'p-4 rounded-xl bg-red-950/10' : ''}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${isLockdownActive ? 'text-red-500' : 'text-white'}`}>
            SecurePerimeter {isLockdownActive && "- LOCKDOWN ACTIVE"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Surveillance and threat detection systems.</p>
        </div>
        
        <div className="flex gap-3">
          {!isLockdownActive ? (
            <button
              onClick={() => setShowLockdownModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 animate-pulse"
            >
              <AlertTriangle size={18} /> INITIATE LOCKDOWN
            </button>
          ) : (
             <button
              onClick={releaseLockdown}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Release Lockdown
            </button>
          )}

          <button
            onClick={() => setShowShiftReport(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
          >
            <FileText size={16} /> Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('cameras')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'cameras' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Camera Grid
        </button>
        <button
          onClick={() => setActiveTab('access')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'access' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Access Control
        </button>
        <button
          onClick={() => setActiveTab('bioscan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bioscan' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Bio-Scan
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column (Content based on Tab) */}
        <div className="lg:col-span-3">
          
          {/* CAMERA GRID TAB */}
          {activeTab === 'cameras' && (
            <div className="space-y-4">
               <div className="flex justify-end">
                <button 
                  onClick={simulateBreach}
                  data-testid="simulate-breach-button"
                  className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                  Debug: Simulate Breach
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cameras.map((camera) => (
                  <div 
                    key={camera.id} 
                    data-testid={`camera-${camera.id}`}
                    className={`relative bg-slate-900 border rounded-lg overflow-hidden transition-all duration-300 ${
                      camera.status === 'ALERT' ? 'border-red-500 ring-2 ring-red-500/50' : 
                      isLockdownActive ? 'border-red-900 opacity-75' : 'border-slate-800'
                    }`}
                  >
                    <div className="aspect-video bg-slate-950 relative">
                      <img 
                        src={`https://picsum.photos/seed/industrial${camera.id}/640/360.jpg`}
                        alt={camera.name}
                        className={`w-full h-full object-cover ${camera.status === 'OFFLINE' ? 'opacity-20' : 'opacity-80'}`}
                      />
                      
                      {/* Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-between p-3">
                        <div className="flex justify-between items-start">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded ${camera.status === 'ALERT' ? 'bg-red-600' : 'bg-red-600/80'}`}>
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="text-white text-xs font-bold">REC</span>
                          </div>
                          
                          {camera.status === 'ALERT' && (
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                              ALERT
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-white text-sm font-medium">{camera.name}</p>
                            <p className={`text-xs ${
                              camera.status === 'ALERT' ? 'text-red-400 font-bold' : 
                              camera.status === 'DRONE_EN_ROUTE' ? 'text-orange-400' : 'text-green-400'
                            }`}>
                              {camera.status.replace('_', ' ')}
                            </p>
                          </div>
                          <span className="text-white/60 text-xs font-mono">{getCurrentTimestamp()}</span>
                        </div>
                      </div>

                      {/* Drone Button Overlay */}
                      {camera.status === 'ALERT' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                          <button
                            onClick={() => deployDrone(camera.id)}
                            data-testid="deploy-drone-button"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg"
                          >
                            <Radio size={16} /> Deploy Drone
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACCESS CONTROL TAB */}
          {activeTab === 'access' && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="text-white font-semibold">Facility Access Points</h3>
                {isLockdownActive && <span className="text-red-500 font-bold text-sm">LOCKDOWN OVERRIDE ACTIVE</span>}
              </div>
              <div className="divide-y divide-slate-800">
                {accessPoints.map((point) => (
                  <div key={point.id} className={`p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors ${isLockdownActive ? 'opacity-75 cursor-not-allowed' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${point.isLocked ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {point.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{point.name}</h4>
                        <p className="text-slate-400 text-xs">{point.type} • {point.location}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLock(point.id)}
                      disabled={isLockdownActive}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                        point.isLocked 
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                          : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                      } ${isLockdownActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {point.isLocked ? 'LOCKED' : 'UNLOCKED'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BIO-SCAN TAB */}
          {activeTab === 'bioscan' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button 
                  onClick={simulateBioScan}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium"
                >
                  Simulate New Scan
                </button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                  <h3 className="text-white font-semibold">Recent Biometric Scans</h3>
                </div>
                <div className="divide-y divide-slate-800">
                  {bioScans.map((scan) => (
                    <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                           <img 
                            src={`https://picsum.photos/seed/${scan.userId}/100/100`}
                            alt="User"
                            className="w-10 h-10 rounded-full object-cover border border-slate-700"
                          />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${scan.status === 'Authorized' ? 'bg-green-500' : 'bg-red-500'}`}>
                            {scan.status === 'Authorized' ? <CheckCircle size={10} className="text-white" /> : <XCircle size={10} className="text-white" />}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{scan.userName}</h4>
                          <div className="flex gap-2 text-xs text-slate-400">
                            <span>{scan.scanType}</span>
                            <span>•</span>
                            <span>{scan.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          scan.status === 'Authorized' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {scan.status.toUpperCase()}
                        </span>
                        <p className="text-slate-500 text-xs mt-1 font-mono">{scan.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* SENSOR LOG */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col h-[500px]">
             <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <Eye size={16} className="text-blue-400" /> Sensor Log
            </h3>
            <div 
              className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar" 
              ref={logContainerRef}
              data-testid="sensor-log"
            >
              {sensorLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-slate-700 pl-3 py-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-slate-500 text-xs font-mono">{log.timestamp}</span>
                    <span className={`text-[10px] px-1.5 rounded ${
                      log.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      log.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {log.severity}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">{log.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* STATUS CARD */}
          <div className={`bg-slate-900 border rounded-lg p-4 ${isLockdownActive ? 'border-red-500 bg-red-950/20' : 'border-slate-800'}`}>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">System Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Lockdown Status</span>
                <span className={`font-medium ${isLockdownActive ? 'text-red-500' : 'text-green-500'}`}>
                  {isLockdownActive ? 'ACTIVE' : 'NORMAL'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Cameras Online</span>
                <span className="text-white">6/6</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300">Active Incidents</span>
                <span className="text-white">0</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* -- MODALS -- */}

      {/* Lockdown Confirmation Modal */}
      {showLockdownModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-lg max-w-md w-full p-6 shadow-2xl shadow-red-900/20">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-bold text-white">CONFIRM LOCKDOWN</h3>
            </div>
            <p className="text-slate-300 mb-6 leading-relaxed">
              This will immediately lock all access points, notify local authorities, and restrict system access. Are you sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLockdownModal(false)}
                className="flex-1 px-4 py-2 bg-slate-800 text-white font-medium rounded hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={initiateLockdown}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
              >
                CONFIRM LOCKDOWN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Report Modal */}
      {showShiftReport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-500" /> Security Shift Report
              </h3>
              <button onClick={() => setShowShiftReport(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-800 rounded p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-slate-400 text-xs">Total Alerts (8h)</p>
                  <p className="text-2xl font-bold text-white">{sensorLogs.length}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Critical Incidents</p>
                  <p className="text-2xl font-bold text-red-400">{sensorLogs.filter(l => l.severity === 'Critical').length}</p>
                </div>
                 <div>
                  <p className="text-slate-400 text-xs">System Status</p>
                  <p className="text-2xl font-bold text-green-400">98%</p>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">Event Summary</h4>
                <div className="space-y-2">
                  {sensorLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="text-sm border-b border-slate-800 pb-2">
                      <span className="text-slate-500 font-mono mr-3">{log.timestamp}</span>
                      <span className={log.severity === 'Critical' ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowShiftReport(false)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-500 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}