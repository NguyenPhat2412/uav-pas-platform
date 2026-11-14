import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {Inbox, Radio, Zap} from 'lucide-react-native';
import {AppForbiddenView} from '@/components/shared/AppStatusViews';
import {
    AppText,
    Badge,
    Button,
    Card,
    ChipGroup,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {AdminQuickRepliesCard} from '@/components/support/AdminQuickRepliesCard';
import {AdminSupportThreadCard} from '@/components/support/AdminSupportThreadCard';
import {
    useAdminSupportRealtime,
    useAdminSupportSummary,
    useAdminSupportThreads,
    useCanManageSupport,
} from '@/hooks/support/useAdminSupportMobile';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import type {SupportThreadFilter, SupportThreadStatus} from '@/shared/types/support/support.types';
import {formatSupportTime, formatSupportTopic} from '@/shared/utils/support/support-format';
import {colors, font, radius, spacing} from '@/styles/tokens';

type InboxFilterChip = 'ALL' | 'UNREAD' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

function statusBadgeMeta(status: SupportThreadStatus, t: (key: string) => string) {
    if (status === 'OPEN') return {bg: colors.dangerLight, fg: colors.danger, label: t('mobile.support.statusOpen')};
    if (status === 'IN_PROGRESS') {
        return {bg: colors.warningLight, fg: colors.warning, label: t('mobile.support.statusInProgress')};
    }
    return {bg: colors.slateLight, fg: colors.slateDark, label: t('mobile.support.statusResolved')};
}

export function AdminSupportInboxScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const canManage = useCanManageSupport();
    const params = useLocalSearchParams<{ threadId?: string }>();

    const parsedThreadId = params.threadId ? Number(params.threadId) : NaN;
    const deepLinkedId = Number.isFinite(parsedThreadId) && parsedThreadId > 0 ? parsedThreadId : null;

    const [manualThreadId, setManualThreadId] = useState<number | null>(null);
    const [dismissedDeepLinkId, setDismissedDeepLinkId] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<InboxFilterChip>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const selectedThreadId =
        manualThreadId ?? (deepLinkedId !== null && deepLinkedId !== dismissedDeepLinkId ? deepLinkedId : null);

    const setSelectedThreadId = (id: number | null) => {
        setManualThreadId(id);
        if (id === null && deepLinkedId !== null) {
            setDismissedDeepLinkId(deepLinkedId);
        }
    };

    const {wsConnected, visitorTypingByThread} = useAdminSupportRealtime(canManage, deletedId => {
        if (selectedThreadId === deletedId) {
            setSelectedThreadId(null);
            toast.show(t('mobile.support.threadDeletedToast'), 'info');
        }
    });

    const filter = useMemo<SupportThreadFilter>(() => {
        const q = searchQuery.trim() || undefined;
        if (activeFilter === 'UNREAD') return {unreadOnly: true, q};
        if (activeFilter === 'OPEN' || activeFilter === 'IN_PROGRESS' || activeFilter === 'RESOLVED') {
            return {status: activeFilter, q};
        }
        return {q};
    }, [activeFilter, searchQuery]);

    const summaryQuery = useAdminSupportSummary(canManage);
    const threadsQuery = useAdminSupportThreads(filter, canManage && selectedThreadId === null);

    if (!canManage) {
        return (
            <Screen>
                <AppForbiddenView detail={t('mobile.support.noPermission')} fallbackHref="/operations/missions"/>
            </Screen>
        );
    }

    if (selectedThreadId !== null) {
        return (
            <Screen>
                <AdminSupportThreadCard threadId={selectedThreadId} onBack={() => setSelectedThreadId(null)}/>
            </Screen>
        );
    }

    const summary = summaryQuery.data;
    const unreadTotal = summary?.unreadMessages ?? summary?.unreadThreads ?? 0;
    const threads = threadsQuery.data?.content ?? [];

    const kpis = [
        {label: t('mobile.support.kpiTotal'), value: summary?.totalThreads ?? 0, alert: false},
        {label: t('mobile.support.kpiUnread'), value: unreadTotal, alert: unreadTotal > 0},
        {label: t('mobile.support.kpiOpen'), value: summary?.openThreads ?? 0, alert: false},
        {label: t('mobile.support.kpiInProgress'), value: summary?.inProgressThreads ?? 0, alert: false},
        {label: t('mobile.support.kpiResolved'), value: summary?.resolvedThreads ?? 0, alert: false},
    ];

    const filterOptions: { value: InboxFilterChip; label: string }[] = [
        {value: 'ALL', label: t('mobile.support.filterAll')},
        {value: 'UNREAD', label: t('mobile.support.filterUnread')},
        {value: 'OPEN', label: t('mobile.support.filterOpen')},
        {value: 'IN_PROGRESS', label: t('mobile.support.filterInProgress')},
        {value: 'RESOLVED', label: t('mobile.support.filterResolved')},
    ];

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([summaryQuery.refetch(), threadsQuery.refetch()]);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <Screen
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}>
            <Card>
                <SectionTitle
                    title={t('mobile.support.adminTitle')}
                    action={
                        <Badge
                            icon={Radio}
                            label={wsConnected ? t('mobile.support.liveRealtime') : t('mobile.support.liveSyncing')}
                            background={wsConnected ? colors.primaryLight : colors.slateLight}
                            color={wsConnected ? colors.primary : colors.slateDark}
                        />
                    }
                />
                <View style={styles.kpiGrid}>
                    {kpis.map(kpi => (
                        <View key={kpi.label} style={[styles.kpiCell, kpi.alert && styles.kpiCellAlert]}>
                            <AppText variant="title" style={kpi.alert ? styles.kpiValueAlert : undefined}>
                                {kpi.value}
                            </AppText>
                            <AppText variant="caption" style={[styles.kpiLabel, kpi.alert && styles.kpiValueAlert]}>
                                {kpi.label}
                            </AppText>
                        </View>
                    ))}
                </View>
                <Button
                    size="sm"
                    tone="secondary"
                    icon={Zap}
                    label={showTemplates ? t('mobile.support.hideTemplates') : t('mobile.support.manageTemplates')}
                    onPress={() => setShowTemplates(prev => !prev)}
                />
            </Card>

            {showTemplates ? <AdminQuickRepliesCard/> : null}

            <Card>
                <ChipGroup<InboxFilterChip> options={filterOptions} value={activeFilter} onChange={setActiveFilter}/>
                <TextField
                    label=""
                    placeholder={t('mobile.support.searchPlaceholder')}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </Card>

            {threadsQuery.isPending ? (
                <LoadingState label={t('common.loading')}/>
            ) : threadsQuery.isError ? (
                <ErrorState
                    message={t('customerAuth.errors.default')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void threadsQuery.refetch()}
                />
            ) : threads.length === 0 ? (
                <EmptyState icon={Inbox} message={t('mobile.support.emptyInbox')}/>
            ) : (
                threads.map(item => {
                    const tone = statusBadgeMeta(item.status, t);
                    const hasUnread = item.unreadForAdmin > 0;
                    const isVisitorTyping = Boolean(visitorTypingByThread[item.id]);
                    return (
                        <Card
                            key={item.id}
                            onPress={() => setSelectedThreadId(item.id)}
                            accessibilityLabel={`${item.code} ${item.fullName}`}
                            style={hasUnread ? styles.unreadCard : undefined}>
                            <View style={styles.cardHeader}>
                                <View style={styles.badgeRow}>
                                    <Badge label={item.code} background={colors.slateLight} color={colors.slateDark}/>
                                    <Badge label={tone.label} background={tone.bg} color={tone.fg}/>
                                    {hasUnread ? (
                                        <Badge
                                            label={t('mobile.support.unreadBadge', {count: item.unreadForAdmin})}
                                            background={colors.danger}
                                            color={colors.white}
                                        />
                                    ) : null}
                                    {isVisitorTyping ? (
                                        <Badge
                                            label={t('mobile.support.visitorTyping')}
                                            background={colors.warningLight}
                                            color={colors.warning}
                                        />
                                    ) : null}
                                </View>
                                <AppText variant="caption">{formatSupportTime(item.updatedAt)}</AppText>
                            </View>
                            <AppText variant="title" numberOfLines={1}>{item.fullName}</AppText>
                            <AppText variant="small" numberOfLines={1}>
                                {item.contactInfo} · {formatSupportTopic(item.topic)}
                            </AppText>
                            {isVisitorTyping ? (
                                <AppText variant="small" style={styles.typingPreview}>
                                    {t('mobile.support.visitorTyping')}
                                </AppText>
                            ) : item.lastMessagePreview ? (
                                <AppText variant="body" numberOfLines={2} style={styles.preview}>
                                    {item.lastMessagePreview}
                                </AppText>
                            ) : null}
                        </Card>
                    );
                })
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    kpiCell: {
        flexGrow: 1,
        flexBasis: '30%',
        minWidth: 96,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.slateLight,
        alignItems: 'center',
        gap: 2,
    },
    kpiLabel: {textAlign: 'center'},
    kpiCellAlert: {backgroundColor: colors.dangerLight, borderColor: colors.danger},
    kpiValueAlert: {color: colors.danger},
    unreadCard: {borderColor: colors.danger, backgroundColor: colors.primaryLight},
    cardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, flex: 1},
    preview: {fontSize: font.small, color: colors.textSecondary},
    typingPreview: {color: colors.primary, fontWeight: '600'},
});
