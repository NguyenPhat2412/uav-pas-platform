import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Megaphone, Send} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, LoadingState, TextField} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {formatVndCompact, initialBidForm} from '@/shared/forms/marketplace/marketplace-forms';
import type {MissionBid, MissionBidCreateInput} from '@/shared/types/marketplace/marketplace.types';
import type {Mission} from '@/shared/types/mission/mission.types';
import {colors, spacing} from '@/styles/tokens';

export function ProviderRfqBiddingList({
    rfqs,
    myBids,
    isPending,
    submitting,
    onSubmitBid,
}: {
    rfqs: Mission[];
    myBids: MissionBid[];
    isPending: boolean;
    submitting: boolean;
    onSubmitBid: (missionId: number, payload: MissionBidCreateInput, onDone: () => void) => void;
}) {
    const {t} = useI18n();
    const [activeRfqId, setActiveRfqId] = useState<number | null>(null);
    const [bidForm, setBidForm] = useState<MissionBidCreateInput>(initialBidForm);

    if (isPending) return <LoadingState/>;
    if (rfqs.length === 0) {
        return <EmptyState icon={Megaphone} message={t('mobile.provider.noOpenRfqs')}/>;
    }

    return (
        <>
            {rfqs.map(rfq => {
                const existingBid = myBids.find(b => b.missionId === rfq.id);
                const bidding = activeRfqId === rfq.id;
                return (
                    <Card key={rfq.id}>
                        <AppText variant="caption" style={styles.bold}>
                            {rfq.code}
                        </AppText>
                        <AppText variant="title">{rfq.title}</AppText>
                        <AppText variant="caption">{rfq.locationName}</AppText>
                        {rfq.description ? <AppText variant="small">{rfq.description}</AppText> : null}
                        {existingBid ? (
                            <Badge
                                label={`${formatVndCompact(existingBid.proposedPriceVnd)} · ${existingBid.status}`}
                                background={colors.primaryLight}
                                color={colors.primary}
                            />
                        ) : bidding ? (
                            <View style={styles.stack}>
                                <TextField
                                    label={t('mobile.provider.bidPriceLabel')}
                                    keyboardType="number-pad"
                                    value={String(bidForm.proposedPriceVnd)}
                                    onChangeText={val =>
                                        setBidForm(prev => ({
                                            ...prev,
                                            proposedPriceVnd: Number(val) || 0,
                                        }))
                                    }
                                />
                                <TextField
                                    label={t('mobile.provider.bidUavModelLabel')}
                                    value={bidForm.proposedUavModel ?? ''}
                                    onChangeText={val =>
                                        setBidForm(prev => ({...prev, proposedUavModel: val}))
                                    }
                                />
                                <TextField
                                    label={t('mobile.provider.bidNoteLabel')}
                                    multiline
                                    value={bidForm.proposalNote}
                                    onChangeText={val =>
                                        setBidForm(prev => ({...prev, proposalNote: val}))
                                    }
                                />
                                <Button
                                    size="sm"
                                    icon={Send}
                                    loading={submitting}
                                    label={t('mobile.provider.sendBidBtn')}
                                    onPress={() =>
                                        onSubmitBid(rfq.id, bidForm, () => setActiveRfqId(null))
                                    }
                                />
                            </View>
                        ) : (
                            <Button
                                size="sm"
                                tone="secondary"
                                icon={Megaphone}
                                label={t('mobile.provider.openBidFormBtn')}
                                onPress={() => setActiveRfqId(rfq.id)}
                            />
                        )}
                    </Card>
                );
            })}
        </>
    );
}

const styles = StyleSheet.create({
    stack: {gap: spacing.xs, paddingTop: spacing.xs},
    bold: {fontWeight: '700', color: colors.text},
});
