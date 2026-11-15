'use client';

import {useState} from 'react';
import {Check, Copy, ExternalLink, KeyRound, ShieldCheck, X} from 'lucide-react';
import {Alert, Badge, Button, Card, FormField, Input, PasswordInput} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {cn} from '@/lib/utils';
import {
    useCreateDriveNode,
    useCreateGoogleAuthorizeUrl,
    useSaveGoogleOAuthConfig,
    useUpdateDriveNode,
} from '@/hooks/storage/useStoragePool';
import type {StorageDriveNode, StoragePoolOverview} from '@/types/storage/storage-pool.types';

type ConnectTab = 'oauth_redirect' | 'oauth_manual' | 'service_account';

const ROUTE_TAGS = ['ALL', 'MISSION_MEDIA', 'TRAINING', 'VIDEO', 'IMAGE', 'DOCUMENT'] as const;

export function GoogleDriveNodeModal({
    overview,
    editing,
    onClose,
}: {
    overview: StoragePoolOverview;
    editing: StorageDriveNode | null;
    onClose: () => void;
}) {
    const {t} = useI18n();
    const saveOAuthConfig = useSaveGoogleOAuthConfig();
    const createAuthUrl = useCreateGoogleAuthorizeUrl();
    const createNode = useCreateDriveNode();
    const updateNode = useUpdateDriveNode();

    const [tab, setTab] = useState<ConnectTab>('oauth_redirect');
    const [showOAuthSetup, setShowOAuthSetup] = useState(!overview.oauthConfigured);
    const [oauthClientId, setOauthClientId] = useState('');
    const [oauthClientSecret, setOauthClientSecret] = useState('');
    const [copiedRedirect, setCopiedRedirect] = useState(false);

    const [displayName, setDisplayName] = useState(editing?.displayName ?? '');
    const [rootFolderId, setRootFolderId] = useState(editing?.rootFolderId ?? '');
    const [priorityWeight, setPriorityWeight] = useState(String(editing?.priorityWeight ?? 100));
    const [maxUsagePercent, setMaxUsagePercent] = useState(String(editing?.maxUsagePercent ?? 92));
    const [selectedModules, setSelectedModules] = useState<string[]>(() =>
        (editing?.routedModules ?? 'ALL')
            .split(',')
            .map(v => v.trim().toUpperCase())
            .filter(Boolean),
    );

    const [manualClientId, setManualClientId] = useState('');
    const [manualClientSecret, setManualClientSecret] = useState('');
    const [refreshToken, setRefreshToken] = useState('');
    const [serviceAccountJson, setServiceAccountJson] = useState('');

    const apiOrigin =
        typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || window.location.origin)
            : '';
    const redirectUri = `${apiOrigin}${overview.callbackPath}`;
    const routedModulesCsv = selectedModules.length ? selectedModules.join(',') : 'ALL';

    const toggleModule = (tag: string) => {
        if (tag === 'ALL') {
            setSelectedModules(['ALL']);
            return;
        }
        setSelectedModules(prev => {
            const withoutAll = prev.filter(item => item !== 'ALL');
            if (withoutAll.includes(tag)) {
                const next = withoutAll.filter(item => item !== tag);
                return next.length ? next : ['ALL'];
            }
            return [...withoutAll, tag];
        });
    };

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
        if (!oauthClientId.trim()) {
            toast.error(t('adminInfra.storage.pool.oauthClientRequired'));
            return;
        }
        try {
            await saveOAuthConfig.mutateAsync({
                clientId: oauthClientId.trim(),
                clientSecret: oauthClientSecret.trim() || undefined,
            });
            setOauthClientSecret('');
            setShowOAuthSetup(false);
            toast.success(t('adminInfra.storage.pool.oauthSaved'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const handleStartOAuthRedirect = async () => {
        try {
            const res = await createAuthUrl.mutateAsync({
                displayName: displayName.trim() || undefined,
                rootFolderId: rootFolderId.trim() || undefined,
                priorityWeight: Number(priorityWeight) || 100,
                maxUsagePercent: Number(maxUsagePercent) || 92,
                routedModules: routedModulesCsv,
                returnOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
            });
            window.location.assign(res.authorizeUrl);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const handleSubmitManualOrEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) {
            toast.error(t('adminInfra.storage.pool.nameRequired'));
            return;
        }
        const weight = Math.min(1000, Math.max(1, Number(priorityWeight) || 100));
        const capPct = Math.min(99, Math.max(50, Number(maxUsagePercent) || 92));

        try {
            if (editing) {
                await updateNode.mutateAsync({
                    id: editing.id,
                    body: {
                        displayName: displayName.trim(),
                        enabled: editing.enabled,
                        priorityWeight: weight,
                        maxUsagePercent: capPct,
                        routedModules: routedModulesCsv,
                        rootFolderId: rootFolderId.trim() || undefined,
                    },
                });
                toast.success(t('adminInfra.storage.pool.nodeUpdated'));
                onClose();
                return;
            }

            if (tab === 'oauth_manual') {
                if (!refreshToken.trim()) {
                    toast.error(t('adminInfra.storage.pool.refreshTokenRequired'));
                    return;
                }
                await createNode.mutateAsync({
                    displayName: displayName.trim(),
                    authType: 'OAUTH2',
                    clientId: manualClientId.trim() || undefined,
                    clientSecret: manualClientSecret.trim() || undefined,
                    refreshToken: refreshToken.trim(),
                    rootFolderId: rootFolderId.trim() || undefined,
                    priorityWeight: weight,
                    maxUsagePercent: capPct,
                    routedModules: routedModulesCsv,
                });
            } else {
                if (!serviceAccountJson.trim()) {
                    toast.error(t('adminInfra.storage.pool.saJsonRequired'));
                    return;
                }
                await createNode.mutateAsync({
                    displayName: displayName.trim(),
                    authType: 'SERVICE_ACCOUNT',
                    serviceAccountJson: serviceAccountJson.trim(),
                    rootFolderId: rootFolderId.trim() || undefined,
                    priorityWeight: weight,
                    maxUsagePercent: capPct,
                    routedModules: routedModulesCsv,
                });
            }
            toast.success(t('adminInfra.storage.pool.nodeConnected'));
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('adminInfra.storage.pool.actionFailed'));
        }
    };

    const busy =
        saveOAuthConfig.isPending ||
        createAuthUrl.isPending ||
        createNode.isPending ||
        updateNode.isPending;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-node-modal-title"
        >
            <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-0 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <div>
                        <h3 id="drive-node-modal-title" className="m-0 text-base font-bold text-slate-900">
                            {editing
                                ? t('adminInfra.storage.pool.modalEditTitle')
                                : t('adminInfra.storage.pool.modalAddTitle')}
                        </h3>
                        <p className="m-0 mt-0.5 text-xs text-slate-500">
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
                        className="h-8 w-8 px-0"
                    >
                        <X size={16} />
                    </Button>
                </div>

                {!editing && (
                    <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
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
                                onClick={() => setTab(id)}
                                className={cn(
                                    'border-b-2 px-3 py-2.5 text-center transition-colors',
                                    tab === id
                                        ? 'border-uav-blue bg-white text-uav-blue'
                                        : 'border-transparent text-slate-600 hover:text-slate-900',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmitManualOrEdit} className="space-y-4 p-5">
                    {!editing && tab === 'oauth_redirect' && (
                        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-emerald-600" />
                                    <span className="text-[13px] font-semibold text-slate-800">
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
                                    className="text-xs font-medium text-uav-blue hover:underline"
                                >
                                    {showOAuthSetup
                                        ? t('adminInfra.storage.pool.hideOAuthSetup')
                                        : t('adminInfra.storage.pool.configureOAuthApp')}
                                </button>
                            </div>

                            {showOAuthSetup && (
                                <div className="space-y-3 border-t border-slate-200 pt-3">
                                    <div>
                                        <span className="block text-[11.5px] font-medium text-slate-600">
                                            {t('adminInfra.storage.pool.redirectUriLabel')}
                                        </span>
                                        <div className="mt-1 flex items-center gap-2">
                                            <code className="min-w-0 flex-1 truncate rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] text-slate-700">
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
                                        <FormField id="gdrive-oauth-client-id" label="Google OAuth Client ID" optional={false}>
                                            <Input
                                                id="gdrive-oauth-client-id"
                                                value={oauthClientId}
                                                onChange={e => setOauthClientId(e.target.value)}
                                                placeholder="123456-abc.apps.googleusercontent.com"
                                                className="h-9 text-[13px]"
                                            />
                                        </FormField>
                                        <FormField id="gdrive-oauth-client-secret" label="Google OAuth Client Secret">
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
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField
                            id="gdrive-display-name"
                            label={t('adminInfra.storage.pool.fieldDisplayName')}
                            optional={!editing && tab === 'oauth_redirect'}
                        >
                            <Input
                                id="gdrive-display-name"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder={t('adminInfra.storage.pool.fieldDisplayNamePlaceholder')}
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                        <FormField id="gdrive-root-folder" label={t('adminInfra.storage.pool.fieldRootFolder')}>
                            <Input
                                id="gdrive-root-folder"
                                value={rootFolderId}
                                onChange={e => setRootFolderId(e.target.value)}
                                placeholder={t('adminInfra.storage.pool.fieldRootFolderPlaceholder')}
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField id="gdrive-max-pct" label={t('adminInfra.storage.pool.fieldMaxUsagePct')} optional={false}>
                            <Input
                                id="gdrive-max-pct"
                                type="number"
                                min={50}
                                max={99}
                                value={maxUsagePercent}
                                onChange={e => setMaxUsagePercent(e.target.value)}
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                        <FormField id="gdrive-weight" label={t('adminInfra.storage.pool.fieldPriorityWeight')} optional={false}>
                            <Input
                                id="gdrive-weight"
                                type="number"
                                min={1}
                                max={1000}
                                value={priorityWeight}
                                onChange={e => setPriorityWeight(e.target.value)}
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                    </div>

                    <div>
                        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                            {t('adminInfra.storage.pool.fieldRoutedModules')}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {ROUTE_TAGS.map(tag => {
                                const active = selectedModules.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleModule(tag)}
                                        className={cn(
                                            'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                            active
                                                ? 'border-uav-blue bg-uav-blue/10 text-uav-blue'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                                        )}
                                    >
                                        {t(`adminInfra.storage.pool.routeTag.${tag}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {!editing && tab === 'oauth_manual' && (
                        <div className="space-y-3 border-t border-slate-200 pt-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <FormField id="manual-client-id" label={t('adminInfra.storage.pool.manualClientId')}>
                                    <Input
                                        id="manual-client-id"
                                        value={manualClientId}
                                        onChange={e => setManualClientId(e.target.value)}
                                        placeholder={t('adminInfra.storage.pool.optionalIfSaved')}
                                        className="h-9 text-[13px]"
                                    />
                                </FormField>
                                <FormField id="manual-client-secret" label={t('adminInfra.storage.pool.manualClientSecret')}>
                                    <PasswordInput
                                        id="manual-client-secret"
                                        value={manualClientSecret}
                                        onChange={e => setManualClientSecret(e.target.value)}
                                        placeholder={t('adminInfra.storage.pool.optionalIfSaved')}
                                        className="h-9 text-[13px]"
                                    />
                                </FormField>
                            </div>
                            <FormField id="manual-refresh-token" label="Google OAuth Refresh Token" optional={false}>
                                <PasswordInput
                                    id="manual-refresh-token"
                                    value={refreshToken}
                                    onChange={e => setRefreshToken(e.target.value)}
                                    placeholder="1//0g..."
                                    className="h-9 text-[13px]"
                                />
                            </FormField>
                        </div>
                    )}

                    {!editing && tab === 'service_account' && (
                        <div className="space-y-2 border-t border-slate-200 pt-3">
                            <Alert variant="info" className="py-2 text-xs">
                                {t('adminInfra.storage.pool.saHint')}
                            </Alert>
                            <FormField id="sa-json" label="Service Account Key JSON" optional={false}>
                                <textarea
                                    id="sa-json"
                                    rows={5}
                                    value={serviceAccountJson}
                                    onChange={e => setServiceAccountJson(e.target.value)}
                                    placeholder='{"type":"service_account","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----..."}'
                                    className="w-full rounded-md border border-slate-300 bg-white p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-uav-blue"
                                />
                            </FormField>
                        </div>
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
