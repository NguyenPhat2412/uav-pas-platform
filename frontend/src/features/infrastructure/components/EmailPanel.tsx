'use client';

import {useMutation} from '@tanstack/react-query';
import {Mail, Plug, Send} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {cn} from '@/lib/utils';
import {infrastructureApi} from '../api';
import type {EmailStatus, MailConnectionCheck} from '../types';
import {Facts, Note, Panel, StatusBanner, type Tone, useInfraQuery} from './InfraUi';

const connectionTone: Record<MailConnectionCheck['status'], Tone> = {UP: 'good', DOWN: 'bad', DISABLED: 'off', UNKNOWN: 'neutral'};

export function EmailPanel() {
    const {t} = useI18n();
    const query = useInfraQuery('email', ({signal}) => infrastructureApi.email(signal));
    return <div className="space-y-4">
        <QueryState query={query}>{query.data && <Body data={query.data} refreshing={query.isFetching} onRefresh={() => void query.refetch()}/>}</QueryState>
        <Note>{t('adminInfra.email.note')}</Note>
    </div>;
}

function Body({data, refreshing, onRefresh}: { data: EmailStatus; refreshing: boolean; onRefresh: () => void }) {
    const {t, formatDate} = useI18n();
    const yesNo = (value: boolean) => t(value ? 'adminInfra.common.yes' : 'adminInfra.common.no');
    const tone = data.enabled ? connectionTone[data.connection.status] ?? 'neutral' : 'off';
    return <>
        <StatusBanner tone={tone} title={t(`adminInfra.email.connection.${data.enabled ? data.connection.status : 'DISABLED'}`)}
                      detail={t(data.enabled ? 'adminInfra.email.enabledDetail' : 'adminInfra.email.disabledDetail')}
                      onRefresh={onRefresh} refreshing={refreshing}
                      checkedAt={data.connection.checkedAt ? formatDate(data.connection.checkedAt, {timeStyle: 'medium'}) : undefined}/>
        <div className="grid gap-4 lg:grid-cols-2">
            <Panel id="mail-config" title={t('adminInfra.email.config')} icon={Mail} footer={t('adminInfra.email.configHint')}>
                <Facts rows={[
                    [t('adminInfra.email.enabled'), yesNo(data.enabled), !data.enabled],
                    [t('adminInfra.email.hostConfigured'), yesNo(data.hostConfigured), !data.hostConfigured],
                    [t('adminInfra.email.usernameConfigured'), yesNo(data.usernameConfigured)],
                    [t('adminInfra.email.port'), data.port ?? '—'],
                    [t('adminInfra.email.from'), data.fromAddress],
                ]}/>
            </Panel>
            <Panel id="mail-connection" title={t('adminInfra.email.connectionTitle')} icon={Plug} tone={tone}
                   badge={t(`adminInfra.email.connectionStatus.${data.connection.status}`)} footer={t('adminInfra.email.connectionHint')}>
                <Facts rows={[
                    [t('adminInfra.email.lastProbe'), data.connection.checkedAt ? formatDate(data.connection.checkedAt, {dateStyle: 'medium', timeStyle: 'medium'}) : '—'],
                    [t('adminInfra.common.error'), data.connection.errorClass ?? '—', !!data.connection.errorClass],
                ]}/>
            </Panel>
        </div>
        <TestEmail data={data}/>
    </>;
}

function TestEmail({data}: { data: EmailStatus }) {
    const {t, formatDate} = useI18n();
    const mutation = useMutation({mutationFn: () => infrastructureApi.sendTestEmail()});
    const result = mutation.data;
    const disabled = !data.enabled || !data.testRecipient || mutation.isPending;
    return <Panel id="mail-test" title={t('adminInfra.email.testTitle')} icon={Send}
                  footer={t('adminInfra.email.testHint', {seconds: data.testCooldownSeconds})}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]">
            <span className="text-slate-600">{data.testRecipient
                ? t('adminInfra.email.testRecipient', {email: data.testRecipient})
                : t('adminInfra.email.noRecipient')}</span>
            <button type="button" disabled={disabled} onClick={() => mutation.mutate()}
                    className="inline-flex h-9 items-center gap-1.5 bg-slate-900 px-3 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                <Send size={14} aria-hidden="true"/>{t(mutation.isPending ? 'adminInfra.email.sending' : 'adminInfra.email.send')}</button>
        </div>
        {!data.enabled && <p className="m-0 px-4 pb-3 text-xs text-slate-500">{t('adminInfra.email.testDisabled')}</p>}
        {result && <p role="status" className={cn('m-0 px-4 pb-3 text-[13px] font-medium', result.success ? 'text-uav-blue' : 'text-red-700')}>
            {result.success
                ? t('adminInfra.email.testSent', {email: result.recipient, time: formatDate(result.attemptedAt, {timeStyle: 'medium'})})
                : t('adminInfra.email.testFailed', {error: result.errorClass ?? '—'})}</p>}
        {mutation.error && <div className="px-4 pb-3"><ErrorNotice error={mutation.error}/></div>}
    </Panel>;
}
