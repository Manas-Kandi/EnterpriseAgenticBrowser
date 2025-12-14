export type User = {
  id: string;
  name: string;
  role: 'Admin' | 'Dispatcher' | 'Pilot' | 'Manager' | 'Security';
  email: string;
  status: 'Active' | 'Inactive';
  certifications?: string[];
  certExpiry?: string; // ISO date string
};

export type Drone = {
  id: string;
  model: 'Sentinel-X' | 'CargoLifter-9' | 'Scout-Mini';
  status: 'Ready' | 'In-Flight' | 'Maintenance' | 'Offline';
  battery: number; // 0-100
  location: string; // "Base", "Sector 7", etc.
  assignedMissionId?: string;
  maxSpeed: number; // km/h
  payloadCapacity: string; // e.g. "5kg"
  firmwareVersion: string; // e.g. "v2.1.0"
};

export type Incident = {
  id: string;
  type: 'Medical' | 'Security' | 'Fire' | 'Logistics';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'New' | 'Dispatched' | 'Resolved';
  location: string;
  description: string;
  assignedDroneId?: string;
  timestamp: string;
};

export type AeroState = {
  users: User[];
  drones: Drone[];
  incidents: Incident[];
  currentUser: User | null;
};
