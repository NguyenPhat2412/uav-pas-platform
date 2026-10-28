'use client';
import {PhoneCall} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {useSiteInfo} from '@/features/settings/hooks/useSiteInfo';

// Admin setting contact.dispatch_hotline wins; NEXT_PUBLIC_DISPATCH_HOTLINE is the build-time fallback.
// The button stays hidden until a staffed number is configured in either place.
export function DispatchHotline({variant, collapsed = false}: { variant: 'sidebar' | 'topbar'; collapsed?: boolean }) {
    const {t} = useI18n();
    const HOTLINE = useSiteInfo().dispatchHotline;
    if (!HOTLINE) return null;
    const label = t('hotline.call', {number: HOTLINE});
    const href = `tel:${HOTLINE.replace(/[^\d+]/g, '')}`;
    if (variant === 'topbar') {
        // Only on narrow screens, where the sidebar (and its hotline) is hidden behind the menu button.
        return <a href={href} title={label} aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-danger/30 bg-danger/10 text-danger transition-colors hover:bg-danger/15 lg:hidden">
            <PhoneCall size={16} aria-hidden="true"/>
        </a>;
    }
    return <a href={href} title={collapsed ? label : undefined} aria-label={label}
              className={`mb-1 flex items-center gap-2.5 rounded-control border border-danger/25 bg-danger/5 text-danger transition-colors hover:bg-danger/10 ${
                  collapsed ? 'mx-auto h-8 w-8 justify-center' : 'px-2.5 py-1.5'
              }`}>
        <PhoneCall size={16} className="shrink-0" aria-hidden="true"/>
        {!collapsed && <span className="grid min-w-0 leading-tight">
            <span className="truncate text-[11px] font-semibold">{t('hotline.label')}</span>
            <span className="truncate text-[13px] font-bold tabular-nums">{HOTLINE}</span>
        </span>}
    </a>;
}
