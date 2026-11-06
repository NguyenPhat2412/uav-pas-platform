'use client';

import {useId, useMemo, useState} from 'react';
import {CheckCircle2, Download, FileCheck2, FileUp, PencilLine, ShieldAlert, XCircle} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {Button} from '@/components/ui';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {MEDIA_ACCEPT} from '@/utils/media/media-policy';
import {cn} from '@/lib/utils';
import {
    canEditMissionPermit,
    canSubmitPermitDraft,
    canVerifyMissionPermit,
    effectivePermitStatus,
    permitDraftFromMission,
    permitFieldErrors,
    toPermitUpsertPayload,
    toPermitVerifyPayload,
    type PermitDraft,
    type PermitFieldErrors,
} from '@/forms/mission/permit-form';
import type {
    FlightPermitStatus,
    Mission,
    MissionMedia,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
} from '@/types/mission/mission.types';

export const PERMIT_STATUS_TONE: Record<FlightPermitStatus, string> = {
    NOT_REQUIRED: 'bg-slate-100 text-slate-600 border-slate-200',
    PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
    SUBMITTED: 'bg-sky-50 text-uav-blue border-sky-200',
    VERIFIED: 'bg-blue-50 text-blue-800 border-blue-200',
    REJECTED: 'bg-red-50 text-danger border-red-200',
};

export interface MissionPermitCardProps {
    mission: Mission;
    mediaItems?: readonly MissionMedia[];
    disabled?: boolean;
    downloadingMediaId?: number | null;
    onUpsertPermit: (payload: MissionPermitUpsertInput) => Promise<unknown>;
    onVerifyPermit?: (payload: MissionPermitVerifyInput) => Promise<unknown>;
    onUploadScan?: (file: File) => Promise<MissionMedia | undefined>;
    onDownloadMedia?: (mediaId: number) => void;
    id?: string;
    className?: string;
}

export function PermitStatusBadge({status, className}: { status: FlightPermitStatus; className?: string }) {
    const {t} = useI18n();
    return (
        <span
            className={cn(
                'inline-flex items-center whitespace-nowrap rounded-badge border px-2.5 py-0.5 text-xs font-bold',
                PERMIT_STATUS_TONE[status],
                className,
            )}
        >
            {t(`permit.status.${status}`)}
        </span>
    );
}

