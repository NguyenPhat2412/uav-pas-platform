'use client';

import React, { useState } from 'react';
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
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface leading-tight tracking-tight mb-2">
          {t('auth.loginTitle')}
        </h2>
        <p className="font-body-lg text-body-lg text-secondary leading-relaxed">
          {t('auth.loginSubtitle')}
        </p>
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

      <p className="mt-8 text-center text-sm text-secondary">Chưa có tài khoản vận hành? Liên hệ quản trị viên để được cấp quyền truy cập.</p>

      {/* Security & Ground Control Badges */}
      <div className="mt-12 pt-6 flex items-center justify-center gap-3 text-outline border-t border-slate-200/80">
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
