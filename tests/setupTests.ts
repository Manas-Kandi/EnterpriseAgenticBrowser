jest.mock('electron', () => ({
  app: {
    getPath: () => '/tmp',
  },
  BrowserWindow: function () {},
}));

// MSW setup - only if available
let server: any = null;
try {
  const msw = require('./msw/server');
  server = msw.server;
} catch {
  // MSW not available, skip mock server setup
}

if (server) {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
