'use client';

import Link from 'next/link';
import {useI18n} from '@/contexts/I18nContext';

export default function AdminNotFoundPage() {
    const {t} = useI18n();
    return (
        <main className="min-h-[80vh] flex items-center justify-center p-8 bg-slate-50">
            <div
                className="max-w-md w-full bg-white rounded-none border border-slate-200 p-8 text-center space-y-4">
        <span
            className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-none bg-uav-red-light text-primary border border-red-200">
          404 · RESOURCE_NOT_FOUND
        </span>
                <h1 className="text-xl font-extrabold text-slate-900">{t('admin.notFound.title')}</h1>
                <p className="text-sm text-slate-600">
                    {t('admin.notFound.detail')}
                </p>
                <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-none transition"
                >
                    {t('admin.notFound.back')}
                </Link>
            </div>
        </main>
    );
}
