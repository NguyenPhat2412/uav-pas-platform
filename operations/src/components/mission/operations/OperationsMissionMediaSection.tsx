'use client';

import {useState} from 'react';
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Select} from '@/components/ui';
import {displayLabel, terminalStatuses} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {MediaRole, Mission, MissionMedia} from '@/types/mission/mission.types';
import {MEDIA_ACCEPT, mediaUploadPolicy, mediaUploadRetention} from '@/utils/media/media-policy';

export interface OperationsMissionMediaSectionProps {
    mission: Mission;
    media: MissionMedia[];
    readMedia: boolean;
    canUpload: boolean;
    canViewMedia: boolean;
    disabled: boolean;
    uploading: boolean;
    downloading: number | null;
    onUploadMedia: (file: File, role: MediaRole) => void;
    onDownloadMedia: (mediaId: number) => void;
}

export function OperationsMissionMediaSection({
    mission,
    media,
    readMedia,
    canUpload,
    canViewMedia,
    disabled,
    uploading,
    downloading,
    onUploadMedia,
    onDownloadMedia,
}: OperationsMissionMediaSectionProps) {
    const {t} = useI18n();
    const [mediaRole, setMediaRole] = useState<MediaRole>('OUTPUT');

    return (
        <Card className="min-w-0" id="media">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-5 py-4 md:px-6 md:py-5">
                <CardTitle className="text-lg font-bold text-foreground">
                    {t('opsMissions.detail.media.title')}
                </CardTitle>
                <Badge variant="outline" className="bg-background px-2.5 py-1 text-xs normal-case text-muted">
                    {t('opsMissions.detail.media.count', {count: media.length})}
                </Badge>
            </CardHeader>

            <CardContent className="p-5 md:p-6">
                {canUpload && (
                    <>
                        <div className="mb-3">
                            <Select
                                id="mission-media-role"
                                optional={false}
                                label={t('opsMissions.detail.media.role')}
                                aria-label={t('opsMissions.detail.media.role')}
                                disabled={disabled}
                                value={mediaRole}
                                onChange={e => setMediaRole(e.target.value as MediaRole)}
                            >
                                <option value="OUTPUT">{t('opsMissions.detail.media.roleOutput')}</option>
                                <option value="DOCUMENT">{t('opsMissions.detail.media.roleDocument')}</option>
                                <option value="FLIGHT_DATA">{t('opsMissions.detail.media.roleFlightData')}</option>
                            </Select>
                        </div>

                        <label
                            className="mb-4 flex min-h-13 cursor-pointer items-center justify-center rounded-control border border-dashed border-border-input p-3 text-sm font-semibold text-primary focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-primary aria-disabled:cursor-wait aria-disabled:opacity-60"
                            aria-disabled={disabled}
                        >
                            <input
                                type="file"
                                accept={MEDIA_ACCEPT}
                                className="sr-only"
                                disabled={disabled}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) onUploadMedia(file, mediaRole);
                                    e.target.value = '';
                                }}
                            />
                            {uploading
                                ? t('opsMissions.detail.media.uploading')
                                : t('opsMissions.detail.media.upload')}
                        </label>

                        <p className="m-0 mb-4 text-sm leading-relaxed text-muted">
                            {mediaUploadPolicy(t)} {mediaUploadRetention(t)}{' '}
                            {t('opsMissions.detail.media.uploadHint')}
                        </p>
                    </>
                )}

                {!readMedia ? (
                    <p className="m-0 text-sm leading-relaxed text-muted">
                        {t('opsMissions.detail.media.noPermission')}
                    </p>
                ) : media.length ? (
                    <ul className="m-0 grid list-none gap-3 p-0">
                        {media.map(item => (
                            <li
                                className="mission-file flex items-center justify-between gap-3 rounded-panel border border-border p-3 md:gap-4 md:p-4"
                                key={item.id}
                            >
                                <div className="grid min-w-0 gap-1.5">
                                    <span className="break-words text-sm font-semibold text-foreground">
                                        {item.media.originalName}
                                    </span>
                                    <span className="text-xs text-muted">
                                        {displayLabel(item.mediaRole)} ·{' '}
                                        {Math.max(1, Math.ceil(item.media.size / 1000))} KB
                                    </span>
                                </div>
                                {canViewMedia && (
                                    <Button
                                        variant="outline"
                                        disabled={downloading !== null}
                                        onClick={() => onDownloadMedia(item.media.id)}
                                    >
                                        {downloading === item.media.id
                                            ? t('opsMissions.detail.media.downloading')
                                            : t('opsMissions.detail.media.download')}
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="m-0 px-2 py-6 text-center text-sm text-muted">
                        {t('opsMissions.detail.media.empty')}
                    </p>
                )}

                {terminalStatuses.includes(mission.status) && (
                    <p className="m-0 mt-4 text-sm leading-relaxed text-muted">
                        {t('opsMissions.detail.media.locked')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
