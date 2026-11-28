'use client';

import {useState} from 'react';
import {Ban, KeyRound, LifeBuoy, RefreshCw, Search, Unlock} from 'lucide-react';
import {Pagination} from '@/components/data/Pagination';
import {QueryState} from '@/components/data/WorkspaceState';
import {Panel} from '@/components/infrastructure/runtime/InfraUi';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {Alert, Badge, Button, Input} from '@/components/ui';
import {canSubmitOtpSupportEmail} from '@/forms/mail-otp-form';
import {
    useAdminOtpTokens,
    useClearOtpRateLimitSupport,
    useInvalidateOtpToken,
    useSendResetOtpSupport,
} from '@/hooks/useInfrastructure';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {AdminOtpToken} from '@/types/infrastructure.types';

const PURPOSE_OPTIONS = ['ALL', 'PASSWORD_RESET', 'REGISTER_VERIFY', 'LOGIN_2FA', 'ENABLE_2FA_EMAIL'] as const;
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'CONSUMED', 'LOCKED', 'EXPIRED'] as const;

function statusVariant(status: string): 'success' | 'default' | 'error' | 'outline' {
    if (status === 'ACTIVE') return 'success';
    if (status === 'LOCKED') return 'error';
    if (status === 'CONSUMED') return 'default';
    return 'outline';
}

