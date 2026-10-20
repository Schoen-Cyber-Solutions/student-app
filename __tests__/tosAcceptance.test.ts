import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * verifyCode() must forward the user's Terms acceptance to the backend —
 * account creation is refused server-side without it. The API layer reads
 * EXPO_PUBLIC_API_BASE_URL / __DEV__ at import time, so stub both before
 * importing the module.
 */
async function importVerifyCode() {
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'https://api.test');
  vi.stubGlobal('__DEV__', true);
  const mod = await import('../services/api/auth');
  return mod.verifyCode;
}

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: 'verified' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('verifyCode terms acceptance', () => {
  it('sends acceptedTerms: true when the user accepted', async () => {
    const verifyCode = await importVerifyCode();
    const fetchMock = stubFetch();

    await verifyCode('student@university.edu', '123456', true);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      email: 'student@university.edu',
      code: '123456',
      acceptedTerms: true,
    });
  });

  it('sends acceptedTerms: false when the user has not accepted', async () => {
    const verifyCode = await importVerifyCode();
    const fetchMock = stubFetch();

    await verifyCode('student@university.edu', '123456', false);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.acceptedTerms).toBe(false);
  });
});
