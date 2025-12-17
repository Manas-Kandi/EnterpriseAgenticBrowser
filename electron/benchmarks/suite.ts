export interface BenchmarkScenario {
  id: string;
  name: string;
  description: string;
  userMessage: string;
  expectedOutcome: {
    type: 'text_present' | 'url_match';
    value: string;
  };
  timeoutMs: number;
}

export const BENCHMARK_SUITE: BenchmarkScenario[] = [
  {
    id: 'aerocore-dispatch',
    name: 'AeroCore Dispatch',
    description: 'Create and dispatch a new job in AeroCore Dispatch',
    userMessage: 'Go to AeroCore Dispatch and create a new dispatch job for cargo delivery from Warehouse A to Terminal 1',
    expectedOutcome: { type: 'text_present', value: 'Warehouse A' },
    timeoutMs: 60000,
  },
  {
    id: 'aerocore-fleet',
    name: 'AeroCore Fleet',
    description: 'Add a new drone to the fleet',
    userMessage: 'Navigate to AeroCore Fleet and add a new drone with serial DR-001',
    expectedOutcome: { type: 'text_present', value: 'DR-001' },
    timeoutMs: 60000,
  },
  {
    id: 'aerocore-workforce',
    name: 'AeroCore Workforce',
    description: 'Create a new employee profile',
    userMessage: 'Go to AeroCore Workforce and create a new employee profile for Jane Doe',
    expectedOutcome: { type: 'text_present', value: 'Jane Doe' },
    timeoutMs: 60000,
  },
  {
    id: 'aerocore-cargo',
    name: 'AeroCore Cargo',
    description: 'Create a new shipment',
    userMessage: 'Navigate to AeroCore Cargo and create a new shipment with ID SH-9987',
    expectedOutcome: { type: 'text_present', value: 'SH-9987' },
    timeoutMs: 60000,
  },
  {
    id: 'aerocore-security',
    name: 'AeroCore Security',
    description: 'Create a security incident report',
    userMessage: 'Go to AeroCore Security and file a new security incident report',
    expectedOutcome: { type: 'text_present', value: 'Incident' },
    timeoutMs: 60000,
  },
  {
    id: 'aerocore-admin',
    name: 'AeroCore Admin',
    description: 'Update system settings',
    userMessage: 'Navigate to AeroCore Admin and update the system timezone to UTC',
    expectedOutcome: { type: 'text_present', value: 'UTC' },
    timeoutMs: 60000,
  },
  {
    id: 'aerocore-portal',
    name: 'AeroCore Portal',
    description: 'Create a new portal announcement',
    userMessage: 'Go to AeroCore Portal and create a new announcement about system maintenance',
    expectedOutcome: { type: 'text_present', value: 'maintenance' },
    timeoutMs: 60000,
  },
  {
    id: 'aerocore-datalake',
    name: 'AeroCore Datalake',
    description: 'Run a data query',
    userMessage: 'Navigate to AeroCore Datalake and run a query for recent logs',
    expectedOutcome: { type: 'text_present', value: 'logs' },
    timeoutMs: 60000,
  },
  
  // Personal Browser Scenarios
  {
    id: 'personal-wikipedia',
    name: 'Wikipedia Navigation',
    description: 'Navigate to Wikipedia and find the Featured Article',
    userMessage: 'Go to wikipedia.org and verify that the "From today\'s featured article" section is present.',
    expectedOutcome: { type: 'text_present', value: 'From today\'s featured article' },
    timeoutMs: 60000,
  },
  {
    id: 'personal-todomvc',
    name: 'TodoMVC Interaction',
    description: 'Add and complete tasks in a React Todo app',
    userMessage: 'Go to https://todomvc.com/examples/react/dist/. Add a new todo item called "Review Agent Performance" and then press Enter.',
    expectedOutcome: { type: 'text_present', value: 'Review Agent Performance' },
    timeoutMs: 60000,
  },
  {
    id: 'personal-hn',
    name: 'Hacker News Retrieval',
    description: 'Navigate to Hacker News',
    userMessage: 'Go to news.ycombinator.com and find the "Hacker News" header.',
    expectedOutcome: { type: 'text_present', value: 'Hacker News' },
    timeoutMs: 45000,
  },
  {
    id: 'personal-duckduckgo',
    name: 'Search Engine Usage',
    description: 'Search using DuckDuckGo',
    userMessage: 'Go to duckduckgo.com, type "Enterprise Browser" into the search box, and search.',
    expectedOutcome: { type: 'url_match', value: 'duckduckgo.com/?q=Enterprise+Browser' },
    timeoutMs: 60000,
  }
];