export function OtpSupportMonitorSection() {
    const {t, formatDate} = useI18n();
    const [supportEmail, setSupportEmail] = useState('');
    const [supportNotice, setSupportNotice] = useState<string | null>(null);
    const [purpose, setPurpose] = useState<string>('ALL');
    const [status, setStatus] = useState<string>('ALL');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(0);

    const tokensQuery = useAdminOtpTokens(page, {purpose, status, q});

    const sendReset = useSendResetOtpSupport({
        onSuccess: res => {
            setSupportNotice(res.message);
            toast.success(res.message);
        },
        onError: err => toast.error(err instanceof Error ? err.message : t('common.permissionError')),
    });

    const clearRateLimit = useClearOtpRateLimitSupport({
        onSuccess: res => {
            setSupportNotice(res.message);
            toast.success(res.message);
        },
        onError: err => toast.error(err instanceof Error ? err.message : t('common.permissionError')),
    });

    const invalidateToken = useInvalidateOtpToken({
        onSuccess: (_res, id) => {
            const row = tokensQuery.data?.content.find(item => item.id === id);
            toast.success(t('adminInfra.email.otpSupport.invalidatedToast', {email: row?.email ?? `#${id}`}));
        },
        onError: err => toast.error(err instanceof Error ? err.message : t('common.permissionError')),
    });

    const validEmail = canSubmitOtpSupportEmail(supportEmail);
    const formatShort = (val?: string | null) =>
        val ? formatDate(val, {dateStyle: 'short', timeStyle: 'short'}) : '—';

    const purposeLabel = (raw: string) =>
        PURPOSE_OPTIONS.includes(raw as (typeof PURPOSE_OPTIONS)[number])
            ? t(`adminInfra.email.otpSupport.purpose.${raw}`)
            : raw;

    const statusLabel = (raw: string) =>
        STATUS_OPTIONS.includes(raw as (typeof STATUS_OPTIONS)[number])
            ? t(`adminInfra.email.otpSupport.status.${raw}`)
            : raw;

    return (
        <Panel id="otp-support-monitor" title={t('adminInfra.email.otpSupport.title')} icon={LifeBuoy}>
            <div className="space-y-4 p-4">
                <p className="m-0 text-xs text-slate-600">{t('adminInfra.email.otpSupport.subtitle')}</p>

                <div className="rounded-control border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                            <Input
                                id="otp-support-email"
                                label={t('adminInfra.email.otpSupport.emailLabel')}
                                type="email"
                                inputMode="email"
                                required
                                placeholder={t('adminInfra.email.otpSupport.emailPlaceholder')}
                                value={supportEmail}
                                onChange={e => setSupportEmail(e.target.value)}
                                className="h-10 bg-white text-xs font-semibold"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={!validEmail || clearRateLimit.isPending}
                                isLoading={sendReset.isPending}
                                loadingText={t('adminInfra.email.otpSupport.sendingResetButton')}
                                leftIcon={<KeyRound size={14} aria-hidden="true"/>}
                                onClick={() => sendReset.mutate(supportEmail)}
                                className="h-10"
                            >
                                {t('adminInfra.email.otpSupport.sendResetButton')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!validEmail || sendReset.isPending}
                                isLoading={clearRateLimit.isPending}
                                loadingText={t('adminInfra.email.otpSupport.clearingRateLimitButton')}
                                leftIcon={<Unlock size={14} aria-hidden="true"/>}
                                onClick={() => clearRateLimit.mutate(supportEmail)}
                                className="h-10 bg-white"
                            >
                                {t('adminInfra.email.otpSupport.clearRateLimitButton')}
                            </Button>
                        </div>
                    </div>
                    {supportNotice && (
                        <Alert variant="info" role="status" className="mt-3 py-2 text-xs">
                            {supportNotice}
                        </Alert>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <FilterSelect
                        label={t('adminInfra.email.otpSupport.filterPurposeLabel')}
                        value={purpose}
                        onChange={val => {
                            setPurpose(val);
                            setPage(0);
                        }}
                        options={PURPOSE_OPTIONS.map(key => ({
                            value: key,
                            label: t(`adminInfra.email.otpSupport.purpose.${key}`),
                        }))}
                    />
                    <FilterSelect
                        label={t('adminInfra.email.otpSupport.filterStatusLabel')}
                        value={status}
                        onChange={val => {
                            setStatus(val);
                            setPage(0);
                        }}
                        options={STATUS_OPTIONS.map(key => ({
                            value: key,
                            label: t(`adminInfra.email.otpSupport.status.${key}`),
                        }))}
                    />
                    <div className="min-w-[220px] flex-1">
                        <Input
                            id="otp-token-search"
                            aria-label={t('adminInfra.email.otpSupport.searchPlaceholder')}
                            placeholder={t('adminInfra.email.otpSupport.searchPlaceholder')}
                            leftIcon={<Search size={14} aria-hidden="true"/>}
                            value={q}
                            onChange={e => {
                                setQ(e.target.value);
                                setPage(0);
                            }}
                            className="h-9 text-xs"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={tokensQuery.isFetching}
                        leftIcon={<RefreshCw size={13} className={cn(tokensQuery.isFetching && 'animate-spin')} aria-hidden="true"/>}
                        onClick={() => void tokensQuery.refetch()}
                        className="h-9"
                    >
                        {t('adminInfra.common.refresh')}
                    </Button>
                </div>

                <QueryState query={tokensQuery}>
                    {tokensQuery.data && (
                        <>
                            {tokensQuery.data.content.length ? (
                                <div className="overflow-x-auto border border-slate-200" tabIndex={0} aria-label={t('adminInfra.email.otpSupport.tableAria')}>
                                    <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                                        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3.5 py-2.5">{t('adminInfra.email.otpSupport.col.account')}</th>
                                            <th className="px-3.5 py-2.5">{t('adminInfra.email.otpSupport.col.purpose')}</th>
                                            <th className="px-3.5 py-2.5">{t('adminInfra.email.otpSupport.col.status')}</th>
                                            <th className="px-3.5 py-2.5 text-right">{t('adminInfra.email.otpSupport.col.attempts')}</th>
                                            <th className="px-3.5 py-2.5">{t('adminInfra.email.otpSupport.col.created')}</th>
                                            <th className="px-3.5 py-2.5">{t('adminInfra.email.otpSupport.col.expires')}</th>
                                            <th className="px-3.5 py-2.5 text-right">{t('adminInfra.email.otpSupport.col.actions')}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {tokensQuery.data.content.map((token: AdminOtpToken) => (
                                            <tr key={token.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                                                <td className="px-3.5 py-2.5">
                                                    <span className="block font-semibold text-slate-900">{token.email}</span>
                                                    {token.username && <span className="text-xs text-slate-500">@{token.username}</span>}
                                                </td>
                                                <td className="px-3.5 py-2.5">
                                                    <Badge variant="outline" size="sm">{purposeLabel(token.purpose)}</Badge>
                                                </td>
                                                <td className="px-3.5 py-2.5">
                                                    <Badge variant={statusVariant(token.status)} size="sm">{statusLabel(token.status)}</Badge>
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right font-mono text-xs tabular-nums text-slate-700">
                                                    {token.attempts} / {token.maxAttempts}
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-2.5 text-xs tabular-nums text-slate-500">
                                                    {formatShort(token.createdAt)}
                                                </td>
                                                <td className="whitespace-nowrap px-3.5 py-2.5 text-xs tabular-nums text-slate-500">
                                                    {formatShort(token.consumedAt ?? token.expiresAt)}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-right">
                                                    {token.status === 'ACTIVE' ? (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            isLoading={invalidateToken.isPending && invalidateToken.variables === token.id}
                                                            leftIcon={<Ban size={12} aria-hidden="true"/>}
                                                            onClick={() => invalidateToken.mutate(token.id)}
                                                            className="h-7 px-2.5 text-xs text-danger hover:border-danger"
                                                        >
                                                            {t('adminInfra.email.otpSupport.invalidateButton')}
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="m-0 border border-slate-200 px-4 py-8 text-center text-xs text-slate-500">
                                    {t('adminInfra.email.otpSupport.emptyTokens')}
                                </p>
                            )}
                            {tokensQuery.data.totalPages > 1 && (
                                <Pagination
                                    page={page}
                                    totalPages={tokensQuery.data.totalPages}
                                    total={tokensQuery.data.totalElements}
                                    onChange={setPage}
                                />
                            )}
                        </>
                    )}
                </QueryState>
            </div>
        </Panel>
    );
}
