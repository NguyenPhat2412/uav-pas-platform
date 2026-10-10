'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { authService } from '../services/auth.service';

export interface ZaloLoginButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ZaloLoginButton({ onClick, className, disabled }: ZaloLoginButtonProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (onClick) {
      onClick();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const url = await authService.getZaloAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'Cannot connect to Zalo OA service';
      setError(message);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={handleClick}
        className={`w-full h-12 rounded-xl bg-brand-zalo hover:bg-brand-zalo-hover text-white font-title-sm text-title-sm font-semibold flex items-center justify-center gap-3 transition-all duration-150 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          className || ''
        }`}
      >
        {isLoading ? (
          <Loader2 className="animate-spin text-white shrink-0" size={20} />
        ) : (
          <svg
            className="w-5 h-5 flex-shrink-0"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="40" height="40" rx="10" fill="white" />
            <path
              d="M12.5 12.5H27.5C28.88 12.5 30 13.62 30 15V23.75C30 25.13 28.88 26.25 27.5 26.25H21.25L16.25 29.5V26.25H12.5C11.12 26.25 10 25.13 10 23.75V15C10 13.62 11.12 12.5 12.5 12.5Z"
              className="fill-brand-zalo"
            />
            <path
              d="M15.5 17.5H24.5V19.25L18.8 23H24.5V24.5H15.5V22.75L21.2 19H15.5V17.5Z"
              fill="white"
            />
          </svg>
        )}
        <span>{t('auth.loginWithZalo')}</span>
      </button>
      {error && <p className="font-body-sm text-body-sm text-error mt-2 text-center">{error}</p>}
    </div>
  );
}
