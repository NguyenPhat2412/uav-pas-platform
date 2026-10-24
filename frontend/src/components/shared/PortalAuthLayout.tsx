'use client';
import React, {type ReactNode} from 'react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {useI18n} from '@/contexts/I18nContext';

export function PortalAuthLayout({title, description, homeUrl, tools, children}: {
    title: string;
    description: string;
    homeUrl: string;
    tools?: ReactNode;
    children: ReactNode;
}) {
    const {t} = useI18n();
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
                <a href={homeUrl} className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-foreground" aria-label={t('authShared.home')}>
                    <img src="/vju-logo.svg" alt={t('authShared.university')} width={34} height={34} className="h-[34px] w-[34px] object-contain"/>
                    <strong>UAV PAS</strong>
                </a>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    {tools}
                    <a href={homeUrl} className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                        {t('authShared.backHome')}
                    </a>
                </div>
            </header>
            <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-12">
                <section className="space-y-4 lg:col-span-6">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-primary">{t('authShared.eyebrow')}</p>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{keepVietnamesePhrases(title)}</h1>
                    <p className="text-base leading-relaxed text-slate-600">{description}</p>
                    <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
                        <img
                            src="/images/uav-photos/usgs-plum-island-team-960.webp"
                            srcSet="/images/uav-photos/usgs-plum-island-team-640.webp 640w, /images/uav-photos/usgs-plum-island-team-960.webp 960w"
                            sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 900px) 45vw, 490px"
                            alt={t('authShared.photoAlt')}
                            width={960}
                            height={640}
                            decoding="async"
                            className="h-auto w-full object-cover"
                        />
                    </figure>
                </section>
                <section className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8 lg:col-span-6" aria-label={t('authShared.formLabel')}>
                    {children}
                </section>
            </main>
            <footer className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-xs text-slate-500 sm:px-6">
                <span>{t('authShared.footer')}</span>
            </footer>
        </div>
    );
}
