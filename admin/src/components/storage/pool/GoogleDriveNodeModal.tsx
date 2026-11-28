'use client';

import {useRef, useState} from 'react';
import {ExternalLink, X} from 'lucide-react';
import {Button, Card, FormField, Input, RequiredMark} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {cn} from '@/lib/utils';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {useCreateDriveNode, useCreateGoogleAuthorizeUrl, useUpdateDriveNode} from '@/hooks/useStoragePool';
import {
    buildGoogleOAuthAuthorizeInput, type DriveConnectTab, parseStorageRoutedModules, STORAGE_ROUTE_TAGS,
    toggleStorageRouteTag, validateAndBuildDriveNodeCreateInput, validateAndBuildDriveNodeUpdateInput,
} from '@/forms/storage-pool-form';
import type {StorageDriveNode, StoragePoolOverview} from '@/types/storage-pool.types';
import {GoogleDriveCredentialFields} from './GoogleDriveCredentialFields';
import {GoogleDriveOAuthSetupBox} from './GoogleDriveOAuthSetupBox';

export function GoogleDriveNodeModal({
    overview, editing, onClose,
}: {
    overview: StoragePoolOverview; editing: StorageDriveNode | null; onClose: () => void;
}) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const createAuthUrl = useCreateGoogleAuthorizeUrl();
    const createNode = useCreateDriveNode();
    const updateNode = useUpdateDriveNode();

    const [tab, setTab] = useState<DriveConnectTab>('oauth_redirect');
    const [displayName, setDisplayName] = useState(editing?.displayName ?? '');
    const [rootFolderId, setRootFolderId] = useState(editing?.rootFolderId ?? '');
    const [priorityWeight, setPriorityWeight] = useState(String(editing?.priorityWeight ?? 100));
    const [maxUsagePercent, setMaxUsagePercent] = useState(String(editing?.maxUsagePercent ?? 92));
    const [selectedModules, setSelectedModules] = useState<string[]>(() =>
        parseStorageRoutedModules(editing?.routedModules),
    );
    const [manualClientId, setManualClientId] = useState('');
    const [manualClientSecret, setManualClientSecret] = useState('');
    const [refreshToken, setRefreshToken] = useState('');
    const [serviceAccountJson, setServiceAccountJson] = useState('');

    const busy = createAuthUrl.isPending || createNode.isPending || updateNode.isPending;
    useDialogFocusTrap(dialogRef, true, busy ? undefined : onClose);

    const apiOrigin =
        typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || window.location.origin)
            : '';
    const redirectUri = `${apiOrigin}${overview.callbackPath}`;

    const handleStartOAuthRedirect = async () => {
        try {
            const res = await createAuthUrl.mutateAsync(
                buildGoogleOAuthAuthorizeInput({
                    displayName,
                    rootFolderId,
                    priorityWeight,
                    maxUsagePercent,
                    selectedModules,
                    returnOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
                }),
            );
            window.location.assign(res.authorizeUrl);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const handleSubmitManualOrEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                const checked = validateAndBuildDriveNodeUpdateInput({
                    displayName,
                    enabled: editing.enabled,
                    priorityWeight,
                    maxUsagePercent,
                    selectedModules,
                    rootFolderId,
                });
                if (!checked.ok) {
                    toast.error(t(`adminInfra.storage.pool.${checked.errorKey}`));
                    return;
                }
                await updateNode.mutateAsync({id: editing.id, body: checked.data});
                toast.success(t('adminInfra.storage.pool.nodeUpdated'));
                onClose();
                return;
            }

            if (tab === 'oauth_redirect') return;
            const checked = validateAndBuildDriveNodeCreateInput({
                tab,
                displayName,
                rootFolderId,
                priorityWeight,
                maxUsagePercent,
                selectedModules,
                manualClientId,
                manualClientSecret,
                refreshToken,
                serviceAccountJson,
            });
            if (!checked.ok) {
                toast.error(t(`adminInfra.storage.pool.${checked.errorKey}`));
                return;
            }
            await createNode.mutateAsync(checked.data);
            toast.success(t('adminInfra.storage.pool.nodeConnected'));
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-node-modal-title"
            onClick={e => {
                if (e.target === e.currentTarget && !busy) onClose();
            }}
        >
            <Card
                ref={dialogRef}
                tabIndex={-1}
                className="max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-2xl overflow-y-auto rounded-overlay p-0 shadow-xl outline-none"
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <div>
                        <h3 id="drive-node-modal-title" className="m-0 text-base font-semibold text-on-surface">
                            {editing
                                ? t('adminInfra.storage.pool.modalEditTitle')
                                : t('adminInfra.storage.pool.modalAddTitle')}
                        </h3>
                        <p className="m-0 mt-0.5 text-xs text-muted">
                            {t('adminInfra.storage.pool.modalSubtitle')}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={busy}
                        aria-label={t('admin.files.cancel')}
                        className="min-h-8 min-w-8 px-0"
                    >
                        <X size={16} />
                    </Button>
                </div>

                {!editing && (
                    <div className="border-b border-slate-100 px-5 py-3">
                        <div role="tablist" aria-label={t('adminInfra.storage.pool.modalAddTitle')}>
                            {(
                                [
                                    ['oauth_redirect', t('adminInfra.storage.pool.tabOAuth1Click')],
                                    ['oauth_manual', t('adminInfra.storage.pool.tabRefreshToken')],
                                    ['service_account', t('adminInfra.storage.pool.tabServiceAccount')],
                                ] as const
                            ).map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === id}
                                    onClick={() => setTab(id)}
                                    className="text-xs whitespace-nowrap"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmitManualOrEdit} className="space-y-4 p-5">
                    {!editing && tab === 'oauth_redirect' && (
                        <GoogleDriveOAuthSetupBox overview={overview} redirectUri={redirectUri} />
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField id="gdrive-display-name" label={t('adminInfra.storage.pool.fieldDisplayName')}
                                   required={Boolean(editing || tab !== 'oauth_redirect')} optional={!editing && tab === 'oauth_redirect'}>
                            <Input id="gdrive-display-name" data-autofocus="true" value={displayName} onChange={e => setDisplayName(e.target.value)}
                                   placeholder={t('adminInfra.storage.pool.fieldDisplayNamePlaceholder')} className="h-9 text-[13px]" />
                        </FormField>
                        <FormField id="gdrive-root-folder" label={t('adminInfra.storage.pool.fieldRootFolder')} optional>
                            <Input id="gdrive-root-folder" value={rootFolderId} onChange={e => setRootFolderId(e.target.value)}
                                   placeholder={t('adminInfra.storage.pool.fieldRootFolderPlaceholder')} className="h-9 text-[13px]" />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField id="gdrive-max-pct" label={t('adminInfra.storage.pool.fieldMaxUsagePct')} required>
                            <Input id="gdrive-max-pct" type="number" min={50} max={99} value={maxUsagePercent}
                                   onChange={e => setMaxUsagePercent(e.target.value)} className="h-9 text-[13px] tabular-nums" />
                        </FormField>
                        <FormField id="gdrive-weight" label={t('adminInfra.storage.pool.fieldPriorityWeight')} required>
                            <Input id="gdrive-weight" type="number" min={1} max={1000} value={priorityWeight}
                                   onChange={e => setPriorityWeight(e.target.value)} className="h-9 text-[13px] tabular-nums" />
                        </FormField>
                    </div>

                    <div>
                        <span className="mb-1.5 block text-xs font-semibold text-on-surface">
                            {t('adminInfra.storage.pool.fieldRoutedModules')}
                            <RequiredMark />
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {STORAGE_ROUTE_TAGS.map(tag => {
                                const active = selectedModules.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setSelectedModules(prev => toggleStorageRouteTag(prev, tag))}
                                        className={cn(
                                            'min-h-8 rounded-badge border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                                            active
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-200 bg-card text-muted hover:border-slate-300 hover:text-on-surface',
                                        )}
                                    >
                                        {t(`adminInfra.storage.pool.routeTag.${tag}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {!editing && (
                        <GoogleDriveCredentialFields
                            tab={tab}
                            oauthConfigured={overview.oauthConfigured}
                            manualClientId={manualClientId}
                            onManualClientIdChange={setManualClientId}
                            manualClientSecret={manualClientSecret}
                            onManualClientSecretChange={setManualClientSecret}
                            refreshToken={refreshToken}
                            onRefreshTokenChange={setRefreshToken}
                            serviceAccountJson={serviceAccountJson}
                            onServiceAccountJsonChange={setServiceAccountJson}
                        />
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3.5">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
                            {t('admin.files.cancel')}
                        </Button>
                        {!editing && tab === 'oauth_redirect' ? (
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => void handleStartOAuthRedirect()}
                                disabled={busy || !overview.oauthConfigured}
                                leftIcon={<ExternalLink size={14} />}
                            >
                                {t('adminInfra.storage.pool.signInGoogleBtn')}
                            </Button>
                        ) : (
                            <Button type="submit" variant="primary" size="sm" disabled={busy}>
                                {editing
                                    ? t('adminInfra.storage.pool.saveChangesBtn')
                                    : t('adminInfra.storage.pool.connectDriveBtn')}
                            </Button>
                        )}
                    </div>
                </form>
            </Card>
        </div>
    );
}
