import { Platform } from 'react-native';

const DEV_API_PORT = '3001';
const LEGACY_WEB_STORAGE_KEY = 'ritamassas_sqljs_v1';

let bootstrapPromise: Promise<void> | null = null;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getConfiguredApiBaseUrl(): string | null {
  const envValue = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  return envValue ? trimTrailingSlash(envValue) : null;
}

export function getWebApiBaseUrl(): string {
  if (Platform.OS !== 'web') {
    throw new Error('Web API indisponivel fora da plataforma web.');
  }

  const configured = getConfiguredApiBaseUrl();
  if (configured) return configured;

  if (typeof window === 'undefined') {
    return `http://localhost:${DEV_API_PORT}/api`;
  }

  const { origin, protocol, hostname, port } = window.location;

  if (port === '8081' || port === '19006') {
    return `${protocol}//${hostname}:${DEV_API_PORT}/api`;
  }

  return `${origin}/api`;
}

export function getWebServerOrigin(): string {
  const apiBaseUrl = getWebApiBaseUrl();
  return apiBaseUrl.endsWith('/api')
    ? apiBaseUrl.slice(0, -'/api'.length)
    : apiBaseUrl;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getWebApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep default message when the server did not return JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function ensureWebServerReady(): Promise<void> {
  if (Platform.OS !== 'web') return;

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const bootstrap = await fetchJson<{ empty: boolean }>('/bootstrap', {
        method: 'GET',
      });

      if (!bootstrap.empty || typeof localStorage === 'undefined') return;

      const saved = localStorage.getItem(LEGACY_WEB_STORAGE_KEY);
      if (!saved) return;

      try {
        await fetchJson<{ imported: boolean }>('/import-web-db', {
          method: 'POST',
          body: JSON.stringify({ base64: saved }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/already contains data/i.test(message)) {
          throw error;
        }
      }
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}

export async function callWebRpc<T>(
  action: string,
  ...params: unknown[]
): Promise<T> {
  await ensureWebServerReady();
  const response = await fetchJson<{ result: T }>('/rpc', {
    method: 'POST',
    body: JSON.stringify({ action, params }),
  });
  return response.result;
}

export async function uploadWebImage(payload: {
  base64: string;
  fileName: string;
  mimeType: string | null;
}): Promise<string> {
  await ensureWebServerReady();
  const response = await fetchJson<{ photoUri: string }>('/upload-image', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.photoUri;
}

export function resolveStoredAssetUri(uri: string | null): string | null {
  if (!uri) return null;

  if (Platform.OS !== 'web') {
    return uri;
  }

  if (
    /^(?:[a-z]+:)?\/\//i.test(uri) ||
    uri.startsWith('data:') ||
    uri.startsWith('blob:')
  ) {
    return uri;
  }

  return new URL(uri.replace(/^\.\//, ''), `${getWebServerOrigin()}/`).toString();
}
