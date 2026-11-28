'use client';

import {Alert, FormField, Input, PasswordInput} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {DriveConnectTab} from '@/forms/storage-pool-form';

interface GoogleDriveCredentialFieldsProps {
    tab: DriveConnectTab;
    oauthConfigured: boolean;
    manualClientId: string;
    onManualClientIdChange: (val: string) => void;
    manualClientSecret: string;
    onManualClientSecretChange: (val: string) => void;
    refreshToken: string;
    onRefreshTokenChange: (val: string) => void;
    serviceAccountJson: string;
    onServiceAccountJsonChange: (val: string) => void;
}

export function GoogleDriveCredentialFields({
    tab,
    oauthConfigured,
    manualClientId,
    onManualClientIdChange,
    manualClientSecret,
    onManualClientSecretChange,
    refreshToken,
    onRefreshTokenChange,
    serviceAccountJson,
    onServiceAccountJsonChange,
}: GoogleDriveCredentialFieldsProps) {
    const {t} = useI18n();

    if (tab === 'oauth_manual') {
        return (
            <div className="space-y-3 border-t border-slate-200 pt-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                        id="manual-client-id"
                        label={t('adminInfra.storage.pool.manualClientId')}
                        required={!oauthConfigured}
                        optional={oauthConfigured}
                    >
                        <Input
                            id="manual-client-id"
                            value={manualClientId}
                            onChange={e => onManualClientIdChange(e.target.value)}
                            placeholder={t('adminInfra.storage.pool.optionalIfSaved')}
                            className="h-9 text-[13px]"
                        />
                    </FormField>
                    <FormField
                        id="manual-client-secret"
                        label={t('adminInfra.storage.pool.manualClientSecret')}
                        required={!oauthConfigured}
                        optional={oauthConfigured}
                    >
                        <PasswordInput
                            id="manual-client-secret"
                            value={manualClientSecret}
                            onChange={e => onManualClientSecretChange(e.target.value)}
                            placeholder={t('adminInfra.storage.pool.optionalIfSaved')}
                            className="h-9 text-[13px]"
                        />
                    </FormField>
                </div>
                <FormField id="manual-refresh-token" label="Google OAuth Refresh Token" required>
                    <PasswordInput
                        id="manual-refresh-token"
                        value={refreshToken}
                        onChange={e => onRefreshTokenChange(e.target.value)}
                        placeholder="1//0g..."
                        className="h-9 text-[13px]"
                    />
                </FormField>
            </div>
        );
    }

    if (tab === 'service_account') {
        return (
            <div className="space-y-2 border-t border-slate-200 pt-3">
                <Alert variant="info" className="py-2 text-xs">
                    {t('adminInfra.storage.pool.saHint')}
                </Alert>
                <FormField id="sa-json" label="Service Account Key JSON" required>
                    <textarea
                        id="sa-json"
                        rows={5}
                        value={serviceAccountJson}
                        onChange={e => onServiceAccountJsonChange(e.target.value)}
                        placeholder='{"type":"service_account","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----..."}'
                        className="w-full rounded-control border border-border-input bg-card p-2.5 font-mono text-xs text-on-surface outline-none focus:outline-2 focus:outline-ring"
                    />
                </FormField>
            </div>
        );
    }

    return null;
}
