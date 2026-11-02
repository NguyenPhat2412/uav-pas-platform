import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import {CheckCircle2, Copy} from 'lucide-react-native';
import {AppText, Button, Card, ErrorState, LoadingState, Screen, SectionTitle, TextField} from '@/components/ui';
import {useBankTransferInstructions, useBillingActions} from '@/hooks/billing/useCustomerBilling';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, radius, spacing} from '@/styles/tokens';

/** A transfer detail with a one-tap copy, for pasting into a banking app. */
function CopyLine({label, value, display}: { label: string; value: string; display?: string }) {
    const {t} = useI18n();
    const toast = useToast();
    const copy = async () => {
        await Clipboard.setStringAsync(value);
        toast.show(t('mobile.billing.copied', {label}), 'success');
    };
    return (
        <Pressable onPress={() => void copy()} accessibilityRole="button" accessibilityLabel={`${label}: ${display ?? value}. ${t('mobile.billing.copy')}`}
                   style={({pressed}) => [styles.line, pressed && styles.pressed]}>
            <View style={styles.flex}>
                <AppText variant="caption">{label}</AppText>
                <AppText variant="title" selectable>{display ?? value}</AppText>
            </View>
            <Copy size={18} color={colors.primary}/>
        </Pressable>
    );
}

/** VietQR / NAPAS 247: scan or copy the details in a banking app, then report the bank reference for confirmation. */
export function InvoicePaymentScreen() {
    const {t, formatCurrency} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const {id} = useLocalSearchParams<{ id: string }>();
    const instructions = useBankTransferInstructions(Number(id));
    const {confirm} = useBillingActions();
    const [reference, setReference] = useState('');
    const data = instructions.data;

    if (instructions.isPending) return <Screen><LoadingState/></Screen>;
    if (!data) return <Screen><ErrorState message={t('billingPage.loadError')} retryLabel={t('common.retry')} onRetry={() => void instructions.refetch()}/></Screen>;

    const paid = data.status === 'PAID';
    const submit = () => confirm.mutate({invoiceId: data.invoiceId, reference}, {
        onSuccess: () => {
            toast.show(t('mobile.billing.confirmSent'), 'success');
            router.back();
        },
        onError: error => toast.show(signInErrorText(error, t), 'error'),
    });

    return (
        <Screen>
            <Card style={styles.center}>
                <AppText variant="caption">{t('billingPage.invoiceAmount', {code: data.invoiceCode, amount: ''})}</AppText>
                <AppText variant="display">{formatCurrency(data.total)}</AppText>
                {data.itemName ? <AppText variant="small">{data.itemName}</AppText> : null}
                {paid ? (
                    <View style={styles.paid}><CheckCircle2 size={20} color={colors.slateDark}/><AppText variant="title">{t('billingPage.status.PAID')}</AppText></View>
                ) : (
                    <View style={styles.qr} accessibilityLabel={t('mobile.billing.qrLabel')}>
                        <QRCode value={data.qrPayload} size={220} color={colors.text} backgroundColor={colors.white}/>
                    </View>
                )}
                {!paid && <AppText variant="caption" style={styles.centerText}>{t('mobile.billing.scanHint')}</AppText>}
            </Card>

            {!paid && (
                <>
                    <Card>
                        <SectionTitle title={t('billingPage.paymentInfo')}/>
                        <CopyLine label={t('mobile.billing.bank')} value={data.bankName}/>
                        <CopyLine label={t('mobile.billing.accountNumber')} value={data.accountNumber}/>
                        <CopyLine label={t('mobile.billing.accountName')} value={data.accountName}/>
                        <CopyLine label={t('billingPage.amount')} value={String(data.total)} display={formatCurrency(data.total)}/>
                        <CopyLine label={t('mobile.billing.content')} value={data.transferContent}/>
                    </Card>
                    <Card>
                        <SectionTitle title={t('mobile.billing.reportTitle')}/>
                        <AppText variant="small">{t('mobile.billing.reportHint')}</AppText>
                        <TextField label={t('mobile.billing.reference')} value={reference} onChangeText={setReference} autoCapitalize="characters" autoCorrect={false}/>
                        <Button label={t('mobile.billing.reportButton')} disabled={!reference.trim()} loading={confirm.isPending} onPress={submit}/>
                    </Card>
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    center: {alignItems: 'center'},
    centerText: {textAlign: 'center'},
    qr: {padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.card, marginVertical: spacing.sm},
    paid: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm},
    line: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
    pressed: {opacity: 0.7},
});
