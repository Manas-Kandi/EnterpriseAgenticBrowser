export const app = {
  getPath: () => '/tmp',
  on: () => {},
};

export const BrowserWindow = {
  getAllWindows: () => [],
};

export const webContents = {
  fromId: () => null,
  getAllWebContents: () => [],
};

export default {
  app,
  BrowserWindow,
  webContents,
};
