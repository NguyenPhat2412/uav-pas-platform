'use client';

import {useState} from 'react';
import {Check, Copy, KeyRound, ShieldCheck} from 'lucide-react';
import {Badge, Button, FormField, Input, PasswordInput} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useSaveGoogleOAuthConfig} from '@/hooks/useStoragePool';
import {validateGoogleOAuthConfigInput} from '@/forms/storage-pool-form';
import type {StoragePoolOverview} from '@/types/storage-pool.types';

export function GoogleDriveOAuthSetupBox({
    overview,
    redirectUri,
}: {
    overview: StoragePoolOverview;
    redirectUri: string;
}) {
    const {t} = useI18n();
    const saveOAuthConfig = useSaveGoogleOAuthConfig();

    const [showOAuthSetup, setShowOAuthSetup] = useState(!overview.oauthConfigured);
    const [oauthClientId, setOauthClientId] = useState('');
    const [oauthClientSecret, setOauthClientSecret] = useState('');
    const [copiedRedirect, setCopiedRedirect] = useState(false);

    const copyRedirectUri = async () => {
        try {
            await navigator.clipboard.writeText(redirectUri);
            setCopiedRedirect(true);
            window.setTimeout(() => setCopiedRedirect(false), 1800);
        } catch {
            toast.error(t('adminInfra.storage.pool.copyFailed'));
        }
    };

    const handleSaveOAuthCredentials = async () => {
        const checked = validateGoogleOAuthConfigInput({
            clientId: oauthClientId,
            clientSecret: oauthClientSecret,
        });
        if (!checked.ok) {
            toast.error(t(`adminInfra.storage.pool.${checked.errorKey}`));
            return;
        }
        try {
            await saveOAuthConfig.mutateAsync(checked.data);
            setOauthClientSecret('');
            setShowOAuthSetup(false);
            toast.success(t('adminInfra.storage.pool.oauthSaved'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    return (
        <div className="space-y-3 rounded-panel border border-slate-200 bg-surface-container-low/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-on-surface" />
                    <span className="text-[13px] font-semibold text-on-surface">
                        {t('adminInfra.storage.pool.oauthAppHeader')}
                    </span>
                    <Badge variant={overview.oauthConfigured ? 'success' : 'warning'} size="sm">
                        {overview.oauthConfigured
                            ? overview.maskedClientId ?? t('adminInfra.storage.pool.oauthReady')
                            : t('adminInfra.common.notConfigured')}
                    </Badge>
                </div>
                <button
                    type="button"
                    onClick={() => setShowOAuthSetup(v => !v)}
                    className="text-xs font-medium text-on-surface underline-offset-2 hover:underline"
                >
                    {showOAuthSetup
                        ? t('adminInfra.storage.pool.hideOAuthSetup')
                        : t('adminInfra.storage.pool.configureOAuthApp')}
                </button>
            </div>

            {showOAuthSetup && (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                    <div>
                        <span className="block text-xs font-medium text-muted">
                            {t('adminInfra.storage.pool.redirectUriLabel')}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                            <code className="min-w-0 flex-1 truncate rounded-control border border-slate-200 bg-card px-2.5 py-1.5 font-mono text-xs text-on-surface">
                                {redirectUri}
                            </code>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void copyRedirectUri()}
                                leftIcon={copiedRedirect ? <Check size={13} /> : <Copy size={13} />}
                            >
                                {copiedRedirect
                                    ? t('adminInfra.storage.pool.copied')
                                    : t('adminInfra.storage.pool.copy')}
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField id="gdrive-oauth-client-id" label="Google OAuth Client ID" required>
                            <Input
                                id="gdrive-oauth-client-id"
                                value={oauthClientId}
                                onChange={e => setOauthClientId(e.target.value)}
                                placeholder="123456-abc.apps.googleusercontent.com"
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                        <FormField
                            id="gdrive-oauth-client-secret"
                            label="Google OAuth Client Secret"
                            required={!overview.oauthConfigured}
                            optional={overview.oauthConfigured}
                        >
                            <PasswordInput
                                id="gdrive-oauth-client-secret"
                                value={oauthClientSecret}
                                onChange={e => setOauthClientSecret(e.target.value)}
                                placeholder="GOCSPX-..."
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleSaveOAuthCredentials()}
                            disabled={saveOAuthConfig.isPending}
                            leftIcon={<KeyRound size={14} />}
                        >
                            {t('adminInfra.storage.pool.saveOAuthApp')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
