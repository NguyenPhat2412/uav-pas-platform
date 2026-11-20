'use client';

import {Info} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

/**
 * Single compact muted caption badge ("minh hoạ") placed right beside a price or monetary amount
 * (UI-REVIEW-9-FIXES #1 & README §3).
 */
export function IllustrativeBadge() {
    const {t} = useI18n();
    return (
        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-500">
            {t('opsMarketplace.common.illustrationBadge')}
        </span>
    );
}

/**
 * Single subtle footer note placed once at the bottom of a marketplace or wallet page:
 * "Giá và giao dịch trên nền tảng là minh hoạ phục vụ đồ án."
 */
export function IllustrativeFooterNote() {
    const {t} = useI18n();
    return (
        <p className="m-0 flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-slate-500">
            <Info size={13} className="shrink-0 text-slate-400" aria-hidden="true"/>
            <span>{t('opsMarketplace.common.illustrativeFooterNote')}</span>
        </p>
    );
}
