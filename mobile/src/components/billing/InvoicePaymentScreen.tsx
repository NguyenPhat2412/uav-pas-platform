import React, {useEffect, useRef, useState} from 'react';
import {Alert, Pressable, Share, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import {AlertTriangle, Ban, CalendarClock, CheckCircle2, Copy, Download, ImageDown, MessageCircle, Radio, Receipt, RefreshCw, XCircle} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ErrorState, LoadingState, Screen, SectionTitle} from '@/components/ui';
import {useBankTransferInstructions, useBillingActions, useBillingRealtime} from '@/hooks/billing/useCustomerBilling';
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

/** VietQR / NAPAS 247 payment with live webhook auto-reconciliation and native PDF invoice/receipt sharing. */
export function InvoicePaymentScreen() {
    const {t, formatCurrency, formatDate} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const qrRef = useRef<{ toDataURL: (callback: (base64: string) => void) => void } | null>(null);
    const {id} = useLocalSearchParams<{ id: string }>();
    const invoiceId = Number(id);
    const instructions = useBankTransferInstructions(invoiceId);
    const {wsConnected} = useBillingRealtime(invoiceId);
    const {refresh, downloadReceipt, cancel} = useBillingActions();
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    // Overdue is judged against when the screen opened; a refresh re-reads the invoice anyway.
    const [openedAt] = useState(() => Date.now());
    const data = instructions.data;
    const previousStatus = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (previousStatus.current === 'PENDING' && data?.status === 'PAID') {
            toast.show(t('mobile.billing.paidConfirmed', {code: data.invoiceCode}), 'success');
        }
        previousStatus.current = data?.status;
    }, [data?.invoiceCode, data?.status, t, toast]);

    const shareReceipt = async (targetInvoiceId: number, code: string) => {
        try {
            const dataUri = await downloadReceipt.mutateAsync(targetInvoiceId);
            const shareTitle = t('mobile.billing.receiptShareTitle', {code});
            await Share.share({title: shareTitle, url: dataUri, message: shareTitle});
        } catch (error) {
            toast.show(signInErrorText(error, t), 'error');
        }
    };

    const handlePullRefresh = async () => {
        setRefreshing(true);
        try {
            await instructions.refetch();
            await refresh();
        } finally {
            setRefreshing(false);
        }
    };

    if (instructions.isPending) return <Screen><LoadingState/></Screen>;
    if (instructions.isError || !data) {
        return (
            <Screen onRefresh={() => void handlePullRefresh()} refreshing={refreshing}>
                <ErrorState message={t('billingPage.loadError')} retryLabel={t('common.retry')} onRetry={() => void instructions.refetch()}/>
                {Number.isSafeInteger(invoiceId) && invoiceId > 0 && (
                    <Card>
                        <SectionTitle title={t('mobile.billing.receiptTitle')}/>
                        <AppText variant="small">{t('mobile.billing.receiptPendingHint')}</AppText>
                        <Button
                            label={t('mobile.billing.shareReceiptPdf')}
                            tone="secondary"
                            icon={Download}
                            loading={downloadReceipt.isPending}
                            onPress={() => void shareReceipt(invoiceId, `#${invoiceId}`)}
                        />
                    </Card>
                )}
            </Screen>
        );
    }

    const paid = data.status === 'PAID';
    const open = data.status === 'PENDING';
    const closed = !paid && !open;
    const overdue = open && data.dueDate != null && new Date(data.dueDate).getTime() < openedAt;

    // The share sheet offers "Save Image", and a banking app can then scan the QR from the photo library.
    const saveQr = () => qrRef.current?.toDataURL(base64 => {
        const title = t('mobile.billing.qrShareTitle', {code: data.invoiceCode});
        void Share.share({title, url: `data:image/png;base64,${base64}`}).catch(() => undefined);
    });

    const confirmCancel = () => Alert.alert(t('mobile.billing.cancelInvoice'), t('mobile.billing.cancelQuestion', {code: data.invoiceCode}), [
        {text: t('common.cancel'), style: 'cancel'},
        {
            text: t('mobile.billing.cancelInvoice'), style: 'destructive', onPress: () => cancel.mutate(data.invoiceId, {
                onSuccess: () => {
                    toast.show(t('mobile.billing.cancelled', {code: data.invoiceCode}), 'success');
                    void instructions.refetch();
                },
                onError: error => toast.show(signInErrorText(error, t), 'error'),
            }),
        },
    ]);

    const checkPaymentStatus = async () => {
        setCheckingStatus(true);
        try {
            const result = await instructions.refetch();
            await refresh();
            if (result.error) {
                toast.show(signInErrorText(result.error, t), 'error');
                return;
            }
            if (result.data?.status === 'PAID') {
                toast.show(t('mobile.billing.paidConfirmed', {code: data.invoiceCode}), 'success');
            } else {
                toast.show(t('mobile.billing.stillPending'), 'info');
            }
        } finally {
            setCheckingStatus(false);
        }
    };

    return (
        <Screen refreshing={refreshing} onRefresh={() => void handlePullRefresh()}>
            <Card style={styles.center}>
                <AppText variant="caption">{t('billingPage.invoiceAmount', {code: data.invoiceCode, amount: ''})}</AppText>
                <AppText variant="display">{formatCurrency(data.total)}</AppText>
                {data.itemName ? <AppText variant="small">{data.itemName}</AppText> : null}
                {data.dueDate && !paid ? (
                    <View style={styles.due}>
                        <CalendarClock size={14} color={overdue ? colors.danger : colors.muted}/>
                        <AppText variant="caption" style={overdue ? styles.dueLate : undefined}>
                            {t('mobile.billing.dueOn', {date: formatDate(data.dueDate, {dateStyle: 'medium'})})}
                        </AppText>
                    </View>
                ) : null}
                {paid ? (
                    <View style={styles.paid}><CheckCircle2 size={20} color={colors.slateDark}/><AppText variant="title">{t('billingPage.status.PAID')}</AppText></View>
                ) : closed ? (
                    <View style={styles.paid}><Ban size={20} color={colors.textSecondary}/><AppText variant="title">{t(`billingPage.status.${data.status}`)}</AppText></View>
                ) : data.qrPayload ? (
                    <View style={styles.qr} accessibilityLabel={t('mobile.billing.qrLabel')}>
                        <QRCode value={data.qrPayload} size={220} color={colors.text} backgroundColor={colors.white} getRef={ref => { qrRef.current = ref; }}/>
                    </View>
                ) : null}
                {open && <AppText variant="caption" style={styles.centerText}>{t('mobile.billing.scanHint')}</AppText>}
                {open && data.qrPayload ? <Button label={t('mobile.billing.saveQr')} tone="secondary" icon={ImageDown} onPress={saveQr}/> : null}
            </Card>

            {overdue && (
                <Card style={styles.warning}>
                    <View style={styles.due}>
                        <AlertTriangle size={18} color={colors.danger}/>
                        <AppText variant="small" style={styles.flex}>{t('mobile.billing.overdue')}</AppText>
                    </View>
                </Card>
            )}

            {closed && (
                <Card>
                    <SectionTitle title={t('mobile.billing.closedTitle')}/>
                    <AppText variant="small">{data.status === 'EXPIRED' ? t('mobile.billing.closedExpired') : t('mobile.billing.closedCancelled')}</AppText>
                    <AppText variant="caption">{t('mobile.billing.lateTransferHint')}</AppText>
                    <Button label={t('mobile.billing.backToBilling')} icon={Receipt} onPress={() => router.replace('/customer/billing')}/>
                    <Button label={t('mobile.billing.contactSupportButton')} tone="secondary" icon={MessageCircle} onPress={() => router.push('/customer/support')}/>
                </Card>
            )}

            {open && (
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
                        <SectionTitle
                            title={t('mobile.billing.autoReconcileTitle')}
                            action={
                                <Badge
                                    icon={Radio}
                                    label={wsConnected ? t('mobile.billing.liveReconcileActive') : t('mobile.support.liveSyncing')}
                                    background={wsConnected ? colors.primaryLight : colors.slateLight}
                                    color={wsConnected ? colors.primary : colors.slateDark}
                                />
                            }
                        />
                        <AppText variant="small">{t('mobile.billing.autoReconcileHint', {content: data.transferContent})}</AppText>
                        <Button label={t('mobile.billing.checkStatus')} icon={RefreshCw} loading={checkingStatus} onPress={() => void checkPaymentStatus()}/>
                        <Button
                            label={t('mobile.billing.contactSupportButton')}
                            tone="secondary"
                            icon={MessageCircle}
                            onPress={() => router.push('/customer/support')}
                        />
                        {data.kind === 'PLAN' && (
                            <Button label={t('mobile.billing.cancelInvoice')} tone="ghost" icon={XCircle} loading={cancel.isPending} onPress={confirmCancel}/>
                        )}
                    </Card>
                </>
            )}

            {!closed && <Card>
                <SectionTitle title={t('mobile.billing.receiptTitle')}/>
                <AppText variant="small">{paid ? t('mobile.billing.receiptPaidHint') : t('mobile.billing.receiptPendingHint')}</AppText>
                <Button
                    label={t('mobile.billing.shareReceiptPdf')}
                    tone={paid ? 'primary' : 'secondary'}
                    icon={Download}
                    loading={downloadReceipt.isPending}
                    onPress={() => void shareReceipt(data.invoiceId, data.invoiceCode)}
                />
            </Card>}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    center: {alignItems: 'center'},
    centerText: {textAlign: 'center'},
    qr: {padding: spacing.md, backgroundColor: colors.white, borderRadius: radius.card, marginVertical: spacing.sm},
    paid: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm},
    due: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    dueLate: {color: colors.danger, fontWeight: '600'},
    warning: {borderColor: colors.danger, borderWidth: 1, backgroundColor: colors.dangerLight},
    line: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
    pressed: {opacity: 0.7},
});
