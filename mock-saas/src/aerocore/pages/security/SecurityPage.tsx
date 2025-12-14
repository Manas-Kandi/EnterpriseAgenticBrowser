import { Shield } from 'lucide-react';

export function SecurityPage() {
  const cameras = [
    { id: 1, name: "North Entrance", status: "ACTIVE" },
    { id: 2, name: "South Entrance", status: "ACTIVE" },
    { id: 3, name: "Loading Dock A", status: "ACTIVE" },
    { id: 4, name: "Loading Dock B", status: "ACTIVE" },
    { id: 5, name: "Perimeter Fence", status: "ACTIVE" },
    { id: 6, name: "Storage Area", status: "ACTIVE" }
  ];

  const getCurrentTimestamp = () => {
    return new Date().toLocaleString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((camera) => (
          <div key={camera.id} className="relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="aspect-video bg-slate-950 relative">
              <img 
                src={`https://picsum.photos/seed/industrial${camera.id}/640/360.jpg`}
                alt={camera.name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-red-600 px-2 py-1 rounded">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-bold">REC</span>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                  <div>
                    <p className="text-white text-sm font-medium">{camera.name}</p>
                    <p className="text-green-400 text-xs">{camera.status}</p>
                  </div>
                  <p className="text-white text-xs font-mono">
                    {getCurrentTimestamp()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
