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
        gap: '3px',
        background: '#f8fafc',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
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
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: isActive ? '700' : '600',
              background: isActive ? '#ab2523' : 'transparent',
              color: isActive ? '#ffffff' : '#64748b',
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
