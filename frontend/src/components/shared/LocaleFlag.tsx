import type {ReactNode} from 'react';
import type {SupportedLocale} from '@/i18n/config';

// Inline SVG flags: emoji flags render as plain letters on Windows.
const flags: Record<SupportedLocale, ReactNode> = {
    vi: <>
        <rect width="30" height="20" className="fill-red-600"/>
        <path className="fill-yellow-300"
              d="M15 4.2l1.35 4.15h4.36l-3.53 2.56 1.35 4.15L15 12.5l-3.53 2.56 1.35-4.15-3.53-2.56h4.36z"/>
    </>,
    en: <>
        <rect width="30" height="20" className="fill-white"/>
        {[0, 2, 4, 6, 8, 10, 12].map(row => <rect key={row} y={row * 20 / 13} width="30" height={20 / 13}
                                                  className="fill-red-700"/>)}
        <rect width="12" height={20 * 7 / 13} className="fill-indigo-900"/>
    </>,
    ja: <>
        <rect width="30" height="20" className="fill-white"/>
        <circle cx="15" cy="10" r="6" className="fill-rose-700"/>
    </>,
};

export function LocaleFlag({code}: { code: SupportedLocale }) {
    return <svg className="h-4 w-6 shrink-0 rounded-xs shadow-2xs" viewBox="0 0 30 20" width="24" height="16" aria-hidden="true"
                focusable="false">{flags[code]}</svg>;
}
