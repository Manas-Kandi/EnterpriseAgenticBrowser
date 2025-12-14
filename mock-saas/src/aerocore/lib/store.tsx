import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { AeroState, User, Drone, Incident } from './types';

// Initial Mock Data
const initialState: AeroState = {
  currentUser: { id: 'u1', name: 'Admin User', role: 'Admin', email: 'admin@aerocore.com', status: 'Active' },
  users: [
    { id: 'u1', name: 'Admin User', role: 'Admin', email: 'admin@aerocore.com', status: 'Active' },
    { id: 'u2', name: 'Sarah Connor', role: 'Dispatcher', email: 's.connor@aerocore.com', status: 'Active' },
    { id: 'u3', name: 'Maverick', role: 'Pilot', email: 'mav@aerocore.com', status: 'Active' },
  ],
  drones: [
    { id: 'd1', model: 'Sentinel-X', status: 'Ready', battery: 98, location: 'Base Alpha' },
    { id: 'd2', model: 'CargoLifter-9', status: 'Maintenance', battery: 45, location: 'Hangar B' },
    { id: 'd3', model: 'Scout-Mini', status: 'In-Flight', battery: 72, location: 'Sector 4', assignedMissionId: 'inc1' },
  ],
  incidents: [
    { id: 'inc1', type: 'Security', priority: 'High', status: 'Dispatched', location: 'Sector 4', description: 'Perimeter breach detected', assignedDroneId: 'd3', timestamp: '2023-10-27 14:30' },
    { id: 'inc2', type: 'Medical', priority: 'Critical', status: 'New', location: 'Downtown', description: 'Cardiac arrest reported', timestamp: '2023-10-27 14:45' },
  ]
};

// Actions
type Action =
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_INCIDENT'; payload: Incident }
  | { type: 'UPDATE_INCIDENT'; payload: Incident }
  | { type: 'UPDATE_DRONE'; payload: Drone };

function reducer(state: AeroState, action: Action): AeroState {
  switch (action.type) {
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'ADD_INCIDENT':
      return { ...state, incidents: [...state.incidents, action.payload] };
    case 'UPDATE_INCIDENT':
      return { ...state, incidents: state.incidents.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'UPDATE_DRONE':
      return { ...state, drones: state.drones.map(d => d.id === action.payload.id ? action.payload : d) };
    default:
      return state;
  }
}

const AeroContext = createContext<{ state: AeroState; dispatch: React.Dispatch<Action> } | null>(null);

export function AeroProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AeroContext.Provider value={{ state, dispatch }}>
      {children}
    </AeroContext.Provider>
  );
}

export function useAero() {
  const context = useContext(AeroContext);
  if (!context) throw new Error('useAero must be used within AeroProvider');
  return context;
}
