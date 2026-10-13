'use client';

import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { supportedLocales, localeMetaMap } from '@/i18n/config';

export interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { locale, setLocale } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language selection"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(255, 255, 255, 0.08)',
        padding: '3px 4px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        fontSize: '12px',
      }}
      className={className}
    >
      {supportedLocales.map((loc) => {
        const isActive = locale === loc;
        const meta = localeMetaMap[loc];
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: isActive ? '700' : '500',
              background: isActive ? '#0284c7' : 'transparent',
              color: isActive ? '#ffffff' : '#94a3b8',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              transition: 'all 0.15s ease',
            }}
            title={`${meta.name} (${meta.nativeName})`}
          >
            {meta.displayCode}
          </button>
        );
      })}
    </div>
  );
};
