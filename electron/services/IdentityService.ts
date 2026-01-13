import crypto from 'node:crypto';
import { BrowserWindow } from 'electron';
import dotenv from 'dotenv';
import { vaultService } from './VaultService';

dotenv.config();

type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
};

type UserInfo = {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  preferred_username?: string;
};

export type IdentityProfile = { name: string; email: string; avatar?: string };

type IdentitySession = {
  profile: IdentityProfile;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  idToken?: string;
};

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sha256Base64Url(input: string) {
  return base64UrlEncode(crypto.createHash('sha256').update(input).digest());
}

function randomBase64Url(bytes: number) {
  return base64UrlEncode(crypto.randomBytes(bytes));
}

function parseUrlParams(u: string) {
  const url = new URL(u);
  const params = Object.fromEntries(url.searchParams.entries());
  return { url, params };
}

function toExpiresAt(expiresIn?: number) {
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) return undefined;
  return Date.now() + expiresIn * 1000;
}

export class IdentityService {
  private discovery: OidcDiscovery | null = null;

  private get issuerUrl(): string {
    const v = process.env.OIDC_ISSUER_URL;
    if (typeof v !== 'string' || !v.trim()) throw new Error('OIDC_ISSUER_URL not configured');
    return v.trim().replace(/\/$/, '');
  }

  private get clientId(): string {
    const v = process.env.OIDC_CLIENT_ID;
    if (typeof v !== 'string' || !v.trim()) throw new Error('OIDC_CLIENT_ID not configured');
    return v.trim();
  }

  private get redirectUri(): string {
    const v = process.env.OIDC_REDIRECT_URI;
    if (typeof v !== 'string' || !v.trim()) return 'enterprisebrowser://auth/callback';
    return v.trim();
  }

  private get scope(): string {
    const v = process.env.OIDC_SCOPE;
    return typeof v === 'string' && v.trim() ? v.trim() : 'openid profile email';
  }

