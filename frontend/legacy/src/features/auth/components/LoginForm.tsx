'use client';

import React, { useState } from 'react';
import { AuthCredentials } from '@/components/brand/AuthCredentials';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { AuthResponse } from '../types/auth.types';
import { Button, Alert } from '@/components/ui';

export interface LoginFormProps {
  onSuccess?: (response: AuthResponse) => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo = '/' }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) return;

    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await login(usernameOrEmail, password);
      setStatus('success');

      if (onSuccess) {
        onSuccess(response);
      }

      setTimeout(() => {
        router.push(redirectTo);
      }, 800);
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : t('auth.loginFailed');
      setErrorMessage(msg);
    }
  };

  return (
    <div className="w-full">
      {/* Header - Single line, no tiny description */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#202020] whitespace-nowrap flex items-center gap-2.5">

          {t('auth.loginTitle')}
        </h2>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      {/* Login Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <AuthCredentials identity={usernameOrEmail} password={password} onIdentityChange={setUsernameOrEmail} onPasswordChange={setPassword} disabled={status === 'loading' || status === 'success'} />

        <div className="pt-2">
          <Button
            type="submit"
            isLoading={status === 'loading'}
            loadingText={t('auth.authenticating')}
            disabled={status === 'success'}
            className={`w-full ${status === 'success' ? 'bg-primary' : ''}`}
            rightIcon={
              status === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <ArrowRight size={18} />
              )
            }
          >
            {status === 'success' ? t('auth.authSuccess') : t('auth.loginBtn')}
          </Button>
        </div>
      </form>

      {/* Navigation link to Register */}
      <div className="mt-8 text-center">
        <p className="font-body-md text-body-md text-secondary">
          {t('auth.noAccount')}{' '}
          <Link
            href="/register"
            className="font-semibold text-primary-container hover:underline ml-1"
          >
            {t('auth.registerBtn')}
          </Link>
        </p>
      </div>


    </div>
  );
}
