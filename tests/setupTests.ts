import { server } from './msw/server';

jest.mock('electron', () => ({
  app: {
    getPath: () => '/tmp',
  },
  BrowserWindow: function () {},
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
