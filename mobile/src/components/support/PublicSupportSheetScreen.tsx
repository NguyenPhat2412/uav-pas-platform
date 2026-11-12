import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RotateCcw, Send} from 'lucide-react-native';
import {BrandMark} from '@/components/shared/BrandMark';
import {MobileSupportContactCard} from '@/components/support/MobileSupportContactCard';
import {
    AppText,
    Badge,
    Button,
    Card,
    ChipGroup,
    LoadingState,
    ScaledText,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {usePublicSupportSession} from '@/hooks/support/usePublicSupportMobile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import type {SupportChatMessage, SupportThreadStatus, SupportTopic} from '@/shared/types/support/support.types';
import {formatSupportTime, formatSupportTopic, SUPPORT_TOPIC_OPTIONS} from '@/shared/utils/support/support-format';
import {colors, font, radius, spacing} from '@/styles/tokens';

const TOPIC_CHIPS = SUPPORT_TOPIC_OPTIONS.map(option => ({value: option.value, label: option.label}));

function resolveStatusTone(status: SupportThreadStatus, t: (key: string) => string) {
    if (status === 'IN_PROGRESS') {
        return {label: t('mobile.support.statusInProgress'), background: colors.warningLight, color: colors.warning};
    }
    if (status === 'RESOLVED') {
        return {label: t('mobile.support.statusResolved'), background: colors.slateLight, color: colors.slateDark};
    }
    return {label: t('mobile.support.statusOpen'), background: colors.primaryLight, color: colors.primary};
}

function SupportMessageBubble({message, youLabel, adminFallback}: {
    message: SupportChatMessage;
    youLabel: string;
    adminFallback: string;
}) {
    const isVisitor = message.senderRole === 'VISITOR';
    const senderLabel = isVisitor ? youLabel : message.senderName || adminFallback;
    return (
        <View style={[styles.bubbleWrap, isVisitor ? styles.bubbleWrapVisitor : styles.bubbleWrapAdmin]}>
            <ScaledText style={styles.bubbleMeta}>
                {senderLabel} · {formatSupportTime(message.createdAt)}
            </ScaledText>
            <View style={[styles.bubble, isVisitor ? styles.bubbleVisitor : styles.bubbleAdmin]}>
                <AppText selectable style={isVisitor ? styles.bubbleVisitorText : styles.bubbleAdminText}>
                    {message.content}
                </AppText>
            </View>
        </View>
    );
}

/** Visitor & customer direct contact + live 2-way support chat form-sheet screen. */
export function PublicSupportSheetScreen() {
    const {t} = useI18n();
    const {user} = useAuth();
    const toast = useToast();
    const {hydrated, visitorToken, session, isLoading, isFetching, refetch, startThread, sendMessage, resetSession} =
        usePublicSupportSession(true);

    const [topic, setTopic] = useState<SupportTopic>('GENERAL_SUPPORT');
    const [fullNameInput, setFullNameInput] = useState<string | null>(null);
    const [organization, setOrganization] = useState('');
    const [contactInput, setContactInput] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [replyError, setReplyError] = useState<string | null>(null);

    const fullName = fullNameInput ?? (user?.fullName || user?.username || '');
    const contactInfo = contactInput ?? (user?.email || user?.phoneNumber || '');

    const handleStartInquiry = () => {
        if (!fullName.trim() || !contactInfo.trim() || !message.trim()) {
            const requiredMsg = t('mobile.support.validationRequired');
            setFormError(requiredMsg);
            toast.show(requiredMsg, 'error');
            return;
        }
        setFormError(null);
        startThread.mutate(
            {
                fullName: fullName.trim(),
                organization: organization.trim() || undefined,
                contactInfo: contactInfo.trim(),
                topic,
                source: 'LIVE_WIDGET',
                message: message.trim(),
            },
            {
                onSuccess: created => {
                    setMessage('');
                    setFormError(null);
                    toast.show(t('mobile.support.startedToast', {code: created.code}), 'success');
                },
                onError: err => {
                    const text = signInErrorText(err, t);
                    setFormError(text);
                    toast.show(text, 'error');
                },
            },
        );
    };

    const handleSendReply = () => {
        const trimmed = draft.trim();
        if (!trimmed || sendMessage.isPending) return;
        setReplyError(null);
        sendMessage.mutate(trimmed, {
            onSuccess: () => {
                setDraft('');
                setReplyError(null);
                toast.show(t('mobile.support.sentToast'), 'success');
            },
            onError: err => {
                const text = signInErrorText(err, t);
                setReplyError(text);
                toast.show(text, 'error');
            },
        });
    };

    const handleResetSession = async () => {
        setDraft('');
        setReplyError(null);
        await resetSession();
    };

    const statusTone = session ? resolveStatusTone(session.status, t) : null;

    return (
        <Screen onRefresh={() => void refetch()} refreshing={isFetching}>
            <Card style={styles.heroCard}>
                <BrandMark size={40}/>
                <AppText variant="title">{t('mobile.support.publicTitle')}</AppText>
                <AppText variant="small">{t('mobile.support.publicSubtitle')}</AppText>
            </Card>

            <MobileSupportContactCard/>

            {!hydrated || (Boolean(visitorToken) && isLoading && !session) ? (
                <LoadingState/>
            ) : !session ? (
                <Card>
                    <SectionTitle title={t('mobile.support.startChatTitle')}/>
                    <View style={styles.topicSection}>
                        <ScaledText style={styles.topicLabel}>{t('mobile.support.topicLabel')}</ScaledText>
                        <ChipGroup<SupportTopic> value={topic} onChange={setTopic} options={TOPIC_CHIPS}/>
                    </View>
                    <TextField label={t('mobile.support.fullNameLabel')} placeholder={t('mobile.support.fullNamePlaceholder')}
                               value={fullName} onChangeText={setFullNameInput} returnKeyType="next"/>
                    <TextField label={t('mobile.support.organizationLabel')} placeholder={t('mobile.support.organizationPlaceholder')}
                               value={organization} onChangeText={setOrganization} returnKeyType="next"/>
                    <TextField label={t('mobile.support.contactInfoLabel')} placeholder={t('mobile.support.contactInfoPlaceholder')}
                               value={contactInfo} onChangeText={setContactInput} autoCapitalize="none" autoCorrect={false} returnKeyType="next"/>
                    <TextField label={t('mobile.support.messageLabel')} placeholder={t('mobile.support.messagePlaceholder')}
                               value={message} onChangeText={setMessage} multiline/>
                    {formError ? <AppText variant="small" style={styles.errorText}>{formError}</AppText> : null}
                    <Button label={t('mobile.support.startButton')} icon={Send} loading={startThread.isPending} onPress={handleStartInquiry}/>
                </Card>
            ) : (
                <>
                    <Card>
                        <View style={styles.sessionHeader}>
                            <AppText variant="title" style={styles.flex}>{t('mobile.support.sessionTitle', {code: session.code})}</AppText>
                            {statusTone ? <Badge label={statusTone.label} background={statusTone.background} color={statusTone.color}/> : null}
                        </View>
                        <View style={styles.sessionMeta}>
                            <Badge label={formatSupportTopic(session.topic)} background={colors.slateLight} color={colors.slateDark}/>
                            <AppText variant="caption" numberOfLines={1} style={styles.flex}>{session.contactInfo}</AppText>
                        </View>
                        <Button label={t('mobile.support.newSessionButton')} tone="secondary" icon={RotateCcw} onPress={() => void handleResetSession()}/>
                    </Card>

                    <Card style={styles.threadCard}>
                        {session.messages.map(msg => (
                            <SupportMessageBubble key={msg.id} message={msg} youLabel={t('mobile.support.youSender')} adminFallback={t('mobile.support.adminSender')}/>
                        ))}
                    </Card>

                    <Card>
                        <TextField label={t('mobile.support.messageLabel')} placeholder={t('mobile.support.replyPlaceholder')}
                                   value={draft} onChangeText={setDraft} multiline error={replyError}/>
                        <Button label={t('mobile.support.sendButton')} icon={Send} loading={sendMessage.isPending}
                                disabled={!draft.trim() || sendMessage.isPending} onPress={handleSendReply}/>
                    </Card>
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    heroCard: {borderColor: colors.primary, backgroundColor: colors.primaryLight, gap: spacing.xs},
    topicSection: {gap: spacing.xs},
    topicLabel: {fontSize: font.small, fontWeight: '600', color: colors.text},
    errorText: {color: colors.danger},
    sessionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    sessionMeta: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    threadCard: {gap: spacing.md},
    bubbleWrap: {maxWidth: '88%', gap: 4},
    bubbleWrapVisitor: {alignSelf: 'flex-end', alignItems: 'flex-end'},
    bubbleWrapAdmin: {alignSelf: 'flex-start', alignItems: 'flex-start'},
    bubbleMeta: {fontSize: font.caption, color: colors.muted},
    bubble: {borderRadius: radius.card, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
    bubbleVisitor: {backgroundColor: colors.primary, borderBottomRightRadius: spacing.xs},
    bubbleAdmin: {backgroundColor: colors.slateLight, borderBottomLeftRadius: spacing.xs},
    bubbleVisitorText: {color: colors.white},
    bubbleAdminText: {color: colors.text},
});
