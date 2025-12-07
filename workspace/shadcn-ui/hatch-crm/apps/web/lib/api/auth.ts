import { apiFetch } from './api';

export interface RegisterConsumerPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function registerConsumer(payload: RegisterConsumerPayload) {
  return apiFetch<{ accessToken: string }>('auth/register-consumer', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
