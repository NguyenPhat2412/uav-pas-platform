'use client';

import Link from 'next/link';
import {useI18n} from '@/contexts/I18nContext';

export default function ErrorPage({
                                      error,
                                      reset,
                                  }: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    const {t} = useI18n();
    return (
        <main className="min-h-[80vh] flex items-center justify-center p-8 bg-slate-50">
            <div
                className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#ab2523] p-8 shadow-sm space-y-4 text-center">
        <span
            className="inline-block text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#fef2f2] text-[#ab2523] border border-[#fecaca]">
          {error?.code || 'ADMIN_PORTAL_EXCEPTION'}
        </span>
                <h1 className="text-xl font-extrabold text-slate-900">{t('admin.error.title')}</h1>
                <p className="text-sm text-slate-600">
                    {error?.message || t('admin.error.detail')}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={reset}
                        className="px-4 py-2 bg-[#ab2523] hover:bg-[#8f1c1a] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                        {t('admin.error.retry')}
                    </button>
                    <Link
                        href="/admin/dashboard"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition"
                    >
                        {t('admin.error.toDashboard')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
