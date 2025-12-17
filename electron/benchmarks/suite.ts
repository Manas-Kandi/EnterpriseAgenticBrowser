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
    id: 'jira-create-issue',
    name: 'Create Jira Issue',
    description: 'Create a bug report in the mock Jira app',
    userMessage: 'Go to Jira and create a bug report titled "Login Failure" with priority High',
    expectedOutcome: { type: 'text_present', value: 'Login Failure' },
    timeoutMs: 60000,
  },
  {
    id: 'confluence-create-page',
    name: 'Create Confluence Page',
    description: 'Create a new documentation page',
    userMessage: 'Create a new Confluence page titled "Onboarding Guide" with content "Welcome to the team"',
    expectedOutcome: { type: 'text_present', value: 'Onboarding Guide' },
    timeoutMs: 60000,
  },
  {
    id: 'trello-move-card',
    name: 'Move Trello Card',
    description: 'Move a card from To Do to In Progress',
    userMessage: 'In Trello, move the "Design System" card to "In Progress"',
    expectedOutcome: { type: 'text_present', value: 'In Progress' },
    timeoutMs: 60000,
  }
];
