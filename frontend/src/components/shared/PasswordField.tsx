'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordField({ label = 'Mật khẩu', id, disabled, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: string }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return <div className="portal-auth-field">
    <label htmlFor={inputId}>{label}</label>
    <div className="portal-password">
      <input {...props} id={inputId} type={visible ? 'text' : 'password'} disabled={disabled} />
      <button type="button" disabled={disabled} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
        aria-pressed={visible} aria-controls={inputId} onClick={() => setVisible(value => !value)}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}
