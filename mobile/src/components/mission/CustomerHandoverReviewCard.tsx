import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {CheckCircle2, CheckSquare, Square, Star} from 'lucide-react-native';
import {AppText, Badge, Button, Card, SectionTitle, TextField} from '@/components/ui';
import {useMissionActions, useMissionReview} from '@/hooks/mission/useCustomerMissions';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {missionFormError} from '@/shared/forms/mission/mission-form';
import {colors, radius, spacing} from '@/styles/tokens';

function StarRow({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (next: number) => void;
}) {
    return (
        <View style={styles.starGroup}>
            <AppText variant="small" style={styles.stepDone}>{label}</AppText>
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(score => {
                    const active = score <= value;
                    return (
                        <Pressable
                            key={score}
                            disabled={disabled}
                            accessibilityRole="button"
                            accessibilityLabel={`${label} ${score}/5`}
                            onPress={() => onChange(score)}
                            style={({pressed}) => [styles.starBtn, pressed && styles.pressed]}>
                            <Star
                                size={18}
                                color={active ? colors.warning : colors.inputBorder}
                                fill={active ? colors.warning : 'transparent'}
                            />
                        </Pressable>
                    );
                })}
                <AppText variant="small" style={styles.stepDone}>{value}/5</AppText>
            </View>
        </View>
    );
}

export function CustomerHandoverReviewCard({missionId}: { missionId: number }) {
    const {t} = useI18n();
    const toast = useToast();
    const query = useMissionReview(missionId, true);
    const actions = useMissionActions();
    const review = query.data;

    const [overrides, setOverrides] = useState<{
        overall?: number;
        dataQuality?: number;
        timeliness?: number;
        accepted?: boolean;
        comment?: string;
    }>({});

    const overall = overrides.overall ?? (review?.reviewed ? (review.overallRating ?? 5) : 5);
    const dataQuality =
        overrides.dataQuality ?? (review?.reviewed ? (review.dataQualityRating ?? review.overallRating ?? 5) : 5);
    const timeliness =
        overrides.timeliness ?? (review?.reviewed ? (review.timelinessRating ?? review.overallRating ?? 5) : 5);
    const accepted = overrides.accepted ?? (review?.reviewed ? review.deliverablesAccepted : true);
    const comment = overrides.comment ?? (review?.reviewed ? (review.comment ?? '') : '');
    const AcceptIcon = accepted ? CheckSquare : Square;

    const saveReview = () => {
        actions.upsertReview.mutate(
            {
                id: missionId,
                data: {
                    overallRating: overall,
                    dataQualityRating: dataQuality,
                    timelinessRating: timeliness,
                    deliverablesAccepted: accepted,
                    comment: comment.trim() || undefined,
                },
            },
            {
                onSuccess: () => toast.show(t('capabilities.review.savedToast'), 'success'),
                onError: error => toast.show(missionFormError(error, t), 'error'),
            },
        );
    };

    return (
        <Card>
            <SectionTitle
                title={t('capabilities.review.title')}
                action={
                    <Badge
                        icon={review?.reviewed && review.deliverablesAccepted ? CheckCircle2 : undefined}
                        label={
                            review?.reviewed && review.deliverablesAccepted
                                ? t('capabilities.review.acceptedBadge')
                                : t('capabilities.review.pendingBadge')
                        }
                        background={
                            review?.reviewed && review.deliverablesAccepted ? colors.slateLight : colors.warningLight
                        }
                        color={review?.reviewed && review.deliverablesAccepted ? colors.slateDark : colors.warning}
                    />
                }
            />
            <AppText variant="caption">{t('capabilities.review.subtitle')}</AppText>

            <StarRow
                label={t('capabilities.review.overallRating')}
                value={overall}
                disabled={actions.upsertReview.isPending}
                onChange={val => setOverrides(prev => ({...prev, overall: val}))}
            />
            <StarRow
                label={t('capabilities.review.dataQuality')}
                value={dataQuality}
                disabled={actions.upsertReview.isPending}
                onChange={val => setOverrides(prev => ({...prev, dataQuality: val}))}
            />
            <StarRow
                label={t('capabilities.review.timeliness')}
                value={timeliness}
                disabled={actions.upsertReview.isPending}
                onChange={val => setOverrides(prev => ({...prev, timeliness: val}))}
            />

            <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{checked: accepted}}
                onPress={() => setOverrides(prev => ({...prev, accepted: !accepted}))}
                style={({pressed}) => [styles.acceptRow, pressed && styles.pressed]}>
                <AcceptIcon size={20} color={accepted ? colors.primary : colors.slate}/>
                <AppText variant="small" style={styles.flex}>{t('capabilities.review.acceptDeliverables')}</AppText>
            </Pressable>

            <TextField
                label={t('capabilities.review.commentLabel')}
                placeholder={t('capabilities.review.commentPlaceholder')}
                value={comment}
                onChangeText={val => setOverrides(prev => ({...prev, comment: val}))}
                multiline
                maxLength={1500}
            />

            <Button
                label={review?.reviewed ? t('capabilities.review.update') : t('capabilities.review.submit')}
                icon={CheckCircle2}
                loading={actions.upsertReview.isPending}
                onPress={saveReview}
            />
        </Card>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    stepDone: {color: colors.text, fontWeight: '600'},
    starGroup: {gap: spacing.xs},
    starRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    starBtn: {
        width: 34,
        height: 34,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
    pressed: {opacity: 0.75},
});
