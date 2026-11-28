import React, {useEffect, useState} from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {ArrowLeft, Mail, Phone, Radio, Send, Zap} from 'lucide-react-native';
import {SupportMessageStatusRow} from '@/components/support/SupportMessageStatusRow';
import {AppText, Badge, Button, Card, ChipGroup, ErrorState, LoadingState, ScaledText, SectionTitle, TextField} from '@/components/ui';
import {signInErrorText} from '@/forms/sign-in-flow';
import {
    useAdminQuickReplies,
    useAdminSupportMutations,
    useAdminSupportRealtime,
    useAdminSupportThreadDetail,
} from '@/hooks/useAdminSupportMobile';
import {useSupportOutboxMobile} from '@/hooks/useSupportOutboxMobile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import type {SupportQuickReply, SupportThreadStatus} from '@/shared/types/support.types';
import {mergeMessagesWithOutbox, resolveSupportMessageReceipt} from '@/shared/utils/message-status';
import {formatSupportSource, formatSupportTime, formatSupportTopic, personalizeQuickReply, prioritizeQuickReplies, resolveContactHref} from '@/shared/utils/support-format';
import {colors, font, radius, spacing} from '@/styles/tokens';

export function AdminSupportThreadCard({threadId, onBack}: { threadId: number; onBack: () => void }) {
    const {t, locale} = useI18n();
    const {user} = useAuth();
    const toast = useToast();
    const detailQuery = useAdminSupportThreadDetail(threadId);
    const quickRepliesQuery = useAdminQuickReplies();
    const mutations = useAdminSupportMutations();
    const {wsConnected, visitorTypingByThread, notifyAdminTyping} = useAdminSupportRealtime();
    const [draft, setDraft] = useState('');

    const showError = (error: unknown) => toast.show(signInErrorText(error, t), 'error');
    const {outbox, enqueue, retry} = useSupportOutboxMobile(
        entry => mutations.reply.mutateAsync({
            id: Number(entry.scopeKey),
            body: {content: entry.content, status: entry.requestedThreadStatus},
        }),
        showError,
    );

    useEffect(() => () => notifyAdminTyping(threadId, false), [notifyAdminTyping, threadId]);

    if (detailQuery.isPending) {
        return (
            <View style={styles.stack}>
                <Button tone="secondary" icon={ArrowLeft} label={t('mobile.support.backToList')} onPress={onBack}/>
                <LoadingState label={t('common.loading')}/>
            </View>
        );
    }

    if (detailQuery.isError || !detailQuery.data) {
        return (
            <View style={styles.stack}>
                <Button tone="secondary" icon={ArrowLeft} label={t('mobile.support.backToList')} onPress={onBack}/>
                <ErrorState
                    message={t('customerAuth.errors.default')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void detailQuery.refetch()}
                />
            </View>
        );
    }

    const {thread, messages: rawMessages} = detailQuery.data;
    const messages = mergeMessagesWithOutbox(rawMessages, outbox, String(thread.id));
    const isVisitorTyping = Boolean(visitorTypingByThread[thread.id]);
    const contactLink = resolveContactHref(thread.contactInfo);
    const sortedTemplates = prioritizeQuickReplies(quickRepliesQuery.data ?? [], thread.topic);
    const nextReplyStatus: SupportThreadStatus = thread.status === 'OPEN' ? 'IN_PROGRESS' : thread.status;

    const statusOptions: { value: SupportThreadStatus; label: string }[] = [
        {value: 'OPEN', label: t('mobile.support.statusOpen')},
        {value: 'IN_PROGRESS', label: t('mobile.support.statusInProgress')},
        {value: 'RESOLVED', label: t('mobile.support.statusResolved')},
    ];

    const handleStatusChange = (status: SupportThreadStatus) => {
        if (status === thread.status) return;
        mutations.updateStatus.mutate(
            {id: thread.id, status},
            {
                onSuccess: () => toast.show(t('mobile.support.statusUpdatedToast'), 'success'),
                onError: showError,
            },
        );
    };

    const handleDraftChange = (value: string) => {
        setDraft(value);
        notifyAdminTyping(thread.id, value.trim().length > 0);
    };

    const sendContent = (rawContent: string, clearDraft: boolean) => {
        const trimmed = rawContent.trim();
        if (!trimmed) return;
        notifyAdminTyping(thread.id, false);
        if (clearDraft) setDraft('');
        enqueue({
            scopeKey: String(thread.id),
            senderRole: 'ADMIN',
            senderName: user?.fullName?.trim() || user?.username || t('mobile.support.adminSender'),
            content: trimmed,
            requestedThreadStatus: nextReplyStatus,
        });
    };

    const handleInstantSend = (tpl: SupportQuickReply) => {
        sendContent(personalizeQuickReply(tpl.content, thread.fullName), false);
    };

    return (
        <View style={styles.stack}>
            <Button size="sm" tone="secondary" icon={ArrowLeft} label={t('mobile.support.backToList')} onPress={onBack}/>

            <Card>
                <View style={styles.headerRow}>
                    <Badge label={thread.code} background={colors.primaryLight} color={colors.primary}/>
                    <Badge label={formatSupportTopic(thread.topic)} background={colors.slateLight} color={colors.slateDark}/>
                    <Badge label={formatSupportSource(thread.source)} background={colors.slateLight} color={colors.slate}/>
                    <Badge
                        icon={Radio}
                        label={wsConnected ? t('mobile.support.liveRealtime') : t('mobile.support.liveSyncing')}
                        background={wsConnected ? colors.primaryLight : colors.slateLight}
                        color={wsConnected ? colors.primary : colors.slateDark}
                    />
                </View>
                <AppText variant="heading">{thread.fullName}</AppText>
                {thread.organization ? <AppText variant="small">{thread.organization}</AppText> : null}
                <AppText variant="body" selectable>{thread.contactInfo}</AppText>
                {contactLink ? (
                    <Button
                        size="sm"
                        tone="secondary"
                        icon={contactLink.isEmail ? Mail : Phone}
                        label={contactLink.isEmail ? t('mobile.support.sendEmail') : t('mobile.support.callNow')}
                        onPress={() => {
                            Linking.openURL(contactLink.href).catch(showError);
                        }}
                    />
                ) : null}
                <ChipGroup<SupportThreadStatus>
                    options={statusOptions}
                    value={thread.status}
                    onChange={handleStatusChange}
                />
            </Card>

            <Card style={styles.transcriptCard}>
                {messages.map((msg, idx) => {
                    const isAdmin = msg.senderRole === 'ADMIN';
                    const receipt = resolveSupportMessageReceipt(messages, idx, 'ADMIN', locale);
                    return (
                        <View key={msg.clientKey ?? msg.id} style={[styles.msgGroup, isAdmin ? styles.msgGroupAdmin : styles.msgGroupVisitor]}>
                            <View style={[styles.bubble, isAdmin ? styles.adminBubble : styles.visitorBubble, msg.deliveryStatus === 'sending' && styles.sendingBubble]}>
                                <View style={styles.bubbleHeader}>
                                    <ScaledText style={[styles.sender, isAdmin && styles.adminMeta]}>
                                        {msg.senderName || (isAdmin ? t('mobile.support.adminSender') : thread.fullName)}
                                    </ScaledText>
                                    <ScaledText style={[styles.timestamp, isAdmin && styles.adminMeta]}>
                                        {formatSupportTime(msg.createdAt)}
                                    </ScaledText>
                                </View>
                                <AppText variant="body" selectable style={isAdmin ? styles.adminText : undefined}>
                                    {msg.content}
                                </AppText>
                            </View>
                            <SupportMessageStatusRow receipt={receipt} onRetry={msg.clientKey ? () => retry(msg.clientKey!) : undefined}/>
                        </View>
                    );
                })}
                {isVisitorTyping ? (
                    <View style={styles.typingBanner} accessibilityLiveRegion="polite">
                        <View style={styles.typingDot}/>
                        <ScaledText style={styles.typingText}>{t('mobile.support.visitorTyping')}</ScaledText>
                    </View>
                ) : null}
            </Card>

            {sortedTemplates.length > 0 ? (
                <Card>
                    <SectionTitle title={t('mobile.support.quickReplyTitle')}/>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickStrip}>
                        {sortedTemplates.map(tpl => (
                            <View key={tpl.id} style={styles.quickItem}>
                                <AppText variant="title" numberOfLines={1}>{tpl.title}</AppText>
                                <AppText variant="small" numberOfLines={2}>
                                    {personalizeQuickReply(tpl.content, thread.fullName)}
                                </AppText>
                                <View style={styles.quickActions}>
                                    <Pressable
                                        onPress={() => handleDraftChange(personalizeQuickReply(tpl.content, thread.fullName))}
                                        accessibilityRole="button"
                                        style={({pressed}) => [styles.draftChip, pressed && styles.pressed]}>
                                        <ScaledText style={styles.draftChipText}>{t('mobile.support.insertDraft')}</ScaledText>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleInstantSend(tpl)}
                                        accessibilityRole="button"
                                        style={({pressed}) => [styles.instantChip, pressed && styles.pressed]}>
                                        <Zap size={13} color={colors.white}/>
                                        <ScaledText style={styles.instantChipText}>{t('mobile.support.instantSend')}</ScaledText>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </Card>
            ) : null}

            <Card>
                <TextField
                    label={t('mobile.support.adminSender')} required
                    placeholder={t('mobile.support.adminReplyPlaceholder')}
                    value={draft}
                    onChangeText={handleDraftChange}
                    multiline
                />
                <Button
                    label={t('mobile.support.sendReplyButton')}
                    icon={Send}
                    disabled={!draft.trim()}
                    onPress={() => sendContent(draft, true)}
                />
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    stack: {gap: spacing.lg},
    headerRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    transcriptCard: {gap: spacing.md},
    msgGroup: {maxWidth: '86%', gap: 4},
    msgGroupVisitor: {alignSelf: 'flex-start', alignItems: 'flex-start'},
    msgGroupAdmin: {alignSelf: 'flex-end', alignItems: 'flex-end'},
    bubble: {borderRadius: radius.card, padding: spacing.md, gap: spacing.xs},
    sendingBubble: {opacity: 0.7},
    visitorBubble: {backgroundColor: colors.slateLight},
    adminBubble: {backgroundColor: colors.primary},
    bubbleHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    sender: {fontSize: font.caption, fontWeight: '700', color: colors.slateDark},
    timestamp: {fontSize: font.caption, color: colors.muted},
    adminMeta: {color: colors.primaryLight},
    adminText: {color: colors.white},
    typingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.control,
        backgroundColor: colors.warningLight,
    },
    typingDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning},
    typingText: {fontSize: font.caption, fontWeight: '600', color: colors.warning},
    quickStrip: {gap: spacing.sm, paddingVertical: 2},
    quickItem: {
        width: 268,
        padding: spacing.md,
        borderRadius: radius.control,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.canvas,
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    quickActions: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs},
    draftChip: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    draftChipText: {fontSize: font.caption, fontWeight: '600', color: colors.text},
    instantChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.control,
        backgroundColor: colors.primary,
    },
    instantChipText: {fontSize: font.caption, fontWeight: '700', color: colors.white},
    pressed: {opacity: 0.75},
    disabled: {opacity: 0.5},
});
