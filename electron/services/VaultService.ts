import keytar from 'keytar';

export class VaultService {
  private serviceName = 'EnterpriseAgenticBrowser';

  async setSecret(account: string, secret: string): Promise<void> {
    await keytar.setPassword(this.serviceName, account, secret);
  }

  async getSecret(account: string): Promise<string | null> {
    return await keytar.getPassword(this.serviceName, account);
  }

  async deleteSecret(account: string): Promise<boolean> {
    return await keytar.deletePassword(this.serviceName, account);
  }
}

export const vaultService = new VaultService();
