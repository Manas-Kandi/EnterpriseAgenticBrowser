describe('TaskKnowledgeService', () => {
  beforeAll(() => {
    jest.mock('electron', () => ({
      app: { getPath: () => '/tmp' },
      BrowserWindow: function () {},
    }));
  });

  it('findNearest should return a matching skill for identical query', async () => {
    const mod = await import('../../electron/services/TaskKnowledgeService');
    const { TaskKnowledgeService } = mod as any;

    const svc = new TaskKnowledgeService();

    const skill: any = {
      id: '1',
      name: 'create_jira_issue',
      description: 'Create a new Jira issue',
      domain: 'localhost:3000',
      steps: [],
      currentVersion: 1,
      stats: { successes: 5, failures: 0, partials: 0, lastUsed: Date.now() },
      versions: [{ version: 1, steps: [], createdAt: Date.now() }],
      tags: ['jira', 'create'],
    };

    skill.embedding = (svc as any).computeEmbedding('create a new jira issue');
    (svc as any).skills = [skill];

    const res = await svc.findNearest('create a new jira issue', 0.8);
    expect(res).not.toBeNull();
    expect(res.skill.name).toBe('create_jira_issue');
  });

  it('findNearest should return null when no skill matches threshold', async () => {
    const mod = await import('../../electron/services/TaskKnowledgeService');
    const { TaskKnowledgeService } = mod as any;

    const svc = new TaskKnowledgeService();

    const skill: any = {
      id: '1',
      name: 'create_jira_issue',
      description: 'Create a new Jira issue',
      domain: 'localhost:3000',
      steps: [],
      currentVersion: 1,
      stats: { successes: 5, failures: 0, partials: 0, lastUsed: Date.now() },
      versions: [{ version: 1, steps: [], createdAt: Date.now() }],
      tags: ['jira', 'create'],
    };

    skill.embedding = (svc as any).computeEmbedding('create a new jira issue');
    (svc as any).skills = [skill];

    const res = await svc.findNearest('check the weather in tokyo', 0.9);
    expect(res).toBeNull();
  });
});
