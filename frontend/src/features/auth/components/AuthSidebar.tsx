'use client';

import React from 'react';
import {Radar} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {Badge, LanguageSwitcher} from '@/components/ui';

export interface AuthSidebarProps {
    className?: string;
}

export function AuthSidebar({className}: AuthSidebarProps) {
    const {t} = useI18n();

    return (
        <aside
            className={`relative hidden lg:flex flex-col justify-between bg-inverse-surface text-inverse-on-surface p-8 overflow-hidden min-h-screen ${
                className || ''
            }`}
        >
            {/* Background Radar & Flight Path Vector Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <svg
                    className="w-full h-full"
                    fill="none"
                    viewBox="0 0 800 800"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <pattern
                            id="uav-grid"
                            width="40"
                            height="40"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 40 0 L 0 0 0 40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                                className="text-surface-variant"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#uav-grid)"/>
                    <path
                        d="M100 680 L280 460 L420 540 L650 220"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="6 6"
                        className="text-primary-fixed"
                    />
                    <circle cx="280" cy="460" r="6" fill="currentColor" className="text-primary-fixed"/>
                    <circle cx="420" cy="540" r="6" fill="currentColor" className="text-primary-fixed"/>
                    <circle cx="650" cy="220" r="8" fill="currentColor" className="text-primary"/>
                    <circle
                        cx="650"
                        cy="220"
                        r="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.6"
                        className="text-primary-fixed animate-ping"
                    />
                </svg>
            </div>

            {/* Header with Brand Logo & Language Switcher */}
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-11 h-11 rounded-none bg-white p-1 flex items-center justify-center border border-white/20 shrink-0">
                        <img src="/vju-logo.svg" alt="VJU Logo" width={36} height={36}
                             className="w-9 h-9 object-contain"/>
                    </div>
                    <div>
            <span className="font-headline-sm text-headline-sm text-inverse-on-surface font-bold tracking-tight block">
              {t('sidebar.title')}
            </span>
                        <span
                            className="font-label-caps text-label-caps text-tertiary-fixed-dim uppercase tracking-wider block">
              {t('sidebar.subtitle')} · VJU
            </span>
                    </div>
                </div>

                {/* Modular Language Switcher Component */}
                <LanguageSwitcher variant="pill"/>
            </div>

            {/* Hero Content */}
            <div className="relative z-10 max-w-lg my-auto py-12">
                <div className="mb-4">
                    <Badge variant="telemetry" pulse>
                        {t('sidebar.badge')}
                    </Badge>
                </div>
                <h1 className="font-display-lg text-display-lg text-inverse-on-surface font-bold tracking-tight mb-4 leading-tight">
                    {t('sidebar.heading')}
                </h1>
                <p className="font-body-lg text-body-lg text-tertiary-fixed-dim leading-relaxed">
                    {t('sidebar.desc')}
                </p>
            </div>

            {/* Footer Info */}
            <div
                className="relative z-10 flex items-center justify-between text-tertiary-fixed-dim pt-6 border-t border-outline-variant/15">
                <div className="flex items-center gap-2">
                    <Radar size={18} className="text-primary-fixed"/>
                    <span className="font-label-md text-label-md">
            {t('sidebar.telemetry')}
          </span>
                </div>
                <span className="font-label-caps text-label-caps uppercase tracking-wider">
          {t('sidebar.cert')}
        </span>
            </div>
        </aside>
    );
}
