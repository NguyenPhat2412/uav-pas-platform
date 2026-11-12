'use client';

import {useId, useMemo, useState} from 'react';
import {CheckCircle2, FileCheck2, PencilLine, ShieldAlert} from 'lucide-react';
import {Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {MissionPermitSummary} from '@/components/mission/MissionPermitSummary';
import {MissionPermitUpsertForm} from '@/components/mission/MissionPermitUpsertForm';
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
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {
    FlightPermitStatus,
    Mission,
    MissionMedia,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
} from '@/types/mission/mission.types';

export const PERMIT_STATUS_TONE: Record<FlightPermitStatus, string> = {
    NOT_REQUIRED: 'bg-slate-100 text-slate-600 border-slate-200',
    PENDING: 'bg-amber-50/70 text-amber-800 border-amber-200',
    SUBMITTED: 'bg-amber-50 text-amber-900 border-amber-300',
    VERIFIED: 'bg-slate-900 text-white border-slate-900',
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

export function PermitStatusBadge({status, className}: {status: FlightPermitStatus; className?: string}) {
    const {t} = useI18n();
    return (
        <Badge
            variant="outline"
            icon={status === 'VERIFIED' ? <CheckCircle2 size={12} className="shrink-0" aria-hidden="true" /> : undefined}
            className={cn(
                'whitespace-nowrap px-2.5 py-0.5 text-xs normal-case tracking-normal',
                PERMIT_STATUS_TONE[status],
                className,
            )}
        >
            {t(`permit.status.${status}`)}
        </Badge>
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
    const {t} = useI18n();
    const titleId = useId();

    const permit = mission.permit ?? null;
    const status = effectivePermitStatus(permit);
    const hasPermitDetails = Boolean(
        permit?.permitNumber || permit?.permitAuthority || permit?.validFrom || permit?.validUntil ||
            permit?.maxAltitudeMeters != null || permit?.permitMediaId != null || permit?.note,
    );

    const canEdit = can('MISSION_VIEW') && canEditMissionPermit(mission, user?.id, can('MISSION_CONFIRM'), can('USER_MANAGE'));
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

    const sortedMediaOptions = useMemo(
        () =>
            [...mediaItems].sort((a, b) => {
                const aDoc = a.mediaRole === 'DOCUMENT' || a.media.type === 'DOCUMENT' ? 0 : 1;
                const bDoc = b.mediaRole === 'DOCUMENT' || b.media.type === 'DOCUMENT' ? 0 : 1;
                return aDoc - bDoc;
            }),
        [mediaItems],
    );

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
            if (fields) setFieldErrors(fields);
            else setErrorMessage(err instanceof Error && err.message ? err.message : t('permit.errors.saveFailed'));
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
            if (uploaded?.media?.id) setDraft(prev => ({...prev, permitMediaId: String(uploaded.media.id)}));
        } catch (err) {
            setErrorMessage(err instanceof Error && err.message ? err.message : t('permit.errors.uploadFailed'));
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
            setErrorMessage(err instanceof Error && err.message ? err.message : t('permit.errors.verifyFailed'));
        } finally {
            setVerifying(null);
        }
    };

    return (
        <Card id={id} className={cn('min-w-0', className)} role="region" aria-labelledby={titleId}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 bg-slate-50/70 px-4 py-3.5 md:px-5">
                <div className="flex flex-wrap items-center gap-2.5">
                    <CardTitle
                        id={titleId}
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 md:text-base"
                    >
                        <FileCheck2 size={18} aria-hidden="true" className="text-slate-600" />
                        {t('permit.title')}
                    </CardTitle>
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
            </CardHeader>

            <CardContent className="grid gap-4 p-4 md:p-5">
                {(status === 'PENDING' || status === 'REJECTED') && (
                    <Alert
                        role="status"
                        variant={status === 'REJECTED' ? 'error' : 'warning'}
                        icon={<ShieldAlert size={16} className="shrink-0" aria-hidden="true" />}
                        className="py-2.5 text-xs"
                    >
                        {t(`permit.guidance.${status}`)}
                    </Alert>
                )}

                {errorMessage && (
                    <Alert variant="error" className="py-2.5 text-xs">
                        {errorMessage}
                    </Alert>
                )}

                <MissionPermitSummary
                    permit={permit}
                    status={status}
                    hasPermitDetails={hasPermitDetails}
                    editing={editing}
                    attachedMedia={attachedMedia}
                    canDownload={canDownload}
                    downloadingMediaId={downloadingMediaId}
                    onDownloadMedia={onDownloadMedia}
                    canVerify={canVerify}
                    busy={busy}
                    verifyNote={verifyNote}
                    verifying={verifying}
                    onVerifyNoteChange={setVerifyNote}
                    onVerify={approved => void handleVerify(approved)}
                />

                {editing && canEdit && (
                    <MissionPermitUpsertForm
                        draft={draft}
                        fieldErrors={fieldErrors}
                        sortedMediaOptions={sortedMediaOptions}
                        canUpload={canUpload}
                        busy={busy}
                        saving={saving}
                        uploading={uploading}
                        onDraftChange={setDraft}
                        onUploadScan={file => void handleUploadScan(file)}
                        onCancel={() => setEditing(false)}
                        onSave={() => void handleSave()}
                    />
                )}
            </CardContent>
        </Card>
    );
}