export function MissionPermitCard({
    mission,
    mediaItems = [],
    disabled = false,
    downloadingMediaId = null,
    onUpsertPermit,
    onVerifyPermit,
    onUploadScan,
    onDownloadMedia,
    id,
    className,
}: MissionPermitCardProps) {
    const {user, can} = useAuth();
    const {t, formatDate, formatNumber} = useI18n();
    const titleId = useId();

    const permit = mission.permit ?? null;
    const status = effectivePermitStatus(permit);
    const hasPermitDetails = Boolean(
        permit?.permitNumber ||
            permit?.permitAuthority ||
            permit?.validFrom ||
            permit?.validUntil ||
            permit?.maxAltitudeMeters != null ||
            permit?.permitMediaId != null ||
            permit?.note,
    );

    const canEdit =
        can('MISSION_VIEW') &&
        canEditMissionPermit(mission, user?.id, can('MISSION_CONFIRM'), can('USER_MANAGE'));
    const canVerify = Boolean(onVerifyPermit) && canVerifyMissionPermit(mission, can('MISSION_CONFIRM'));
    const canUpload = Boolean(onUploadScan) && can('MISSION_MEDIA_UPLOAD');
    const canDownload = Boolean(onDownloadMedia) && (can('MEDIA_VIEW') || mission.customerId === user?.id);

    const defaults = useMemo(
        () => ({
            startTime: mission.startTime,
            expectedEndTime: mission.expectedEndTime,
            altitudeAglMeters: mission.flightPlan?.altitudeAglMeters ?? null,
        }),
        [mission.startTime, mission.expectedEndTime, mission.flightPlan?.altitudeAglMeters],
    );

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<PermitDraft>(() => permitDraftFromMission(permit, defaults));
    const [fieldErrors, setFieldErrors] = useState<PermitFieldErrors>({});
    const [errorMessage, setErrorMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [verifyNote, setVerifyNote] = useState('');
    const [verifying, setVerifying] = useState<'approve' | 'reject' | null>(null);

    const sortedMediaOptions = useMemo(() => {
        return [...mediaItems].sort((a, b) => {
            const aDoc = a.mediaRole === 'DOCUMENT' || a.media.type === 'DOCUMENT' ? 0 : 1;
            const bDoc = b.mediaRole === 'DOCUMENT' || b.media.type === 'DOCUMENT' ? 0 : 1;
            return aDoc - bDoc;
        });
    }, [mediaItems]);

    const permitMediaId = permit?.permitMediaId ?? null;
    const attachedMedia = useMemo(
        () => (permitMediaId != null ? mediaItems.find(item => item.media.id === permitMediaId) : undefined),
        [mediaItems, permitMediaId],
    );

    const busy = disabled || saving || uploading || verifying !== null;

    const openEditor = () => {
        setDraft(permitDraftFromMission(permit, defaults));
        setFieldErrors({});
        setErrorMessage('');
        setEditing(true);
    };

    const handleSave = async () => {
        if (!canSubmitPermitDraft(draft) || busy) return;
        setSaving(true);
        setFieldErrors({});
        setErrorMessage('');
        try {
            await onUpsertPermit(toPermitUpsertPayload(draft));
            setEditing(false);
        } catch (err) {
            const fields = permitFieldErrors(err);
            if (fields) {
                setFieldErrors(fields);
            } else {
                const msg = err instanceof Error && err.message ? err.message : t('permit.errors.saveFailed');
                setErrorMessage(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleUploadScan = async (file: File) => {
        if (!onUploadScan || busy) return;
        setUploading(true);
        setErrorMessage('');
        try {
            const uploaded = await onUploadScan(file);
            if (uploaded?.media?.id) {
                setDraft(prev => ({...prev, permitMediaId: String(uploaded.media.id)}));
            }
        } catch (err) {
            const msg = err instanceof Error && err.message ? err.message : t('permit.errors.uploadFailed');
            setErrorMessage(msg);
        } finally {
            setUploading(false);
        }
    };

    const handleVerify = async (approved: boolean) => {
        if (!onVerifyPermit || busy) return;
        setVerifying(approved ? 'approve' : 'reject');
        setErrorMessage('');
        try {
            await onVerifyPermit(toPermitVerifyPayload(approved, verifyNote));
            setVerifyNote('');
        } catch (err) {
            const msg = err instanceof Error && err.message ? err.message : t('permit.errors.verifyFailed');
            setErrorMessage(msg);
        } finally {
            setVerifying(null);
        }
    };

    const inputClass =
        'min-h-10 w-full rounded-control border border-border-input bg-card px-3 py-2 text-sm font-normal text-foreground focus:border-primary focus:outline-none aria-[invalid=true]:border-danger';

    return (
        <section
            id={id}
            className={cn('min-w-0 overflow-hidden rounded-panel border border-border bg-card', className)}
            aria-labelledby={titleId}
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/70 px-4 py-3.5 md:px-5">
                <div className="flex flex-wrap items-center gap-2.5">
                    <h2 id={titleId} className="m-0 inline-flex items-center gap-2 text-sm font-bold text-slate-900 md:text-base">
                        <FileCheck2 size={18} aria-hidden="true" className="text-slate-600" />
                        {t('permit.title')}
                    </h2>
                    <PermitStatusBadge status={status} />
                </div>
                {canEdit && !editing && (
                    <Button
                        type="button"
                        size="sm"
                        variant={status === 'PENDING' || status === 'REJECTED' ? 'primary' : 'outline'}
                        disabled={busy}
                        leftIcon={<PencilLine size={14} />}
                        onClick={openEditor}
                    >
                        {hasPermitDetails ? t('permit.actions.edit') : t('permit.actions.submitNew')}
                    </Button>
                )}
            </header>

            <div className="grid gap-4 p-4 md:p-5">
                {(status === 'PENDING' || status === 'REJECTED') && (
                    <div
                        className={cn(
                            'flex items-start gap-2.5 rounded-panel border px-3.5 py-2.5 text-xs',
                            status === 'REJECTED'
                                ? 'border-red-200 bg-red-50 text-danger'
                                : 'border-amber-200 bg-amber-50 text-amber-900',
                        )}
                        role="status"
                    >
                        <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{t(`permit.guidance.${status}`)}</span>
                    </div>
                )}

                {errorMessage && (
                    <div className="rounded-panel border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-danger" role="alert">
                        {errorMessage}
                    </div>
                )}

                {hasPermitDetails ? (
                    <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 [&_dt]:text-xs [&_dt]:text-muted [&_dd]:m-0 [&_dd]:mt-0.5 [&_dd]:break-words [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foreground">
                        <div>
                            <dt>{t('permit.fields.permitNumber')}</dt>
                            <dd className="font-mono">{permit?.permitNumber || '—'}</dd>
                        </div>
                        <div>
                            <dt>{t('permit.fields.permitAuthority')}</dt>
                            <dd>{permit?.permitAuthority || '—'}</dd>
                        </div>
                        <div>
                            <dt>{t('permit.fields.maxAltitudeMeters')}</dt>
                            <dd>
                                {permit?.maxAltitudeMeters != null
                                    ? `${formatNumber(permit.maxAltitudeMeters)} m AGL`
                                    : t('permit.values.planDefault')}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt>{t('permit.fields.validityWindow')}</dt>
                            <dd>
                                {permit?.validFrom && permit?.validUntil
                                    ? `${formatDate(permit.validFrom, {dateStyle: 'medium', timeStyle: 'short'})} → ${formatDate(permit.validUntil, {dateStyle: 'medium', timeStyle: 'short'})}`
                                    : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt>{t('permit.fields.verifiedBy')}</dt>
                            <dd>
                                {permit?.verifiedBy
                                    ? `${permit.verifiedBy}${permit.verifiedAt ? ` · ${formatDate(permit.verifiedAt, {dateStyle: 'short', timeStyle: 'short'})}` : ''}`
                                    : t('permit.values.awaitingVerification')}
                            </dd>
                        </div>
                        {permit?.permitMediaId != null && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <dt>{t('permit.fields.attachment')}</dt>
                                <dd className="mt-1 flex flex-wrap items-center gap-2.5">
                                    <span className="text-sm font-medium text-foreground">
                                        {attachedMedia?.media.originalName ??
                                            t('permit.values.documentId', {id: permit.permitMediaId})}
                                    </span>
                                    {canDownload && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={downloadingMediaId !== null}
                                            leftIcon={<Download size={14} />}
                                            onClick={() => onDownloadMedia?.(permit.permitMediaId!)}
                                        >
                                            {downloadingMediaId === permit.permitMediaId
                                                ? t('common.loading')
                                                : t('permit.actions.downloadScan')}
                                        </Button>
                                    )}
                                </dd>
                            </div>
                        )}
                        {permit?.note && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <dt>{t('permit.fields.note')}</dt>
                                <dd className="whitespace-pre-wrap font-normal text-slate-700">{permit.note}</dd>
                            </div>
                        )}
                    </dl>
                ) : (
                    !editing && (
                        <p className="m-0 text-sm text-muted">
                            {status === 'NOT_REQUIRED' ? t('permit.empty.notRequired') : t('permit.empty.pending')}
                        </p>
                    )
                )}

                {editing && canEdit && (
                    <form
                        noValidate
                        className="grid gap-4 rounded-panel border border-border bg-slate-50/70 p-4"
                        onSubmit={event => {
                            event.preventDefault();
                            void handleSave();
                        }}
                    >
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <label className="grid gap-1 text-xs font-bold text-foreground">
                                <span>
                                    {t('permit.fields.permitNumber')}
                                    <RequiredMark />
                                </span>
                                <input
                                    className={inputClass}
                                    value={draft.permitNumber}
                                    aria-required
                                    aria-invalid={Boolean(fieldErrors.permitNumber)}
                                    placeholder={t('permit.placeholders.permitNumber')}
                                    disabled={busy}
                                    onChange={e => setDraft(prev => ({...prev, permitNumber: e.target.value}))}
                                />
                                {fieldErrors.permitNumber && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.permitNumber}</span>
                                )}
                            </label>

                            <label className="grid gap-1 text-xs font-bold text-foreground">
                                <span>
                                    {t('permit.fields.permitAuthority')}
                                    <RequiredMark />
                                </span>
                                <input
                                    className={inputClass}
                                    value={draft.permitAuthority}
                                    aria-required
                                    aria-invalid={Boolean(fieldErrors.permitAuthority)}
                                    placeholder={t('permit.placeholders.permitAuthority')}
                                    disabled={busy}
                                    onChange={e => setDraft(prev => ({...prev, permitAuthority: e.target.value}))}
                                />
                                {fieldErrors.permitAuthority && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.permitAuthority}</span>
                                )}
                            </label>

                            <label className="grid gap-1 text-xs font-bold text-foreground">
                                <span>
                                    {t('permit.fields.validFrom')}
                                    <RequiredMark />
                                </span>
                                <input
                                    type="datetime-local"
                                    className={inputClass}
                                    value={draft.validFrom}
                                    aria-required
                                    aria-invalid={Boolean(fieldErrors.validFrom)}
                                    disabled={busy}
                                    onChange={e => setDraft(prev => ({...prev, validFrom: e.target.value}))}
                                />
                                {fieldErrors.validFrom && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.validFrom}</span>
                                )}
                            </label>

                            <label className="grid gap-1 text-xs font-bold text-foreground">
                                <span>
                                    {t('permit.fields.validUntil')}
                                    <RequiredMark />
                                </span>
                                <input
                                    type="datetime-local"
                                    className={inputClass}
                                    value={draft.validUntil}
                                    aria-required
                                    aria-invalid={Boolean(fieldErrors.validUntil)}
                                    disabled={busy}
                                    onChange={e => setDraft(prev => ({...prev, validUntil: e.target.value}))}
                                />
                                {fieldErrors.validUntil && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.validUntil}</span>
                                )}
                            </label>

                            <label className="grid gap-1 text-xs font-bold text-foreground">
                                <span>
                                    {t('permit.fields.maxAltitudeMeters')}
                                    <OptionalMark />
                                </span>
                                <input
                                    type="number"
                                    min={10}
                                    max={5000}
                                    step={1}
                                    className={inputClass}
                                    value={draft.maxAltitudeMeters}
                                    aria-invalid={Boolean(fieldErrors.maxAltitudeMeters)}
                                    placeholder="120"
                                    disabled={busy}
                                    onChange={e => setDraft(prev => ({...prev, maxAltitudeMeters: e.target.value}))}
                                />
                                {fieldErrors.maxAltitudeMeters && (
                                    <span className="text-xs font-normal text-danger">
                                        {fieldErrors.maxAltitudeMeters}
                                    </span>
                                )}
                            </label>

                            <div className="grid gap-1 text-xs font-bold text-foreground">
                                <label className="grid gap-1">
                                    <span>
                                        {t('permit.fields.attachment')}
                                        <OptionalMark />
                                    </span>
                                    <select
                                        className={inputClass}
                                        value={draft.permitMediaId}
                                        aria-invalid={Boolean(fieldErrors.permitMediaId)}
                                        disabled={busy}
                                        onChange={e => setDraft(prev => ({...prev, permitMediaId: e.target.value}))}
                                    >
                                        <option value="">{t('permit.placeholders.noAttachment')}</option>
                                        {sortedMediaOptions.map(item => (
                                            <option key={item.media.id} value={item.media.id}>
                                                {item.media.originalName} ({item.mediaRole})
                                            </option>
                                        ))}
                                        {draft.permitMediaId &&
                                            !sortedMediaOptions.some(
                                                item => String(item.media.id) === draft.permitMediaId,
                                            ) && (
                                                <option value={draft.permitMediaId}>
                                                    {t('permit.values.documentId', {id: draft.permitMediaId})}
                                                </option>
                                            )}
                                    </select>
                                </label>
                                {canUpload && (
                                    <label className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:underline aria-disabled:opacity-50" aria-disabled={busy}>
                                        <FileUp size={14} aria-hidden="true" />
                                        <input
                                            type="file"
                                            accept={MEDIA_ACCEPT}
                                            className="sr-only"
                                            disabled={busy}
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) void handleUploadScan(file);
                                                e.target.value = '';
                                            }}
                                        />
                                        {uploading ? t('permit.actions.uploadingScan') : t('permit.actions.uploadScan')}
                                    </label>
                                )}
                                {fieldErrors.permitMediaId && (
                                    <span className="text-xs font-normal text-danger">{fieldErrors.permitMediaId}</span>
                                )}
                            </div>
                        </div>

                        <label className="grid gap-1 text-xs font-bold text-foreground">
                            <span>
                                {t('permit.fields.note')}
                                <OptionalMark />
                            </span>
                            <textarea
                                rows={2}
                                className="w-full rounded-control border border-border-input bg-card p-2.5 text-sm font-normal text-foreground focus:border-primary focus:outline-none"
                                value={draft.note}
                                disabled={busy}
                                placeholder={t('permit.placeholders.note')}
                                onChange={e => setDraft(prev => ({...prev, note: e.target.value}))}
                            />
                            {fieldErrors.note && (
                                <span className="text-xs font-normal text-danger">{fieldErrors.note}</span>
                            )}
                        </label>

                        <div className="flex flex-wrap justify-end gap-2.5">
                            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                isLoading={saving}
                                disabled={busy || !canSubmitPermitDraft(draft)}
                            >
                                {t('permit.actions.saveSubmit')}
                            </Button>
                        </div>
                    </form>
                )}

                {canVerify && !editing && (
                    <div className="grid gap-3 rounded-panel border border-sky-200 bg-sky-50/50 p-4">
                        <div className="text-xs font-bold text-slate-900">{t('permit.verify.title')}</div>
                        <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            <span>
                                {t('permit.verify.noteLabel')}
                                <OptionalMark />
                            </span>
                            <textarea
                                rows={2}
                                className="w-full rounded-control border border-border-input bg-card p-2.5 text-sm font-normal text-foreground focus:border-primary focus:outline-none"
                                value={verifyNote}
                                disabled={busy}
                                placeholder={t('permit.verify.notePlaceholder')}
                                onChange={e => setVerifyNote(e.target.value)}
                            />
                        </label>
                        <div className="flex flex-wrap items-center justify-end gap-2.5">
                            <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                isLoading={verifying === 'reject'}
                                disabled={busy}
                                leftIcon={<XCircle size={14} />}
                                onClick={() => void handleVerify(false)}
                            >
                                {t('permit.verify.reject')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                isLoading={verifying === 'approve'}
                                disabled={busy}
                                leftIcon={<CheckCircle2 size={14} />}
                                onClick={() => void handleVerify(true)}
                            >
                                {t('permit.verify.approve')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
