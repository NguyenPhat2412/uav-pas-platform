'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { supportedLocales, localeMetaMap } from '@/i18n/config';
import { cn } from '@/lib/utils';

export interface LanguageSwitcherProps {
  variant?: 'pill' | 'dropdown' | 'compact';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'pill',
  className,
}) => {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (variant !== 'dropdown') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant]);

  // Variant: Pill (Segmented button)
  if (variant === 'pill') {
    return (
      <div
        role="group"
        aria-label="Language selection"
        className={cn(
          'inline-flex rounded-lg bg-surface-container-low/20 p-1 border border-outline-variant/30 text-xs select-none',
          className
        )}
      >
        {supportedLocales.map((loc) => {
          const isActive = locale === loc;
          const meta = localeMetaMap[loc];
          return (
            <button
              key={loc}
              type="button"
              onClick={() => setLocale(loc)}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-all duration-150 cursor-pointer text-xs',
                isActive
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'text-tertiary-fixed-dim hover:text-inverse-on-surface'
              )}
            >
              {meta.displayCode}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant: Compact toggle button
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/60 text-body-sm font-medium hover:bg-surface-container-low transition-colors select-none cursor-pointer',
          className
        )}
        title="Đổi ngôn ngữ / Change language"
      >
        <Globe size={14} className="text-secondary" />
        <span className="font-semibold">{localeMetaMap[locale].displayCode}</span>
      </button>
    );
  }

  // Variant: Dropdown
  return (
    <div ref={dropdownRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low text-body-sm font-medium transition-all shadow-xs cursor-pointer select-none"
      >
        <Globe size={16} className="text-primary shrink-0" />
        <span>{localeMetaMap[locale].nativeName}</span>
        <ChevronDown size={14} className={cn('text-secondary transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-xl bg-surface-container-lowest border border-outline-variant/40 shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {supportedLocales.map((loc) => {
            const isActive = locale === loc;
            const meta = localeMetaMap[loc];
            return (
              <button
                key={loc}
                type="button"
                onClick={() => {
                  setLocale(loc);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2 text-body-sm transition-colors text-left cursor-pointer',
                  isActive
                    ? 'bg-primary-container/10 text-primary font-semibold'
                    : 'text-on-surface hover:bg-surface-container-low'
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{meta.flag}</span>
                  <span>{meta.nativeName}</span>
                </div>
                {isActive && <Check size={16} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

LanguageSwitcher.displayName = 'LanguageSwitcher';
