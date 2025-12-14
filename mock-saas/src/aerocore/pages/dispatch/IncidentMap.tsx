import { useAero } from '../../lib/store';
import { Navigation, MapPin, AlertCircle, Crosshair } from 'lucide-react';

// Mock coordinate mapping for our "Sector Map"
// Coordinates are in percentages (0-100)
const LOCATION_MAP: Record<string, { x: number; y: number }> = {
    'Sector 4': { x: 75, y: 25 },
    'Base Alpha': { x: 15, y: 85 },
    'Hangar B': { x: 25, y: 80 },
    'Downtown': { x: 50, y: 50 },
    'North Outpost': { x: 50, y: 15 },
    'South Yards': { x: 50, y: 85 },
    'West District': { x: 15, y: 50 },
    'East Port': { x: 85, y: 50 },
};

function getCoordinates(location: string) {
    return LOCATION_MAP[location] || { x: 50, y: 50 }; // Default to center
}

interface IncidentMapProps {
    onSelectIncident?: (id: string) => void;
}

export function IncidentMap({ onSelectIncident }: IncidentMapProps) {
    const { state } = useAero();

    return (
        <div className="relative h-full w-full group bg-slate-950/50">
            {/* Grid Background Pattern */}
            <div className="absolute inset-0 opacity-20" 
                style={{
                    backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            ></div>
            
            {/* Sector Labels (Decorative) */}
            <div className="absolute top-4 left-4 text-xs font-mono text-slate-600">SECTOR A-1 // GRID LOCK</div>
            <div className="absolute bottom-4 right-4 text-xs font-mono text-slate-600">SCALE: 1:5000</div>
            
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-800/50">
                <Crosshair size={120} strokeWidth={1} />
            </div>

            {/* Incidents */}
            {state.incidents.map(incident => {
                const coords = getCoordinates(incident.location);
                const isCritical = incident.priority === 'Critical' || incident.priority === 'High';
                
                return (
                    <div 
                        key={incident.id}
                        onClick={() => onSelectIncident?.(incident.id)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 hover:z-20 transition-all cursor-pointer"
                        style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                        data-testid={`map-incident-${incident.id}`}
                    >
                        {/* Ping Animation for active incidents */}
                        {incident.status !== 'Resolved' && (
                            <div className={`absolute w-full h-full rounded-full animate-ping opacity-75 ${
                                isCritical ? 'bg-rose-500' : 'bg-amber-500'
                            }`}></div>
                        )}
                        
                        <div className={`relative p-1.5 rounded-full border-2 shadow-lg z-10 transition-colors ${
                                incident.status === 'Resolved' ? 'bg-slate-900 border-emerald-500 text-emerald-500' :
                                isCritical 
                                    ? 'bg-slate-900 border-rose-500 text-rose-500' 
                                    : 'bg-slate-900 border-amber-500 text-amber-500'
                            }`}>
                            {incident.type === 'Medical' ? <AlertCircle size={16} /> : <MapPin size={16} />}
                        </div>
                        
                        {/* Label on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-xs px-2 py-1 rounded border border-slate-700 whitespace-nowrap z-30">
                            <div className="font-bold text-slate-200">{incident.type}</div>
                            <div className="text-slate-400 font-mono text-[10px]">{incident.location}</div>
                        </div>
                    </div>
                );
            })}

            {/* Drones */}
            {state.drones.map(drone => {
                // If drone has an assigned mission/incident, maybe offset it slightly from the incident?
                // For now, just map its location.
                const coords = getCoordinates(drone.location);
                
                return (
                    <div 
                        key={drone.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 hover:z-20 transition-all cursor-pointer"
                        style={{ left: `${coords.x + 2}%`, top: `${coords.y - 2}%` }} // Slight offset from "Location Center"
                        data-testid={`map-drone-${drone.id}`}
                    >
                        <div className={`p-1 rounded-sm border shadow-lg z-10 transition-transform hover:scale-110 ${
                            drone.status === 'Ready' ? 'bg-slate-900 border-emerald-500 text-emerald-500' :
                            drone.status === 'In-Flight' ? 'bg-sky-900/50 border-sky-500 text-sky-400' :
                            'bg-slate-800 border-slate-600 text-slate-500'
                        }`}>
                            <Navigation size={14} className={drone.status === 'In-Flight' ? 'animate-pulse' : ''} />
                        </div>
                         {/* Label on Hover */}
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-xs px-2 py-1 rounded border border-slate-700 whitespace-nowrap z-30">
                            <div className="font-bold text-sky-400">{drone.model}</div>
                            <div className="text-slate-400 font-mono text-[10px]">{drone.status} • {drone.battery}%</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
