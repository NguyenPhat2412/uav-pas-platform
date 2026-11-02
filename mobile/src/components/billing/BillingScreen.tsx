import React from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ChevronRight, Gauge, Receipt} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle} from '@/components/ui';
import {useBilling, useBillingActions} from '@/hooks/billing/useCustomerBilling';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {planName} from '@/shared/lib/presentation';
import type {InvoiceStatus, ServicePlan} from '@/shared/types/customer';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {colors, radius, spacing} from '@/styles/tokens';

const INVOICE_TONE: Record<InvoiceStatus, { background: string; color: string }> = {
    PAID: {background: colors.slateDark, color: colors.white},
    PENDING: {background: colors.warningLight, color: colors.warning},
    FAILED: {background: colors.dangerLight, color: colors.danger},
    CANCELLED: {background: colors.slateLight, color: colors.textSecondary},
};

export function BillingScreen() {
    const {t, formatCurrency, formatDate, formatNumber} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const {quota, invoices, plans} = useBilling();
    const {subscribe} = useBillingActions();

    const choosePlan = (plan: ServicePlan) => Alert.alert(planName(plan.name), t('mobile.billing.subscribeQuestion', {price: formatCurrency(plan.price)}), [
        {text: t('common.cancel'), style: 'cancel'},
        {
            text: t('common.confirm'), onPress: () => subscribe.mutate(plan.code, {
                onSuccess: invoice => {
                    if (invoice) router.push({pathname: '/customer/invoices/[id]', params: {id: String(invoice.id)}});
                    else toast.show(t('mobile.billing.planApplied'), 'success');
                },
                onError: error => toast.show(signInErrorText(error, t), 'error'),
            }),
        },
    ]);

    const refreshing = quota.isRefetching || invoices.isRefetching || plans.isRefetching;
    const current = quota.data;
    const percent = current && current.flightHoursLimit > 0 ? Math.min(100, Math.round(current.flightHoursUsed / current.flightHoursLimit * 100)) : 0;

    return (
        <Screen refreshing={refreshing} onRefresh={() => void Promise.all([quota.refetch(), invoices.refetch(), plans.refetch()])}>
            <Card>
                <View style={styles.row}>
                    <Gauge size={20} color={colors.primary}/>
                    <AppText variant="title" style={styles.flex}>{t('billingPage.currentPlan')}</AppText>
                    {current && <Badge label={planName(current.planName)}/>}
                </View>
                {quota.isPending ? <LoadingState/> : !current ? <AppText variant="small">{t('dashboard.analytics.noQuota')}</AppText> : (
                    <>
                        <AppText variant="display">{formatNumber(current.flightHoursUsed)}<AppText variant="title"> {t('billingPage.hoursTotal', {limit: current.flightHoursLimit})}</AppText></AppText>
                        <View style={styles.bar}><View style={[styles.barFill, {width: `${percent}%`}, percent >= 90 && styles.barDanger]}/></View>
                        <AppText variant="small">{t('billingPage.remaining', {hours: formatNumber(current.flightHoursRemaining)})}</AppText>
                        <AppText variant="caption">{t('billingPage.cycleEnds', {date: formatDate(current.cycleEnd, {dateStyle: 'medium'})})}</AppText>
                    </>
                )}
            </Card>

            <SectionTitle title={t('billingPage.invoiceHistory')}/>
            {invoices.isPending ? <LoadingState/>
                : invoices.isError ? <ErrorState message={t('billingPage.loadError')} retryLabel={t('common.retry')} onRetry={() => void invoices.refetch()}/>
                    : !invoices.data?.content.length ? <EmptyState icon={Receipt} message={t('billingPage.noInvoices')}/>
                        : invoices.data.content.map(invoice => {
                            const tone = INVOICE_TONE[invoice.status];
                            return (
                                <Card key={invoice.id} onPress={invoice.status === 'PENDING' ? () => router.push({pathname: '/customer/invoices/[id]', params: {id: String(invoice.id)}}) : undefined}>
                                    <View style={styles.row}>
                                        <AppText variant="caption" style={styles.code}>{invoice.code}</AppText>
                                        <Badge label={t(`billingPage.status.${invoice.status}`)} background={tone.background} color={tone.color}/>
                                    </View>
                                    <View style={styles.row}>
                                        <View style={styles.flex}>
                                            <AppText numberOfLines={1}>{invoice.missionTitle || planName(invoice.planName) || invoice.notes || invoice.code}</AppText>
                                            <AppText variant="caption">{t('billingPage.dueDate')}: {formatDate(invoice.dueDate, {dateStyle: 'medium'})}</AppText>
                                        </View>
                                        <AppText variant="title">{formatCurrency(invoice.amount)}</AppText>
                                        {invoice.status === 'PENDING' && <ChevronRight size={18} color={colors.muted}/>}
                                    </View>
                                </Card>
                            );
                        })}

            <SectionTitle title={t('billingPage.plans')}/>
            {plans.isPending ? <LoadingState label={t('billingPage.loadingPlans')}/>
                : !plans.data?.length ? <EmptyState message={t('billingPage.noPlans')}/>
                    : plans.data.filter(plan => plan.active).map(plan => {
                        const isCurrent = current?.planCode === plan.code;
                        return (
                            <Card key={plan.id} style={isCurrent ? styles.currentPlan : undefined}>
                                <View style={styles.row}>
                                    <AppText variant="title" style={styles.flex}>{planName(plan.name)}</AppText>
                                    <AppText variant="title">{formatCurrency(plan.price)}</AppText>
                                </View>
                                <AppText variant="small">{t('billingPage.hoursTotal', {limit: plan.maxMonthlyFlightHours})} · {t('billingPage.concurrentMissions')} {plan.maxConcurrentUavs}</AppText>
                                {plan.description ? <AppText variant="caption">{plan.description}</AppText> : null}
                                {!isCurrent && <Button label={t('mobile.billing.choosePlan')} tone="secondary" loading={subscribe.isPending && subscribe.variables === plan.code}
                                                       onPress={() => choosePlan(plan)}/>}
                            </Card>
                        );
                    })}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    code: {fontWeight: '700', letterSpacing: 0.5, flex: 1},
    bar: {height: 8, borderRadius: 4, backgroundColor: colors.slateLight, overflow: 'hidden'},
    barFill: {height: 8, borderRadius: 4, backgroundColor: colors.primary},
    barDanger: {backgroundColor: colors.danger},
    currentPlan: {borderColor: colors.primary, borderWidth: 1.5, borderRadius: radius.card},
});
