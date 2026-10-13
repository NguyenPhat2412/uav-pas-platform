'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Phone,
  Lock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Satellite,
  PlaneTakeoff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { UserResponse } from '../types/auth.types';
import { Button, Input, PasswordInput, Alert, Badge } from '@/components/ui';

export interface RegisterFormProps {
  onSuccess?: (user: UserResponse) => void;
  redirectTo?: string;
}

export function RegisterForm({ onSuccess, redirectTo = '/login' }: RegisterFormProps) {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password.length < 8) {
      setErrorMessage(t('auth.passwordMin'));
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    // Derive username from email or phone
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') || `uav_${Date.now()}`;

    try {
      const response = await register({
        username,
        email,
        password,
        phoneNumber: phoneNumber.trim() || undefined,
      });

      setStatus('success');
      if (onSuccess) {
        onSuccess(response);
      }

      setTimeout(() => {
        router.push(redirectTo);
      }, 1200);
    } catch (err: unknown) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="w-full">
      {/* Header - Single line, no tiny description */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#202020] whitespace-nowrap flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-[#ebf4fb] text-[#00558f] inline-flex items-center justify-center">
            <PlaneTakeoff size={22} className="animate-bounce" />
          </span>
          {t('auth.registerTitle')}
        </h2>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      {/* Success alert */}
      {status === 'success' && (
        <div className="mb-6">
          <Alert variant="success">{t('auth.registerSuccess')}</Alert>
        </div>
      )}

      {/* Register Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Input
          id="email"
          name="email"
          type="email"
          leftIcon={<Mail size={18} />}
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          id="phone"
          name="phone"
          type="tel"
          leftIcon={<Phone size={18} />}
          label={t('auth.phone')}
          placeholder={t('auth.phonePlaceholder')}
          autoComplete="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <PasswordInput
          id="password"
          name="password"
          leftIcon={<Lock size={18} />}
          label={t('auth.password')}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={8}
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
            {status === 'success' ? t('auth.registerSuccess') : t('auth.registerBtn')}
          </Button>
        </div>
      </form>

      {/* Navigation link to Login */}
      <div className="mt-8 text-center">
        <p className="font-body-md text-body-md text-secondary">
          {t('auth.haveAccount')}{' '}
          <Link
            href="/login"
            className="font-semibold text-primary-container hover:underline ml-1 inline-flex items-center"
          >
            {t('auth.loginBtn')}
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
