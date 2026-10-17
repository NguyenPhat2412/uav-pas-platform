'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Lock,
  ShieldCheck,
  Satellite,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { AuthResponse } from '../types/auth.types';
import { Button, Input, PasswordInput, Alert, Badge } from '@/components/ui';

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
          <span className="p-1.5 rounded-lg bg-[#ebf4fb] text-[#00558f] inline-flex items-center justify-center">
            <ShieldCheck size={22} className="animate-pulse" />
          </span>
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
        <Input
          id="uav-email"
          name="email"
          type="text"
          leftIcon={<Mail size={18} />}
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          autoComplete="username"
          required
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
        />

        <PasswordInput
          id="uav-password"
          name="password"
          leftIcon={<Lock size={18} />}
          label={t('auth.password')}
          placeholder={t('auth.passwordPlaceholder')}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

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

      {/* Security & Ground Control Badges */}
      <div className="mt-12 pt-6 flex flex-wrap items-center justify-center gap-3 text-outline border-t border-slate-200/80">
        <Badge variant="primary" icon={<ShieldCheck size={14} className="text-primary mr-1" />}>
          {t('auth.multiLayerSecurity')}
        </Badge>
        <span className="w-1 h-1 rounded-full bg-outline-variant" />
        <Badge variant="outline" icon={<Satellite size={14} className="text-primary mr-1" />}>
          {t('auth.groundControl')}
        </Badge>
      </div>
    </div>
  );
}
