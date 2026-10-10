'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  MessageSquare,
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
import { ZaloLoginButton } from './ZaloLoginButton';

export interface LoginFormProps {
  onSuccess?: (response: AuthResponse) => void;
  redirectTo?: string;
}

type LoginTab = 'password' | 'zalo';

export function LoginForm({ onSuccess, redirectTo = '/' }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<LoginTab>('password');
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

      {/* Login Mode Switcher Tabs */}
      <div className="flex rounded-xl bg-surface-container-low p-1 mb-6 border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'password'
              ? 'bg-card text-primary shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <KeyRound size={18} />
          <span>{t('auth.loginWithPassword')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('zalo');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'zalo'
              ? 'bg-card text-brand-zalo shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <MessageSquare size={18} />
          <span>{t('auth.loginWithZalo')}</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      {/* Tab: Password Form */}
      {activeTab === 'password' ? (
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
      ) : (
        /* Tab: Zalo OA Button */
        <div className="py-6 flex flex-col items-center">
          <p className="font-body-md text-body-md text-secondary text-center mb-6">
            Đăng nhập nhanh chóng và bảo mật thông qua tài khoản Zalo Official Account đã xác thực.
          </p>
          <ZaloLoginButton />
        </div>
      )}

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
