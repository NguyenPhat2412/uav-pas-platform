'use client';
import React, { useId } from 'react';
import { PasswordField } from '@/components/shared/PasswordField';
/** Credentials UI only; callers retain their existing login and session behavior. */
export function AuthCredentials({ identity, password, onIdentityChange, onPasswordChange, disabled = false }: {
  identity: string; password: string; onIdentityChange: (value: string) => void; onPasswordChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  return <>
    <div className="portal-auth-field"><label htmlFor={`${id}-identity`}>Tên đăng nhập hoặc email</label>
      <input id={`${id}-identity`} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={disabled} value={identity} onChange={event => onIdentityChange(event.target.value)} />
    </div>
    <PasswordField id={`${id}-password`} name="password" autoComplete="current-password" required disabled={disabled} value={password} onChange={event => onPasswordChange(event.target.value)} />
  </>;
}
