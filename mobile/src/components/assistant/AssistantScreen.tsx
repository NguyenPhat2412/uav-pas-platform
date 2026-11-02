import React, {useRef, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {Stack} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowUp, Trash2} from 'lucide-react-native';
import {AppText, Button, ChipGroup, LoadingState} from '@/components/ui';
import {AssistantMascot} from '@/components/assistant/AssistantMascot';
import {AppBackground} from '@/components/layout/AppBackground';
import {useAssistantChat, useAssistantInfo} from '@/hooks/assistant/useAssistant';
import {useAssistantThread} from '@/providers/AssistantContext';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {ChatMessage} from '@/shared/types/assistant/assistant.types';
import {colors, font, radius, spacing} from '@/styles/tokens';

/** Starter questions of the customer portal, the same list as the web widget (admin.assistant.faqCustomer.*). */
const FAQ = ['createMission', 'statuses', 'payment', 'quota', 'results', 'cancel'] as const;

/** A chat message stamped with the moment it was sent (used to key and order the bubbles). */
const message = (role: ChatMessage['role'], content: string): ChatMessage => ({role, content, at: Date.now()});

/** Replies use light Markdown; on the phone bold markers and heading hashes are dropped, the text stays. */
function plain(text: string) {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/`([^`]+)`/g, '$1');
}

function Bubble({item}: { item: ChatMessage }) {
    const mine = item.role === 'user';
    return (
        <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
            {!mine && <AssistantMascot size={28}/>}
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <AppText selectable style={mine ? styles.mineText : undefined}>{mine ? item.content : plain(item.content)}</AppText>
            </View>
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
    const [error, setError] = useState<string | null>(null);
    const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
    const modes = info.data?.modes ?? [];
    const mode = thread.mode ?? modes[0]?.mode ?? 1;

    const ask = (text: string) => {
        const content = text.trim();
        if (!content || chat.isPending) return;
        const next: ChatMessage[] = [...thread.messages, message('user', content)];
        thread.setMessages(() => next);
        setDraft('');
        setError(null);
        chat.mutate({mode, messages: next, conversationId: thread.conversationId}, {
            onSuccess: reply => {
                thread.setConversationId(reply.conversationId);
                thread.setMessages(messages => [...messages, message('assistant', reply.reply)]);
            },
            onError: failure => {
                const code = (failure as { status?: number }).status ?? 0;
                setError(t('admin.assistant.failed', {code}));
            },
        });
    };

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
            <ScrollView ref={scroll} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled"
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
                ) : thread.messages.map((item, index) => <Bubble key={`${item.at}-${index}`} item={item}/>)}
                {chat.isPending && (
                    <View style={styles.bubbleRow}>
                        <AssistantMascot size={28}/>
                        <View style={[styles.bubble, styles.theirs, styles.thinking]}>
                            <ActivityIndicator size="small" color={colors.slate}/>
                            <AppText variant="small">{t('admin.assistant.thinking')}</AppText>
                        </View>
                    </View>
                )}
                {error && (
                    <View style={styles.errorRow}>
                        <AppText variant="small" style={styles.error}>{error}</AppText>
                        <Button label={t('common.retry')} tone="ghost" onPress={() => {
                            const lastUser = [...thread.messages].reverse().find(item => item.role === 'user');
                            if (!lastUser) return;
                            thread.setMessages(items => items.slice(0, items.lastIndexOf(lastUser)));
                            ask(lastUser.content);
                        }}/>
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
    bubbleRow: {flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '100%'},
    bubbleRowMine: {justifyContent: 'flex-end'},
    bubble: {maxWidth: '82%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: 10},
    mine: {backgroundColor: colors.primary, borderBottomRightRadius: 6},
    mineText: {color: colors.white},
    theirs: {backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
    thinking: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    errorRow: {alignItems: 'center'},
    error: {color: colors.danger},
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
