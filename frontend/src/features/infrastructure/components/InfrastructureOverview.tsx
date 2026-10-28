'use client';

import Link from 'next/link';
import {Activity, Archive, ArrowRight, Database, HardDrive, Mail, Rocket, Terminal} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {infrastructureApi} from '../api';
import {backupTone} from './BackupsPanel';
import {tlsTone} from './DeploymentPanel';
import {Panel, type Tone, useInfraQuery} from './InfraUi';
import {cn} from '@/lib/utils';

const toneDot: Record<Tone, string> = {good: 'bg-uav-blue', warn: 'bg-amber-500', bad: 'bg-red-600', neutral: 'bg-slate-400', off: 'bg-slate-300'};

const runbook = ['restart', 'logs', 'restore', 'certbot', 'secrets', 'uptime'] as const;

export function InfrastructureOverview() {
    const {t} = useI18n();
    // Only the cheap, local checks load here; storage listing and DB stats load on their own pages.
    const deployment = useInfraQuery('deployment', ({signal}) => infrastructureApi.deployment(signal));
    const backups = useInfraQuery('backups', ({signal}) => infrastructureApi.backups(signal));
    const email = useInfraQuery('email', ({signal}) => infrastructureApi.email(signal));

    const cards: { key: string; href: string; icon: typeof Rocket; tone?: Tone; summary?: string }[] = [
        {
            key: 'deployment', href: '/admin/infrastructure/deployment', icon: Rocket,
            tone: deployment.data ? tlsTone(deployment.data.tls) : undefined,
            summary: deployment.data && t('adminInfra.overview.deploymentSummary', {
                version: deployment.data.version, commit: deployment.data.gitCommit,
                tls: t(`adminInfra.tls.status.${deployment.data.tls.status}`),
            }),
        },
        {
            key: 'backups', href: '/admin/infrastructure/backups', icon: Archive,
            tone: backups.data ? backupTone[backups.data.status] : undefined,
            summary: backups.data && t(`adminInfra.backups.status.${backups.data.status}`),
        },
        {key: 'storage', href: '/admin/infrastructure/storage', icon: HardDrive},
        {key: 'database', href: '/admin/infrastructure/database', icon: Database},
        {
            key: 'email', href: '/admin/infrastructure/email', icon: Mail,
            tone: email.data ? (email.data.enabled ? ({UP: 'good', DOWN: 'bad', DISABLED: 'off', UNKNOWN: 'neutral'} as const)[email.data.connection.status] : 'off') : undefined,
            summary: email.data && t(`adminInfra.email.connection.${email.data.enabled ? email.data.connection.status : 'DISABLED'}`),
        },
        {key: 'health', href: '/admin/system-health', icon: Activity},
    ];

    return <div className="space-y-4">
        <p className="m-0 text-[13px] text-slate-600">{t('adminInfra.overview.intro')}</p>
        <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(card => {
                const Icon = card.icon;
                return <Link key={card.key} href={card.href} className="group flex flex-col gap-2 bg-white px-4 py-4 hover:bg-slate-50">
                    <span className="flex items-center gap-2">
                        <Icon size={18} className="text-slate-500" aria-hidden="true"/>
                        <strong className="flex-1 text-[14px] text-slate-900">{t(`adminInfra.nav.${card.key}`)}</strong>
                        {card.tone && <span className={cn('h-2.5 w-2.5 rounded-full', toneDot[card.tone])} aria-hidden="true"/>}
                        <ArrowRight size={15} className="text-slate-400 group-hover:text-slate-700" aria-hidden="true"/>
                    </span>
                    <span className="text-[13px] text-slate-600">{t(`adminInfra.overview.cards.${card.key}`)}</span>
                    {card.summary && <span className="text-xs font-medium text-slate-700">{card.summary}</span>}
                </Link>;
            })}
        </div>

        <Panel id="runbook" title={t('adminInfra.overview.runbookTitle')} icon={Terminal} footer={t('adminInfra.overview.runbookFooter')}>
            <p className="m-0 px-4 pt-3 text-[13px] text-slate-600">{t('adminInfra.overview.runbookIntro')}</p>
            <ul className="m-0 divide-y divide-slate-100 px-4 py-2">
                {runbook.map(item => <li key={item} className="grid gap-1 py-2.5 text-[13px] sm:grid-cols-[220px_minmax(0,1fr)]">
                    <strong className="text-slate-900">{t(`adminInfra.overview.runbook.${item}.title`)}</strong>
                    <span className="text-slate-600">{t(`adminInfra.overview.runbook.${item}.how`)}</span>
                </li>)}
            </ul>
        </Panel>
    </div>;
}
