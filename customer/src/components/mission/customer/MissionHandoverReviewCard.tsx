'use client';

import {useState} from 'react';
import {Star} from 'lucide-react';
import {
    Alert,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    FormField,
    StatusBadge,
    Switch,
    Textarea,
} from '@/components/ui';
import {useMissionActions, useMissionReview} from '@/hooks/mission/useCustomerMissions';
import {useI18n} from '@/providers/I18nContext';
import type {MissionReview} from '@/types/customer';

function StarSelector({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    disabled?: boolean;
    onChange?: (val: number) => void;
}) {
    return (
        <div className="grid gap-1.5">
            <span className="text-xs font-bold text-foreground">{label}</span>
            <div className="inline-flex items-center gap-1" role="radiogroup" aria-label={label}>
                {[1, 2, 3, 4, 5].map(score => {
                    const active = score <= value;
                    return (
                        <Button
                            key={score}
                            type="button"
                            variant="outline"
                            size="sm"
                            role="radio"
                            aria-checked={score === value}
                            aria-label={`${label}: ${score}/5`}
                            disabled={disabled}
                            onClick={() => onChange?.(score)}
                            className="h-8 w-8 bg-white p-0 hover:bg-amber-50 disabled:cursor-default disabled:opacity-100"
                        >
                            <Star
                                size={16}
                                className={active ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}
                                aria-hidden="true"
                            />
                        </Button>
                    );
                })}
                <span className="ml-2 text-xs font-bold tabular-nums text-slate-700">{value}/5</span>
            </div>
        </div>
    );
}

