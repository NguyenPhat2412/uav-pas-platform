'use client';

import React from 'react';
import { PlaneTakeoff, Radar, Radio, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { Badge, LanguageSwitcher } from '@/components/ui';

export interface AuthSidebarProps {
  className?: string;
}

export function AuthSidebar({ className }: AuthSidebarProps) {
  const { t } = useI18n();

  return (
    <aside
      className={`relative hidden lg:flex flex-col justify-between bg-[#0a192f] text-white p-8 overflow-hidden min-h-screen border-r border-[#1e3a5f] ${
        className || ''
      }`}
    >
      {/* Background Radar & Flight Path Vector Grid with Animated Sweep & Nodes */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
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
                className="text-slate-600"
              />
            </pattern>
            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ab2523" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ab2523" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#uav-grid)" />

          {/* Radar Circles */}
          <circle cx="400" cy="400" r="160" stroke="#ab2523" strokeWidth="1" opacity="0.3" />
          <circle cx="400" cy="400" r="280" stroke="#ab2523" strokeWidth="1" opacity="0.2" />
          <circle cx="400" cy="400" r="360" stroke="#ab2523" strokeWidth="1" strokeDasharray="4 6" opacity="0.15" />

          {/* Rotating Radar Sweep Line */}
          <g className="animate-sweep" style={{ transformOrigin: '400px 400px' }}>
            <line x1="400" y1="400" x2="780" y2="400" stroke="#ab2523" strokeWidth="2" opacity="0.6" />
            <path d="M400 400 L760 300 A400 400 0 0 1 780 400 Z" fill="url(#radar-glow)" />
          </g>

          {/* Tactical Flight Paths */}
          <path
            d="M100 680 L280 460 L420 540 L650 220"
            stroke="#007f3e"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            opacity="0.8"
          />
          <circle cx="280" cy="460" r="6" fill="#007f3e" className="animate-pulse" />
          <circle cx="420" cy="540" r="6" fill="#007f3e" className="animate-pulse" />
          <circle cx="650" cy="220" r="9" fill="#007f3e" />
          <circle
            cx="650"
            cy="220"
            r="22"
            fill="none"
            stroke="#007f3e"
            strokeWidth="2"
            className="animate-ping"
          />
        </svg>
      </div>

      {/* Header with Brand Logo & Language Switcher */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-white/20 animate-uav-hover shrink-0">
            <img src="/vju-logo.svg" alt="VJU Logo" width={36} height={36} className="w-9 h-9 object-contain" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white block whitespace-nowrap">
              {t('sidebar.title')}
            </span>
            <span className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-wider block whitespace-nowrap">
              {t('sidebar.subtitle')} · VJU
            </span>
          </div>
        </div>

        <LanguageSwitcher variant="pill" />
      </div>

      {/* Hero Content - Clean, 1-line, no small description clutter */}
      <div className="relative z-10 max-w-lg my-auto py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#ab2523]/25 text-[#fecaca] border border-[#ab2523]/50 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-[#ab2523] animate-ping" />
            {t('sidebar.badge')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#007f3e]/20 text-[#a7f3d0] border border-[#007f3e]/40 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-[#007f3e] animate-pulse" />
            RTK 5G SẴN SÀNG
          </span>
        </div>

        {/* Big Single-Line Heading without wrapping or tiny description */}
        <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none whitespace-nowrap">
          {t('sidebar.heading')}
        </h1>

        {/* Tech HUD crosshairs decorative bar */}
        <div className="mt-8 flex items-center gap-4 text-xs font-mono text-[#a3a3a3]">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-[#007f3e] animate-pulse" />
            <span className="whitespace-nowrap">FREQ: 5.8 GHz</span>
          </div>
          <span className="text-[#525252]">•</span>
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#007f3e]" />
            <span className="whitespace-nowrap">LAT: &lt;15ms</span>
          </div>
        </div>
      </div>

      {/* Footer Info - Single line */}
      <div className="relative z-10 flex items-center justify-between text-slate-400 pt-6 border-t border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Radar size={16} className="text-[#007f3e] animate-spin" style={{ animationDuration: '6s' }} />
          <span>{t('sidebar.telemetry')}</span>
        </div>
        <span className="uppercase tracking-wider font-mono text-[11px] whitespace-nowrap">
          {t('sidebar.cert')}
        </span>
      </div>
    </aside>
  );
}
