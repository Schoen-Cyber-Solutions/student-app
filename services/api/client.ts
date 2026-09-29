import { API_BASE_URL, API_TIMEOUT_MS, isApiConfigured } from '@/constants/Api';

/**
 * Coarse failure categories the UI can act on. Raw backend messages, status
 * text, and stack traces are intentionally not part of this surface.
 */
export type ApiErrorKind =
  | 'not_configured' // EXPO_PUBLIC_API_BASE_URL missing
  | 'unauthorized' // 401 — missing/invalid/expired session
  | 'not_found' // 404
  | 'client' // other 4xx
  | 'server' // 5xx
  | 'network' // DNS/connection/timeout failure
  | 'invalid_response'; // 2xx but body was not the expected JSON

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  /** Structured JSON body returned by the backend, if any. Never contains raw stack traces. */
  readonly body?: unknown;

  constructor(kind: ApiErrorKind, status?: number, body?: unknown) {
    super(`API request failed (${kind}${status ? ` ${status}` : ''})`);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.body = body;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Bearer session token. Never logged. */
  sessionToken?: string;
  body?: unknown;
  timeoutMs?: number;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server';
  return 'client';
}

/**
 * Perform a JSON request against the configured backend.
 *
 * - Prefixes `path` with API_BASE_URL.
 * - Attaches `Authorization: Bearer <token>` when a session token is given.
 * - Resolves with the parsed JSON body on 2xx.
 * - Rejects with ApiError for every failure mode; never leaks token or body.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured) {
    throw new ApiError('not_configured');
  }

  const { method = 'GET', sessionToken, body, timeoutMs = API_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // fetch only rejects on network-level failure (offline, DNS, refused, abort).
    throw new ApiError('network');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let errorBody: unknown = undefined;
    try {
      errorBody = await response.json();
    } catch {
      // Ignore unparseable error bodies; the status code is enough.
    }
    throw new ApiError(kindForStatus(response.status), response.status, errorBody);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('invalid_response', response.status);
  }
}

/** Narrow an unknown caught value to ApiError, mapping anything else to 'network'. */
export function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError('network');
}

/**
 * Multipart/form-data upload for file fields. Uses Expo FileSystem's native
 * multipart upload instead of fetch+FormData — FormData on this stack cannot
 * reliably carry { uri, name, type } file parts (the append throws synchronously
 * or serializes the object), which surfaced as a generic "network" failure.
 * `fields` are sent as multipart form fields alongside the `image` part.
 */
export async function apiUpload<T>(
  path: string,
  options: { sessionToken?: string; fields?: Record<string, string>; file?: { uri: string; name: string; type: string } },
): Promise<T> {
  if (!isApiConfigured) {
    throw new ApiError('not_configured');
  }

  if (!options.file?.uri) {
    throw new ApiError('client');
  }

  const { uploadAsync, FileSystemUploadType } = await import('expo-file-system/legacy');

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.sessionToken) headers.Authorization = `Bearer ${options.sessionToken}`;

  let result;
  try {
    result = await uploadAsync(url, options.file?.uri ?? '', {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'image',
      mimeType: options.file?.type ?? 'image/jpeg',
      parameters: options.fields ?? {},
      headers,
    });
  } catch (err) {
    if (__DEV__) console.warn('[apiUpload] transport failed:', err);
    throw new ApiError('network');
  }

  let body: unknown = undefined;
  try {
    body = JSON.parse(result.body);
  } catch {
    // Non-JSON body — status decides the outcome below.
  }

  if (__DEV__) {
    // Safe diagnostics only — never the URI path, token, or file contents.
    console.log('[apiUpload]', { path, status: result.status, error: (body as { error?: string })?.error });
  }

  if (result.status < 200 || result.status >= 300) {
    throw new ApiError(kindForStatus(result.status), result.status, body);
  }
  if (body === undefined) {
    throw new ApiError('invalid_response', result.status);
  }
  return body as T;
}
