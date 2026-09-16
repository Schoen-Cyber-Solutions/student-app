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

export async function verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
  return apiRequest<VerifyCodeResponse>('/api/auth/email/verify-code', {
    method: 'POST',
    body: { email, code },
  });
}
