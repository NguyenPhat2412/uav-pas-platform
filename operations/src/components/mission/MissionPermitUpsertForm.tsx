'use client';

import {useId} from 'react';
import {FileUp} from 'lucide-react';
import {Button, Card, FormField, Input, Select, Textarea} from '@/components/ui';
import {
    canSubmitPermitDraft,
    type PermitDraft,
    type PermitFieldErrors,
} from '@/forms/mission/permit-form';
import {useI18n} from '@/providers/I18nContext';
import type {MissionMedia} from '@/types/mission/mission.types';
import {MEDIA_ACCEPT} from '@/utils/media/media-policy';

export interface MissionPermitUpsertFormProps {
    draft: PermitDraft;
    fieldErrors: PermitFieldErrors;
    sortedMediaOptions: readonly MissionMedia[];
    canUpload: boolean;
    busy: boolean;
    saving: boolean;
    uploading: boolean;
    onDraftChange: (updater: (prev: PermitDraft) => PermitDraft) => void;
    onUploadScan: (file: File) => void;
    onCancel: () => void;
    onSave: () => void;
}

export function MissionPermitUpsertForm({
    draft,
    fieldErrors,
    sortedMediaOptions,
    canUpload,
    busy,
    saving,
    uploading,
    onDraftChange,
    onUploadScan,
    onCancel,
    onSave,
}: MissionPermitUpsertFormProps) {
    const {t} = useI18n();
    const formId = useId();

    return (
        <Card variant="surface" className="border-border bg-slate-50/70 p-4">
            <form
                noValidate
                className="grid gap-4"
                onSubmit={event => {
                    event.preventDefault();
                    onSave();
                }}
            >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Input
                        id={`${formId}-permit-number`}
                        required
                        aria-required
                        label={t('permit.fields.permitNumber')}
                        value={draft.permitNumber}
                        error={fieldErrors.permitNumber}
                        placeholder={t('permit.placeholders.permitNumber')}
                        disabled={busy}
                        onChange={e => onDraftChange(prev => ({...prev, permitNumber: e.target.value}))}
                        className="h-10 text-sm"
                    />

                    <Input
                        id={`${formId}-permit-authority`}
                        required
                        aria-required
                        label={t('permit.fields.permitAuthority')}
                        value={draft.permitAuthority}
                        error={fieldErrors.permitAuthority}
                        placeholder={t('permit.placeholders.permitAuthority')}
                        disabled={busy}
                        onChange={e => onDraftChange(prev => ({...prev, permitAuthority: e.target.value}))}
                        className="h-10 text-sm"
                    />

                    <Input
                        id={`${formId}-valid-from`}
                        type="datetime-local"
                        required
                        aria-required
                        label={t('permit.fields.validFrom')}
                        value={draft.validFrom}
                        error={fieldErrors.validFrom}
                        disabled={busy}
                        onChange={e => onDraftChange(prev => ({...prev, validFrom: e.target.value}))}
                        className="h-10 text-sm"
                    />

                    <Input
                        id={`${formId}-valid-until`}
                        type="datetime-local"
                        required
                        aria-required
                        label={t('permit.fields.validUntil')}
                        value={draft.validUntil}
                        error={fieldErrors.validUntil}
                        disabled={busy}
                        onChange={e => onDraftChange(prev => ({...prev, validUntil: e.target.value}))}
                        className="h-10 text-sm"
                    />

                    <Input
                        id={`${formId}-max-altitude`}
                        type="number"
                        min={10}
                        max={5000}
                        step={1}
                        optional
                        label={t('permit.fields.maxAltitudeMeters')}
                        value={draft.maxAltitudeMeters}
                        error={fieldErrors.maxAltitudeMeters}
                        placeholder="120"
                        disabled={busy}
                        onChange={e => onDraftChange(prev => ({...prev, maxAltitudeMeters: e.target.value}))}
                        className="h-10 text-sm"
                    />

                    <FormField
                        id={`${formId}-attachment`}
                        label={t('permit.fields.attachment')}
                        optional
                        error={fieldErrors.permitMediaId}
                    >
                        <Select
                            id={`${formId}-attachment`}
                            value={draft.permitMediaId}
                            aria-invalid={Boolean(fieldErrors.permitMediaId)}
                            disabled={busy}
                            onChange={e => onDraftChange(prev => ({...prev, permitMediaId: e.target.value}))}
                            className="h-10 text-sm"
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
                        </Select>
                        {canUpload && (
                            <label
                                className="mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:underline aria-disabled:opacity-50"
                                aria-disabled={busy}
                            >
                                <FileUp size={14} aria-hidden="true" />
                                <input
                                    type="file"
                                    accept={MEDIA_ACCEPT}
                                    className="sr-only"
                                    disabled={busy}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) onUploadScan(file);
                                        e.target.value = '';
                                    }}
                                />
                                {uploading ? t('permit.actions.uploadingScan') : t('permit.actions.uploadScan')}
                            </label>
                        )}
                    </FormField>
                </div>

                <Textarea
                    id={`${formId}-note`}
                    rows={2}
                    optional
                    label={t('permit.fields.note')}
                    value={draft.note}
                    error={fieldErrors.note}
                    disabled={busy}
                    placeholder={t('permit.placeholders.note')}
                    onChange={e => onDraftChange(prev => ({...prev, note: e.target.value}))}
                />

                <div className="flex flex-wrap justify-end gap-2.5">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onCancel}>
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
        </Card>
    );
}
