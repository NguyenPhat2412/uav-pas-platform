'use client';

import {useId} from 'react';
import {CheckCircle2, Download, XCircle} from 'lucide-react';
import {Button, Card, Textarea} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import type {FlightPermitStatus, MissionMedia, MissionPermit} from '@/types/mission/mission.types';

export interface MissionPermitSummaryProps {
    permit: MissionPermit | null;
    status: FlightPermitStatus;
    hasPermitDetails: boolean;
    editing: boolean;
    attachedMedia?: MissionMedia;
    canDownload: boolean;
    downloadingMediaId: number | null;
    onDownloadMedia?: (mediaId: number) => void;
    canVerify: boolean;
    busy: boolean;
    verifyNote: string;
    verifying: 'approve' | 'reject' | null;
    onVerifyNoteChange: (value: string) => void;
    onVerify: (approved: boolean) => void;
}

export function MissionPermitSummary({
    permit,
    status,
    hasPermitDetails,
    editing,
    attachedMedia,
    canDownload,
    downloadingMediaId,
    onDownloadMedia,
    canVerify,
    busy,
    verifyNote,
    verifying,
    onVerifyNoteChange,
    onVerify,
}: MissionPermitSummaryProps) {
    const {t, formatDate, formatNumber} = useI18n();
    const verifyNoteId = useId();

    return (
        <>
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

            {canVerify && !editing && (
                <Card variant="surface" className="grid gap-3 border-sky-200 bg-sky-50/50 p-4">
                    <div className="text-xs font-bold text-slate-900">{t('permit.verify.title')}</div>
                    <Textarea
                        id={verifyNoteId}
                        rows={2}
                        optional
                        label={t('permit.verify.noteLabel')}
                        value={verifyNote}
                        disabled={busy}
                        placeholder={t('permit.verify.notePlaceholder')}
                        onChange={e => onVerifyNoteChange(e.target.value)}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            isLoading={verifying === 'reject'}
                            disabled={busy}
                            leftIcon={<XCircle size={14} />}
                            onClick={() => onVerify(false)}
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
                            onClick={() => onVerify(true)}
                        >
                            {t('permit.verify.approve')}
                        </Button>
                    </div>
                </Card>
            )}
        </>
    );
}
