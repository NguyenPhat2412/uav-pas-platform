'use client';

import Link from 'next/link';
import {useI18n} from '@/contexts/I18nContext';

export default function OperationsNotFoundPage() {
    const {t} = useI18n();
    return (
        <main className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <span
            className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-uav-red-light text-primary border border-red-200 mb-3">
          404 · RESOURCE_NOT_FOUND
        </span>
                <h1 className="text-xl font-extrabold text-slate-900 mb-2">{t('opsShared.routes.operations.notFoundTitle')}</h1>
                <p className="text-sm text-slate-600 mb-6">
                    {t('opsShared.routes.operations.notFoundDetail')}
                </p>
                <Link
                    href="/operations/overview"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-xl shadow-xs transition"
                >
                    {t('opsShared.routes.operations.notFoundBack')}
                </Link>
            </div>
        </main>
    );
}
