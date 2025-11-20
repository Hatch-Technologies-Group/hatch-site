'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerConsumer } from '@/lib/api/auth';

export default function ConsumerRegisterPage() {
  const [formState, setFormState] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => registerConsumer(formState),
    onSuccess: () => {
      setMessage('Account created! Check your email for confirmation.');
      setFormState({ firstName: '', lastName: '', email: '', password: '' });
    },
    onError: (error: any) => {
      setMessage(error?.message ?? 'Unable to register. Please try again.');
    }
  });

  const onChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mx-auto mt-12 max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
      <p className="text-sm text-slate-500">Register to access the consumer portal and track your inquiries.</p>
      <Input placeholder="First name" value={formState.firstName} onChange={(e) => onChange('firstName', e.target.value)} />
      <Input placeholder="Last name" value={formState.lastName} onChange={(e) => onChange('lastName', e.target.value)} />
      <Input type="email" placeholder="Email" value={formState.email} onChange={(e) => onChange('email', e.target.value)} />
      <Input
        type="password"
        placeholder="Password"
        value={formState.password}
        onChange={(e) => onChange('password', e.target.value)}
      />
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      <Button className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Creating account…' : 'Register'}
      </Button>
    </div>
  );
}
