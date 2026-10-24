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
    return <div className="portal-auth">
        <header className="portal-auth-header">
            <a href={homeUrl} className="portal-brand" aria-label={t('authShared.home')}>
                <img src="/vju-logo.svg" alt={t('authShared.university')} width={34} height={34}/>
                <strong>UAV PAS</strong>
            </a>
            <div className="portal-auth-links">{tools}<a href={homeUrl}>{t('authShared.backHome')}</a></div>
        </header>
        <main className="portal-auth-main">
            <section className="portal-auth-intro">
                <p className="portal-eyebrow">{t('authShared.eyebrow')}</p>
                <h1>{keepVietnamesePhrases(title)}</h1>
                <p className="portal-auth-description">{description}</p>
                <figure className="portal-team-photo">
                    <img src="/images/uav-photos/usgs-plum-island-team-960.webp"
                         srcSet="/images/uav-photos/usgs-plum-island-team-640.webp 640w, /images/uav-photos/usgs-plum-island-team-960.webp 960w"
                         sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 900px) 45vw, 490px"
                         alt={t('authShared.photoAlt')}
                         width={960} height={640} decoding="async"/>
                </figure>
            </section>
            <section className="portal-auth-card" aria-label={t('authShared.formLabel')}>
                {children}
            </section>
        </main>
        <footer className="portal-auth-footer"><span>{t('authShared.footer')}</span></footer>
    </div>;
}
