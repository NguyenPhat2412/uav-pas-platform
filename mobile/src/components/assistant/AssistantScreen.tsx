import React, {useRef, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {Stack} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AlertCircle, ArrowUp, Check, CheckCheck, Clock, Trash2} from 'lucide-react-native';
import {AppText, ChipGroup, LoadingState, ScaledText} from '@/components/ui';
import {AssistantMascot} from '@/components/assistant/AssistantMascot';
import {AppBackground} from '@/components/layout/AppBackground';
import {useAssistantChat, useAssistantInfo} from '@/hooks/useAssistant';
import {useAssistantThread} from '@/providers/AssistantContext';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {ChatMessage} from '@/shared/types/assistant.types';
import {colors, font, radius, spacing} from '@/styles/tokens';

/** Starter questions of the customer portal, the same list as the web widget (admin.assistant.faqCustomer.*). */
const FAQ = ['createMission', 'statuses', 'payment', 'quota', 'results', 'cancel'] as const;
const sentAt = () => Date.now();

/** Replies use light Markdown; on the phone bold markers and heading hashes are dropped, the text stays. */
function plain(text: string) {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/`([^`]+)`/g, '$1');
}

function Bubble({
    item,
    isLastSettledMine,
    hasAssistantReply,
    onRetry,
}: {
    item: ChatMessage;
    isLastSettledMine: boolean;
    hasAssistantReply: boolean;
    onRetry?: () => void;
}) {
    const mine = item.role === 'user';
    return (
        <View style={[styles.turnWrap, mine && styles.turnWrapMine]}>
            <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                {!mine && <AssistantMascot size={28}/>}
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs, item.status === 'sending' && styles.sendingBubble]}>
                    <AppText selectable style={mine ? styles.mineText : undefined}>{mine ? item.content : plain(item.content)}</AppText>
                </View>
            </View>
            {mine && item.status === 'sending' ? (
                <View style={styles.statusRow}>
                    <Clock size={12} color={colors.muted}/>
                    <ScaledText style={styles.statusMuted}>Đang gửi</ScaledText>
                </View>
            ) : null}
            {mine && item.status === 'failed' ? (
                <Pressable onPress={onRetry} accessibilityRole="button" style={({pressed}) => [styles.failedBtn, pressed && styles.pressed]}>
                    <AlertCircle size={12} color={colors.danger}/>
                    <ScaledText style={styles.failedText}>Không gửi được · Thử lại</ScaledText>
                </Pressable>
            ) : null}
            {isLastSettledMine ? (
                hasAssistantReply ? (
                    <View style={styles.statusRow}>
                        <View style={styles.aiBadge}><ScaledText style={styles.aiBadgeText}>AI</ScaledText></View>
                        <CheckCheck size={13} color={colors.primary}/>
                        <ScaledText style={styles.statusSeen}>Đã xem</ScaledText>
                    </View>
                ) : (
                    <View style={styles.statusRow}>
                        <Check size={12} color={colors.muted}/>
                        <ScaledText style={styles.statusMuted}>Đã gửi</ScaledText>
                    </View>
                )
            ) : null}
        </View>
    );
}

/** The chat sheet: starter questions, the thread, answer mode and the composer above the keyboard. */
export function AssistantScreen() {
    const {t} = useI18n();
    const {user} = useAuth();
    const insets = useSafeAreaInsets();
    const info = useAssistantInfo();
    const chat = useAssistantChat();
    const thread = useAssistantThread();
    const [draft, setDraft] = useState('');
    const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
    const modes = info.data?.modes ?? [];
    const mode = thread.mode ?? modes[0]?.mode ?? 1;

    const dispatchTurn = (clientKey: string, nextMessages: ChatMessage[]) => {
        const cleanHistory = nextMessages.filter(m => m.status !== 'failed');
        chat.mutate({mode, messages: cleanHistory, conversationId: thread.conversationId}, {
            onSuccess: reply => {
                thread.setConversationId(reply.conversationId);
                thread.setMessages(items => [
                    ...items.map(m => (m.clientKey === clientKey ? {...m, status: 'seen' as const} : m)),
                    {role: 'assistant', content: reply.reply, at: sentAt()},
                ]);
            },
            onError: () => {
                thread.setMessages(items =>
                    items.map(m => (m.clientKey === clientKey ? {...m, status: 'failed' as const} : m)),
                );
            },
        });
    };

    const ask = (text: string) => {
        const content = text.trim();
        if (!content || chat.isPending) return;
        const now = sentAt();
        const clientKey = `mob-ast-${now}`;
        const next: ChatMessage[] = [
            ...thread.messages,
            {role: 'user', content, at: now, clientKey, status: 'sending'},
        ];
        thread.setMessages(() => next);
        setDraft('');
        dispatchTurn(clientKey, next);
    };

    const retryTurn = (clientKey?: string) => {
        if (!clientKey || chat.isPending) return;
        const idx = thread.messages.findIndex(m => m.clientKey === clientKey && m.status === 'failed');
        if (idx < 0) return;
        const next = thread.messages.map((m, i) => (i === idx ? {...m, status: 'sending' as const} : m));
        thread.setMessages(() => next);
        dispatchTurn(clientKey, next.slice(0, idx + 1));
    };

    let lastSettledUserIdx = -1;
    let lastSettledHasReply = false;
    for (let i = thread.messages.length - 1; i >= 0; i--) {
        const item = thread.messages[i];
        if (item.role === 'user' && item.status !== 'sending' && item.status !== 'failed') {
            lastSettledUserIdx = i;
            lastSettledHasReply = item.status === 'seen' || thread.messages.slice(i + 1).some(x => x.role === 'assistant');
            break;
        }
    }

    const header = (
        <Stack.Screen options={{
            title: t('admin.assistant.title'),
            headerRight: thread.messages.length ? () => (
                <Pressable onPress={thread.clear} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('admin.assistant.clear')}>
                    <Trash2 size={20} color={colors.primary}/>
                </Pressable>
            ) : undefined,
        }}/>
    );

    if (info.isPending) return <View style={styles.screen}>{header}<LoadingState label={t('admin.assistant.loading')}/></View>;
    if (!info.data?.enabled) {
        return (
            <View style={[styles.screen, styles.center]}>
                {header}
                <AssistantMascot size={88}/>
                <AppText variant="title">{t('admin.assistant.offTitle')}</AppText>
                <AppText variant="small" style={styles.centerText}>{t('admin.assistant.offBodyUser')}</AppText>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 44}>
            {header}
            <AppBackground/>
            <ScrollView ref={scroll} contentInsetAdjustmentBehavior="never" directionalLockEnabled alwaysBounceHorizontal={false} showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => scroll.current?.scrollToEnd({animated: true})}>
                {thread.messages.length === 0 ? (
                    <View style={styles.hello}>
                        <AssistantMascot size={96}/>
                        <AppText variant="heading" style={styles.centerText}>{t('admin.assistant.hello', {name: user?.fullName || user?.username || ''})}</AppText>
                        <AppText variant="small" style={styles.centerText}>{t('admin.assistant.helloBodyCustomer')}</AppText>
                        <AppText variant="caption" style={styles.faqTitle}>{t('admin.assistant.faqTitle')}</AppText>
                        {FAQ.map(key => (
                            <Pressable key={key} onPress={() => ask(t(`admin.assistant.faqCustomer.${key}`))} accessibilityRole="button"
                                       style={({pressed}) => [styles.faq, pressed && styles.pressed]}>
                                <AppText variant="small" style={styles.faqText}>{t(`admin.assistant.faqCustomer.${key}`)}</AppText>
                            </Pressable>
                        ))}
                    </View>
                ) : thread.messages.map((item, index) => (
                    <Bubble
                        key={item.clientKey ?? `${item.at}-${index}`}
                        item={item}
                        isLastSettledMine={index === lastSettledUserIdx}
                        hasAssistantReply={lastSettledHasReply}
                        onRetry={() => retryTurn(item.clientKey)}
                    />
                ))}
                {chat.isPending && (
                    <View style={styles.bubbleRow}>
                        <AssistantMascot size={28}/>
                        <View style={[styles.bubble, styles.theirs, styles.thinking]}>
                            <ActivityIndicator size="small" color={colors.slate}/>
                            <AppText variant="small">{t('admin.assistant.thinking')}</AppText>
                        </View>
                    </View>
                )}
            </ScrollView>
            <View style={[styles.composer, {paddingBottom: Math.max(insets.bottom, spacing.md)}]}>
                {modes.length > 1 && (
                    <ChipGroup value={String(mode)} onChange={value => thread.setMode(Number(value))}
                               options={modes.map(item => ({value: String(item.mode), label: item.label}))}/>
                )}
                <View style={styles.inputRow}>
                    <TextInput value={draft} onChangeText={setDraft} placeholder={t('admin.assistant.placeholder')} placeholderTextColor={colors.muted}
                               accessibilityLabel={t('admin.assistant.input')} multiline maxLength={4000} style={styles.input}
                               onSubmitEditing={() => ask(draft)} submitBehavior="submit" returnKeyType="send"/>
                    <Pressable onPress={() => ask(draft)} disabled={!draft.trim() || chat.isPending} accessibilityRole="button"
                               accessibilityLabel={t('admin.assistant.send')}
                               style={[styles.send, (!draft.trim() || chat.isPending) && styles.sendDisabled]}>
                        <ArrowUp size={20} color={colors.white}/>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.canvas},
    center: {alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl},
    centerText: {textAlign: 'center'},
    thread: {padding: spacing.lg, gap: spacing.md, flexGrow: 1},
    hello: {alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg},
    faqTitle: {alignSelf: 'flex-start', marginTop: spacing.lg, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
    faq: {
        alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    faqText: {color: colors.text},
    pressed: {opacity: 0.7},
    turnWrap: {gap: 4, maxWidth: '100%'},
    turnWrapMine: {alignItems: 'flex-end'},
    bubbleRow: {flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '100%'},
    bubbleRowMine: {justifyContent: 'flex-end'},
    bubble: {maxWidth: '82%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: 10},
    sendingBubble: {opacity: 0.7},
    mine: {backgroundColor: colors.primary, borderBottomRightRadius: 6},
    mineText: {color: colors.white},
    theirs: {backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
    thinking: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    statusRow: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2},
    statusMuted: {fontSize: font.caption - 1, color: colors.muted, fontWeight: '500'},
    statusSeen: {fontSize: font.caption - 1, color: colors.slateDark, fontWeight: '600'},
    aiBadge: {
        width: 15, height: 15, borderRadius: 8, backgroundColor: colors.slateDark,
        borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    },
    aiBadgeText: {fontSize: 7, fontWeight: '800', color: colors.white},
    failedBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.control, backgroundColor: colors.dangerLight,
    },
    failedText: {fontSize: font.caption - 1, fontWeight: '700', color: colors.danger},
    composer: {
        gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    },
    inputRow: {flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm},
    input: {
        flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: spacing.lg,
        paddingTop: 11, paddingBottom: 11, fontSize: font.body, color: colors.text, backgroundColor: colors.canvas,
    },
    send: {width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
    sendDisabled: {opacity: 0.4},
});