export function MissionHandoverReviewCard({
    missionId,
    readOnly = false,
    externalReview,
}: {
    missionId: number;
    readOnly?: boolean;
    externalReview?: MissionReview | null;
}) {
    const {t} = useI18n();
    const query = useMissionReview(missionId, externalReview === undefined);
    const actions = useMissionActions();
    const review = externalReview !== undefined ? externalReview : query.data;

    const [overrides, setOverrides] = useState<{
        missionId?: number;
        overall?: number;
        dataQuality?: number;
        timeliness?: number;
        accepted?: boolean;
        comment?: string;
    }>({});
    const [feedback, setFeedback] = useState<{missionId: number; tone: 'info' | 'error'; text: string} | null>(null);

    const activeOverrides = overrides.missionId === missionId ? overrides : {};
    const activeFeedback = feedback?.missionId === missionId ? feedback : null;
    const patchOverrides = (patch: Partial<typeof overrides>) =>
        setOverrides(prev => ({
            ...(prev.missionId === missionId ? prev : {missionId}),
            missionId,
            ...patch,
        }));

    const overall = activeOverrides.overall ?? (review?.reviewed ? (review.overallRating ?? 5) : 5);
    const dataQuality =
        activeOverrides.dataQuality ??
        (review?.reviewed ? (review.dataQualityRating ?? review.overallRating ?? 5) : 5);
    const timeliness =
        activeOverrides.timeliness ??
        (review?.reviewed ? (review.timelinessRating ?? review.overallRating ?? 5) : 5);
    const accepted = activeOverrides.accepted ?? (review?.reviewed ? review.deliverablesAccepted : true);
    const comment = activeOverrides.comment ?? (review?.reviewed ? (review.comment ?? '') : '');

    if (readOnly) {
        return (
            <Card className="min-w-0">
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 px-5 py-4">
                    <CardTitle className="m-0 text-base font-bold text-foreground">
                        {t('capabilities.review.opsTitle')}
                    </CardTitle>
                    {review?.reviewed && (
                        <StatusBadge
                            status={review.deliverablesAccepted ? 'APPROVED' : 'PENDING'}
                            label={
                                review.deliverablesAccepted
                                    ? t('capabilities.review.acceptedBadge')
                                    : t('capabilities.review.pendingBadge')
                            }
                        />
                    )}
                </CardHeader>
                <CardContent className="grid gap-3 p-5">
                    {!review?.reviewed ? (
                        <p className="m-0 text-sm text-muted">{t('capabilities.review.emptyOps')}</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <StarSelector
                                    label={t('capabilities.review.overallRating')}
                                    value={review.overallRating ?? 5}
                                    disabled
                                />
                                <StarSelector
                                    label={t('capabilities.review.dataQuality')}
                                    value={review.dataQualityRating ?? review.overallRating ?? 5}
                                    disabled
                                />
                                <StarSelector
                                    label={t('capabilities.review.timeliness')}
                                    value={review.timelinessRating ?? review.overallRating ?? 5}
                                    disabled
                                />
                            </div>
                            {review.comment && (
                                <Card variant="surface" className="bg-slate-50 px-3.5 py-2.5 text-sm text-foreground">
                                    “{review.comment}”
                                </Card>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        );
    }

    const handleSave = async () => {
        setFeedback(null);
        try {
            await actions.upsertReview.mutateAsync({
                id: missionId,
                payload: {
                    overallRating: overall,
                    dataQualityRating: dataQuality,
                    timelinessRating: timeliness,
                    deliverablesAccepted: accepted,
                    comment: comment.trim() || undefined,
                },
            });
            setFeedback({missionId, tone: 'info', text: t('capabilities.review.savedToast')});
        } catch (err) {
            setFeedback({
                missionId,
                tone: 'error',
                text: err instanceof Error && err.message ? err.message : t('missionDetail.actionFailed'),
            });
        }
    };

    const isReviewedAccepted = Boolean(review?.reviewed && review.deliverablesAccepted);

    return (
        <Card role="region" aria-labelledby="handover-review-title" className="min-w-0">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 bg-slate-50/70 px-4 py-3 md:px-5">
                <div>
                    <CardTitle id="handover-review-title" className="m-0 text-sm font-bold text-slate-800">
                        {t('capabilities.review.title')}
                    </CardTitle>
                    <CardDescription className="m-0 mt-0.5 text-xs text-muted">
                        {t('capabilities.review.subtitle')}
                    </CardDescription>
                </div>
                <StatusBadge
                    status={isReviewedAccepted ? 'APPROVED' : 'PENDING'}
                    label={
                        isReviewedAccepted
                            ? t('capabilities.review.acceptedBadge')
                            : t('capabilities.review.pendingBadge')
                    }
                />
            </CardHeader>

            <CardContent className="grid gap-4 p-4 md:p-5">
                {activeFeedback && (
                    <Alert
                        variant={activeFeedback.tone === 'error' ? 'error' : 'info'}
                        role={activeFeedback.tone === 'error' ? 'alert' : 'status'}
                        className="py-2.5 text-xs"
                    >
                        {activeFeedback.text}
                    </Alert>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StarSelector
                        label={t('capabilities.review.overallRating')}
                        value={overall}
                        disabled={actions.upsertReview.isPending}
                        onChange={val => patchOverrides({overall: val})}
                    />
                    <StarSelector
                        label={t('capabilities.review.dataQuality')}
                        value={dataQuality}
                        disabled={actions.upsertReview.isPending}
                        onChange={val => patchOverrides({dataQuality: val})}
                    />
                    <StarSelector
                        label={t('capabilities.review.timeliness')}
                        value={timeliness}
                        disabled={actions.upsertReview.isPending}
                        onChange={val => patchOverrides({timeliness: val})}
                    />
                </div>

                <Switch
                    checked={accepted}
                    disabled={actions.upsertReview.isPending}
                    onCheckedChange={val => patchOverrides({accepted: val})}
                    label={t('capabilities.review.acceptDeliverables')}
                />

                <FormField id="handover-review-comment" label={t('capabilities.review.commentLabel')} optional>
                    <Textarea
                        id="handover-review-comment"
                        rows={2}
                        maxLength={1500}
                        value={comment}
                        disabled={actions.upsertReview.isPending}
                        placeholder={t('capabilities.review.commentPlaceholder')}
                        onChange={e => patchOverrides({comment: e.target.value})}
                    />
                </FormField>

                <div className="flex justify-end">
                    <Button
                        type="button"
                        isLoading={actions.upsertReview.isPending}
                        loadingText={t('capabilities.review.saving')}
                        disabled={actions.upsertReview.isPending}
                        onClick={() => void handleSave()}
                    >
                        {review?.reviewed ? t('capabilities.review.update') : t('capabilities.review.submit')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