  private async getDiscovery(): Promise<OidcDiscovery> {
    if (this.discovery) return this.discovery;
    const url = `${this.issuerUrl}/.well-known/openid-configuration`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
    const json = (await res.json()) as any;
    const discovery: OidcDiscovery = {
      authorization_endpoint: String(json.authorization_endpoint || ''),
      token_endpoint: String(json.token_endpoint || ''),
      userinfo_endpoint: typeof json.userinfo_endpoint === 'string' ? json.userinfo_endpoint : undefined,
    };
    if (!discovery.authorization_endpoint || !discovery.token_endpoint) {
      throw new Error('OIDC discovery missing endpoints');
    }
    this.discovery = discovery;
    return discovery;
  }

  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    const d = await this.getDiscovery();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
    });
    const res = await fetch(d.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OIDC token exchange failed: ${res.status} ${text}`);
    }
    return (await res.json()) as TokenResponse;
  }

  private async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const d = await this.getDiscovery();
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
    });
    const res = await fetch(d.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OIDC refresh failed: ${res.status} ${text}`);
    }
    return (await res.json()) as TokenResponse;
  }

  private async fetchUserInfo(accessToken: string): Promise<UserInfo | null> {
    const d = await this.getDiscovery();
    if (!d.userinfo_endpoint) return null;
    const res = await fetch(d.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as UserInfo;
  }

  private toProfile(ui: UserInfo | null): IdentityProfile {
    const name = (ui?.name || ui?.preferred_username || 'User').toString();
    const email = (ui?.email || 'unknown@example.com').toString();
    const avatar = ui?.picture ? String(ui.picture) : undefined;
    if (name && email) return { name, email, avatar };
    return { name: 'User', email: 'unknown@example.com', avatar };
  }

  private async storeSession(session: IdentitySession) {
    await vaultService.setSecret('oidc:access_token', session.accessToken);
    if (session.refreshToken) await vaultService.setSecret('oidc:refresh_token', session.refreshToken);
    if (session.idToken) await vaultService.setSecret('oidc:id_token', session.idToken);
    if (typeof session.expiresAt === 'number') await vaultService.setSecret('oidc:expires_at', String(session.expiresAt));
    await vaultService.setSecret('oidc:user_profile', JSON.stringify(session.profile));
  }

  async clearSession() {
    await vaultService.deleteSecret('oidc:access_token').catch(() => undefined);
    await vaultService.deleteSecret('oidc:refresh_token').catch(() => undefined);
    await vaultService.deleteSecret('oidc:id_token').catch(() => undefined);
    await vaultService.deleteSecret('oidc:expires_at').catch(() => undefined);
    await vaultService.deleteSecret('oidc:user_profile').catch(() => undefined);
  }

  async getSession(): Promise<IdentityProfile | null> {
    const profileRaw = await vaultService.getSecret('oidc:user_profile').catch(() => null);
    const access = await vaultService.getSecret('oidc:access_token').catch(() => null);
    if (!profileRaw || !access) return null;

    const expiresRaw = await vaultService.getSecret('oidc:expires_at').catch(() => null);
    const expiresAt = expiresRaw ? Number(expiresRaw) : undefined;

    if (expiresAt && Date.now() > expiresAt - 30_000) {
      const rt = await vaultService.getSecret('oidc:refresh_token').catch(() => null);
      if (rt) {
        const refreshed = await this.refreshToken(rt);
        const newAccess = refreshed.access_token;
        const newRt = refreshed.refresh_token || rt;
        const newExp = toExpiresAt(refreshed.expires_in);
        const ui = await this.fetchUserInfo(newAccess).catch(() => null);
        const profile = this.toProfile(ui);
        await this.storeSession({
          profile,
          accessToken: newAccess,
          refreshToken: newRt,
          expiresAt: newExp,
          idToken: refreshed.id_token,
        });
        return profile;
      }
      return null;
    }

    try {
      const parsed = JSON.parse(profileRaw);
      const name = String(parsed?.name ?? 'User');
      const email = String(parsed?.email ?? 'unknown@example.com');
      const avatar = parsed?.avatar ? String(parsed.avatar) : undefined;
      return { name, email, avatar };
    } catch {
      return null;
    }
  }

  async loginWithPopup(): Promise<IdentityProfile> {
    const d = await this.getDiscovery();

    const state = randomBase64Url(16);
    const nonce = randomBase64Url(16);
    const codeVerifier = randomBase64Url(32);
    const codeChallenge = sha256Base64Url(codeVerifier);

    const authUrl = new URL(d.authorization_endpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('scope', this.scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    const loginWin = new BrowserWindow({
      width: 960,
      height: 720,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    const cleanupSessionHooks = (() => {
      const ses = loginWin.webContents.session;
      const filter = { urls: ['*://*/*', 'enterprisebrowser://*/*'] };
      const onBeforeRequest = (_details: any, cb: any) => {
        cb({});
      };
      ses.webRequest.onBeforeRequest(filter as any, onBeforeRequest);
      return () => {
        try {
          (ses.webRequest as any).off?.('onBeforeRequest', onBeforeRequest);
        } catch {
        }
      };
    })();

    const waitForRedirect = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Login timed out')), 180_000);

      const finish = (u: string) => {
        clearTimeout(timeout);
        resolve(u);
      };

      const fail = (err: any) => {
        clearTimeout(timeout);
        reject(err);
      };

      const handleUrl = (u: string) => {
        if (!u) return;
        const ru = this.redirectUri;
        if (u.startsWith(ru)) {
          finish(u);
        }
      };

      loginWin.webContents.on('will-redirect', (_e, url) => handleUrl(url));
      loginWin.webContents.on('will-navigate', (_e, url) => handleUrl(url));
      loginWin.webContents.on('did-fail-load', (_e, _code, desc) => {
        if (String(desc || '').toLowerCase().includes('aborted')) return;
      });
      loginWin.on('closed', () => fail(new Error('Login window closed')));
    });

    await loginWin.loadURL(authUrl.toString()).catch((e) => {
      // Ignore ERR_ABORTED which often happens on immediate redirects
      if (String(e?.message || '').includes('ERR_ABORTED')) return;
      throw e;
    });

    let finalUrl: string;
    try {
      finalUrl = await waitForRedirect;
    } finally {
      cleanupSessionHooks();
      if (!loginWin.isDestroyed()) loginWin.close();
    }

    const { params } = parseUrlParams(finalUrl);
    if (params.state !== state) throw new Error('OIDC state mismatch');
    const code = params.code;
    if (typeof code !== 'string' || !code) throw new Error('OIDC missing code');

    const tokens = await this.exchangeCodeForToken(code, codeVerifier);
    const accessToken = tokens.access_token;
    const expiresAt = toExpiresAt(tokens.expires_in);

    const ui = await this.fetchUserInfo(accessToken).catch(() => null);
    const profile = this.toProfile(ui);

    await this.storeSession({
      profile,
      accessToken,
      refreshToken: tokens.refresh_token,
      expiresAt,
      idToken: tokens.id_token,
    });

    return profile;
  }

  async getAccessToken(): Promise<string | null> {
    const access = await vaultService.getSecret('oidc:access_token').catch(() => null);
    if (!access) return null;
    const expiresRaw = await vaultService.getSecret('oidc:expires_at').catch(() => null);
    const expiresAt = expiresRaw ? Number(expiresRaw) : undefined;
    if (expiresAt && Date.now() > expiresAt - 30_000) {
      const rt = await vaultService.getSecret('oidc:refresh_token').catch(() => null);
      if (!rt) return null;
      const refreshed = await this.refreshToken(rt);
      const newAccess = refreshed.access_token;
      const newRt = refreshed.refresh_token || rt;
      const newExp = toExpiresAt(refreshed.expires_in);
      const profile = await this.getSession();
      if (profile) {
        await this.storeSession({
          profile,
          accessToken: newAccess,
          refreshToken: newRt,
          expiresAt: newExp,
          idToken: refreshed.id_token,
        });
      } else {
        await vaultService.setSecret('oidc:access_token', newAccess);
        await vaultService.setSecret('oidc:refresh_token', newRt);
        if (typeof newExp === 'number') await vaultService.setSecret('oidc:expires_at', String(newExp));
      }
      return newAccess;
    }
    return access;
  }
}

export const identityService = new IdentityService();
