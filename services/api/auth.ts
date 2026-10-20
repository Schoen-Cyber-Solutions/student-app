import { apiRequest } from './client';

export interface RequestCodeResponse {
  status: string;
}

export interface VerifyCodeResponse {
  status: string;
  sessionToken?: string;
  user?: {
    id: string;
    username: string;
    onboardingState: string;
  };
}

export async function requestVerificationCode(email: string): Promise<RequestCodeResponse> {
  return apiRequest<RequestCodeResponse>('/api/auth/email/request-code', {
    method: 'POST',
    body: { email },
  });
}

/**
 * Verify the emailed code. `tosAccepted` must reflect the user's explicit
 * Terms of Service acceptance — the backend refuses to create a new account
 * without it and returns `{ status: 'terms_required' }`.
 */
export async function verifyCode(
  email: string,
  code: string,
  tosAccepted: boolean
): Promise<VerifyCodeResponse> {
  return apiRequest<VerifyCodeResponse>('/api/auth/email/verify-code', {
    method: 'POST',
    body: { email, code, acceptedTerms: tosAccepted },
  });
}
