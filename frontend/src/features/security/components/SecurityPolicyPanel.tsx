'use client';

import type {ReactNode} from 'react';
import {Cookie, Globe, KeyRound, Mail, Server, Timer} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {useSecurityPolicy} from '@/features/security/hooks/useSecurity';
import {Flag, WarningList} from '@/features/security/components/SecurityShared';
import type {SecurityPolicy} from '@/features/security/types/security.types';

export function SecurityPolicyPanel() {
    const {t} = useI18n();
    const query = useSecurityPolicy();
    return <div className="space-y-4">
        <QueryState query={query}>{query.data && <Body policy={query.data}/>}</QueryState>
        <p className="m-0 text-xs text-slate-500">{t('adminSecurity.policy.readOnlyNote')}</p>
    </div>;
}

function Body({policy}: { policy: SecurityPolicy }) {
    const {t} = useI18n();
    const duration = (ms: number) => formatDuration(ms, t);
    return <>
        <WarningList warnings={policy.warnings} okKey="adminSecurity.policy.allGood"/>
        <div className="grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-2">
            <Group icon={<Timer size={17}/>} title={t('adminSecurity.policy.groups.tokens')}>
                <Row label={t('adminSecurity.policy.fields.accessToken')} property="app.jwt.expiration-ms">{duration(policy.accessTokenExpirationMs)}</Row>
                <Row label={t('adminSecurity.policy.fields.refreshToken')} property="app.jwt.refresh-expiration-ms">{duration(policy.refreshTokenExpirationMs)}</Row>
            </Group>
            <Group icon={<KeyRound size={17}/>} title={t('adminSecurity.policy.groups.otp')}>
                <Row label={t('adminSecurity.policy.fields.otpTtl')} property="app.auth.otp-ttl-minutes">{t('adminSecurity.common.minutes', {count: policy.otpTtlMinutes})}</Row>
                <Row label={t('adminSecurity.policy.fields.totpIssuer')} property="app.auth.totp-issuer">{policy.totpIssuer}</Row>
                <Row label={t('adminSecurity.policy.fields.otpDevPreview')} property="app.auth.otp-dev-preview"><Flag on={policy.otpDevPreview} danger="on"/></Row>
            </Group>
            <Group icon={<Cookie size={17}/>} title={t('adminSecurity.policy.groups.cookie')}>
                <Row label={t('adminSecurity.policy.fields.cookieSecure')} property="app.cookie.secure"><Flag on={policy.cookieSecure} danger="off"/></Row>
                <Row label={t('adminSecurity.policy.fields.cookieSameSite')} property="app.cookie.same-site">{policy.cookieSameSite}</Row>
                <Row label={t('adminSecurity.policy.fields.cookieDomain')} property="app.cookie.domain">{policy.cookieDomain ?? t('adminSecurity.common.notSet')}</Row>
            </Group>
            <Group icon={<Mail size={17}/>} title={t('adminSecurity.policy.groups.mail')}>
                <Row label={t('adminSecurity.policy.fields.mailEnabled')} property="app.mail.enabled"><Flag on={policy.mailEnabled}/></Row>
            </Group>
            <Group icon={<Globe size={17}/>} title={t('adminSecurity.policy.groups.cors')}>
                <li className="px-4 py-2.5">
                    <span className="block text-xs text-slate-500">{t('adminSecurity.policy.fields.corsOrigins')} <code className="text-[11px]">app.cors.allowed-origins</code></span>
                    <ul className="m-0 mt-1 list-none space-y-0.5 p-0">{policy.corsAllowedOrigins.map(o =>
                        <li key={o}><code className="break-all text-[12.5px] text-slate-900">{o}</code></li>)}</ul>
                </li>
            </Group>
            <Group icon={<Server size={17}/>} title={t('adminSecurity.policy.groups.runtime')}>
                <Row label={t('adminSecurity.policy.fields.profiles')} property="spring.profiles.active">
                    {policy.activeProfiles.length ? policy.activeProfiles.join(', ') : t('adminSecurity.policy.defaultProfile')}</Row>
                <Row label={t('adminSecurity.policy.fields.productionLike')}><Flag on={policy.productionLike} onKey="adminSecurity.common.yes" offKey="adminSecurity.common.no"/></Row>
            </Group>
        </div>
    </>;
}

function Group({icon, title, children}: { icon: ReactNode; title: string; children: ReactNode }) {
    return <section className="bg-white">
        <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-slate-500">
            {icon}<h3 className="m-0 text-[14px] font-bold text-slate-900">{title}</h3>
        </header>
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">{children}</ul>
    </section>;
}

function Row({label, property, children}: { label: string; property?: string; children: ReactNode }) {
    return <li className="flex items-start justify-between gap-4 px-4 py-2.5 text-[13px]">
        <span className="min-w-0 text-slate-600">{label}{property && <code className="mt-0.5 block text-[11px] text-slate-400">{property}</code>}</span>
        <span className="text-right font-medium tabular-nums text-slate-900">{children}</span>
    </li>;
}

function formatDuration(ms: number, t: (key: string, params?: Record<string, string | number>) => string) {
    const minutes = Math.round(ms / 60000);
    if (minutes % 1440 === 0) return t('adminSecurity.common.days', {count: minutes / 1440});
    if (minutes % 60 === 0) return t('adminSecurity.common.hours', {count: minutes / 60});
    return t('adminSecurity.common.minutes', {count: minutes});
}
