import { apiFetch } from './hatch';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Login with email and password using the backend API
 * This uses AWS Cognito authentication on the backend
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}
