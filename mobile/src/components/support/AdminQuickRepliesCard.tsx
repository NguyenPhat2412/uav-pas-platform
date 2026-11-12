import React, {useState} from 'react';
import {Alert, Pressable, StyleSheet, View} from 'react-native';
import {Plus, Trash2, Zap} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ChipGroup, LoadingState, SectionTitle, TextField} from '@/components/ui';
import {signInErrorText} from '@/forms/auth/sign-in-flow';
import {useAdminQuickReplies, useAdminSupportMutations} from '@/hooks/support/useAdminSupportMobile';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import type {SupportQuickReply, SupportTopic} from '@/shared/types/support/support.types';
import {formatSupportTopic, SUPPORT_TOPIC_OPTIONS} from '@/shared/utils/support/support-format';
import {colors, radius, spacing} from '@/styles/tokens';

const TOPIC_OPTIONS: { value: SupportTopic; label: string }[] = SUPPORT_TOPIC_OPTIONS.map(option => ({
    value: option.value,
    label: option.label,
}));

export function AdminQuickRepliesCard() {
    const {t} = useI18n();
    const toast = useToast();
    const quickRepliesQuery = useAdminQuickReplies();
    const mutations = useAdminSupportMutations();

    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState<SupportTopic>('GENERAL_SUPPORT');
    const [content, setContent] = useState('');

    const showError = (error: unknown) => toast.show(signInErrorText(error, t), 'error');
    const templates = quickRepliesQuery.data ?? [];
    const canSave = title.trim().length > 0 && content.trim().length > 0;

    const handleCreate = () => {
        if (!canSave) return;
        mutations.createQuickReply.mutate(
            {
                title: title.trim(),
                topic,
                content: content.trim(),
                sortOrder: templates.length + 1,
            },
            {
                onSuccess: () => {
                    setTitle('');
                    setContent('');
                    toast.show(t('mobile.support.templateSavedToast'), 'success');
                },
                onError: showError,
            },
        );
    };

    const confirmDelete = (item: SupportQuickReply) => {
        Alert.alert(t('mobile.support.deleteTemplateConfirm'), item.title, [
            {text: t('common.cancel'), style: 'cancel'},
            {
                text: t('common.confirm'),
                style: 'destructive',
                onPress: () => {
                    mutations.deleteQuickReply.mutate(item.id, {
                        onSuccess: () => toast.show(t('mobile.support.templateDeletedToast'), 'info'),
                        onError: showError,
                    });
                },
            },
        ]);
    };

    return (
        <Card style={styles.card}>
            <SectionTitle
                title={t('mobile.support.manageTemplates')}
                action={<Badge label={String(templates.length)} icon={Zap} background={colors.primaryLight} color={colors.primary}/>}
            />

            {quickRepliesQuery.isPending ? (
                <LoadingState label={t('common.loading')}/>
            ) : (
                <View style={styles.list}>
                    {templates.map(item => (
                        <View key={item.id} style={styles.templateItem}>
                            <View style={styles.templateHeader}>
                                <View style={styles.templateMeta}>
                                    <AppText variant="title" style={styles.templateTitle}>{item.title}</AppText>
                                    {item.topic ? (
                                        <Badge
                                            label={formatSupportTopic(item.topic)}
                                            background={colors.slateLight}
                                            color={colors.slateDark}
                                        />
                                    ) : null}
                                </View>
                                <Pressable
                                    onPress={() => confirmDelete(item)}
                                    disabled={mutations.deleteQuickReply.isPending}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${t('mobile.support.deleteTemplateConfirm')} ${item.title}`}
                                    style={({pressed}) => [styles.deleteButton, pressed && styles.pressed]}>
                                    <Trash2 size={16} color={colors.danger}/>
                                </Pressable>
                            </View>
                            <AppText variant="small" numberOfLines={3}>{item.content}</AppText>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.divider}/>

            <View style={styles.form}>
                <TextField
                    label={t('mobile.support.templateTitleLabel')}
                    placeholder={t('mobile.support.templateTitlePlaceholder')}
                    value={title}
                    onChangeText={setTitle}
                />
                <View style={styles.topicGroup}>
                    <AppText variant="small" style={styles.topicLabel}>{t('mobile.support.topicLabel')}</AppText>
                    <ChipGroup<SupportTopic> options={TOPIC_OPTIONS} value={topic} onChange={setTopic}/>
                </View>
                <TextField
                    label={t('mobile.support.templateContentLabel')}
                    placeholder={t('mobile.support.templateContentPlaceholder')}
                    value={content}
                    onChangeText={setContent}
                    multiline
                />
                <Button
                    label={t('mobile.support.addTemplateButton')}
                    icon={Plus}
                    loading={mutations.createQuickReply.isPending}
                    disabled={!canSave}
                    onPress={handleCreate}
                />
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {gap: spacing.md},
    list: {gap: spacing.sm},
    templateItem: {
        padding: spacing.md,
        borderRadius: radius.control,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.canvas,
        gap: spacing.xs,
    },
    templateHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm},
    templateMeta: {flex: 1, gap: spacing.xs},
    templateTitle: {fontWeight: '600'},
    deleteButton: {
        width: 34,
        height: 34,
        borderRadius: radius.control,
        backgroundColor: colors.dangerLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {opacity: 0.72},
    divider: {height: StyleSheet.hairlineWidth, backgroundColor: colors.border},
    form: {gap: spacing.md},
    topicGroup: {gap: spacing.xs},
    topicLabel: {fontWeight: '600', color: colors.text},
});
