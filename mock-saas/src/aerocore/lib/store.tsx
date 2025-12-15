import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { AeroState, User, Drone, Incident, Shipment, InventoryItem } from './types';

// Initial Mock Data
const initialState: AeroState = {
  currentUser: { id: 'u1', name: 'Admin User', role: 'Admin', email: 'admin@aerocore.com', status: 'Active' },
  users: [
    { id: 'u1', name: 'Admin User', role: 'Admin', email: 'admin@aerocore.com', status: 'Active', dutyStatus: 'On-Duty' },
    { id: 'u2', name: 'Sarah Connor', role: 'Dispatcher', email: 's.connor@aerocore.com', status: 'Active', dutyStatus: 'On-Duty', certifications: ['Dispatcher L1', 'Crisis Mgmt'], certExpiry: '2025-01-15' },
    { id: 'u3', name: 'Maverick', role: 'Pilot', email: 'mav@aerocore.com', status: 'Active', dutyStatus: 'Off-Duty', certifications: ['Pilot License A', 'Night Flight'], certExpiry: '2023-11-01' },
  ],
  drones: [
    { id: 'd1', model: 'Sentinel-X', status: 'Ready', battery: 98, location: 'Base Alpha', maxSpeed: 120, payloadCapacity: '2kg', firmwareVersion: 'v2.4.1' },
    { id: 'd2', model: 'CargoLifter-9', status: 'Maintenance', battery: 45, location: 'Hangar B', maxSpeed: 80, payloadCapacity: '15kg', firmwareVersion: 'v2.3.9' },
    { id: 'd3', model: 'Scout-Mini', status: 'In-Flight', battery: 72, location: 'Sector 4', assignedMissionId: 'inc1', maxSpeed: 150, payloadCapacity: '0.5kg', firmwareVersion: 'v3.0.0-beta' },
  ],
  incidents: [
    { id: 'inc1', type: 'Security', priority: 'High', status: 'Dispatched', location: 'Sector 4', description: 'Perimeter breach detected', assignedDroneId: 'd3', timestamp: '2023-10-27 14:30' },
    { id: 'inc2', type: 'Medical', priority: 'Critical', status: 'New', location: 'Downtown', description: 'Cardiac arrest reported', timestamp: '2023-10-27 14:45' },
  ],
  shipments: [
    { id: 'ORD-001', origin: 'Warehouse A', destination: 'Sector 7 Outpost', status: 'In-Transit', customer: 'TechCorp Industries', priority: 'Express', weight: '2.5kg', estimatedDelivery: '2023-10-27 16:00', assignedDroneId: 'd3' },
    { id: 'ORD-002', origin: 'Distribution Hub', destination: 'City General Hospital', status: 'Pending', customer: 'HealthPlus', priority: 'Standard', weight: '12kg' },
    { id: 'ORD-003', origin: 'Port Logistics', destination: 'Base Alpha', status: 'Delivered', customer: 'Global Defense', priority: 'Standard', weight: '45kg', estimatedDelivery: '2023-10-26 09:30' },
    { id: 'ORD-004', origin: 'Warehouse B', destination: 'Sector 3', status: 'Processing', customer: 'RetailGo', priority: 'Standard', weight: '1.2kg' },
  ],
  inventory: [
    { id: 'SKU-9001', name: 'Medical Kit (Trauma)', quantity: 45, zone: 'Zone A-12', category: 'Medical' },
    { id: 'SKU-9002', name: 'Drone Battery Pack (Li-Po)', quantity: 12, zone: 'Zone B-04', category: 'Parts' },
    { id: 'SKU-9003', name: 'Emergency Ration Pack', quantity: 150, zone: 'Zone C-01', category: 'Supplies' },
    { id: 'SKU-9004', name: 'Hydraulic Fluid (5L)', quantity: 8, zone: 'Zone D-09', category: 'Hazardous' },
    { id: 'SKU-9005', name: 'Propeller Set (Carbon)', quantity: 30, zone: 'Zone B-05', category: 'Parts' },
  ]
};

// Actions
type Action =
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_INCIDENT'; payload: Incident }
  | { type: 'UPDATE_INCIDENT'; payload: Incident }
  | { type: 'ADD_DRONE'; payload: Drone }
  | { type: 'UPDATE_DRONE'; payload: Drone }
  | { type: 'ADD_SHIPMENT'; payload: Shipment }
  | { type: 'UPDATE_SHIPMENT'; payload: Shipment }
  | { type: 'ADD_INVENTORY'; payload: InventoryItem };

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
    case 'ADD_DRONE':
      return { ...state, drones: [...state.drones, action.payload] };
    case 'UPDATE_DRONE':
      return { ...state, drones: state.drones.map(d => d.id === action.payload.id ? action.payload : d) };
    case 'ADD_SHIPMENT':
      return { ...state, shipments: [...state.shipments, action.payload] };
    case 'UPDATE_SHIPMENT':
      return { ...state, shipments: state.shipments.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'ADD_INVENTORY':
      return { ...state, inventory: [...state.inventory, action.payload] };
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
