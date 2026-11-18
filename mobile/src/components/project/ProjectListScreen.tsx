import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {ChevronRight, FolderKanban, Layers, MapPin, PackageCheck, Plus} from 'lucide-react-native';
import {GuestPromptCard} from '@/components/auth/GuestPromptCard';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {
    AppText,
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    TextField,
} from '@/components/ui';
import {useProjectList} from '@/hooks/project/useProjects';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

/**
 * Customer Projects Tab Screen (`GET /api/v1/projects`, S1-mobile.md #3):
 * lists projects with subscription & order badges, search, pull-to-refresh,
 * `LoadingState` skeleton, `ErrorState` on 404/error with retry, and empty state CTA.
 */
export function ProjectListScreen() {
    const {t} = useI18n();
    const {status} = useAuth();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const query = useProjectList(search);

    if (status !== 'signed-in') {
        return (
            <Screen>
                <GuestPromptCard
                    icon={FolderKanban}
                    title={t('mobile.overnight.projectPromoTitle')}
                    description={t('mobile.overnight.projectPromoSub')}
                />
            </Screen>
        );
    }

    const projects = query.data?.content ?? [];

    return (
        <Screen
            onRefresh={() => void query.refetch()}
            refreshing={query.isRefetching}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <HeaderIconButton
                            icon={Plus}
                            label={t('mobile.overnight.newProjectBtn')}
                            onPress={() => router.push('/customer/projects/create')}
                        />
                    ),
                }}
            />

            <TextField
                placeholder={t('mobile.overnight.projectNamePlaceholder')}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
            />

            {query.isPending && !query.data ? (
                <LoadingState label={t('mobile.overnight.projectsLoading')}/>
            ) : query.isError && projects.length === 0 ? (
                <ErrorState
                    message={t('mobile.overnight.projectsLoadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void query.refetch()}
                />
            ) : projects.length === 0 ? (
                <EmptyState
                    icon={FolderKanban}
                    message={t('mobile.overnight.projectsEmpty')}
                    action={
                        <Button
                            icon={Plus}
                            label={t('mobile.overnight.createFirstProjectBtn')}
                            onPress={() => router.push('/customer/projects/create')}
                        />
                    }
                />
            ) : (
                projects.map(project => (
                    <Card
                        key={project.id}
                        onPress={() =>
                            router.push({
                                pathname: '/customer/projects/[id]',
                                params: {id: String(project.id)},
                            })
                        }
                        accessibilityLabel={project.name}>
                        <View style={styles.row}>
                            <View style={styles.iconBox}>
                                <FolderKanban size={20} color={colors.primary}/>
                            </View>
                            <View style={styles.flex}>
                                <AppText variant="title" numberOfLines={2}>
                                    {project.name}
                                </AppText>
                                <View style={styles.metaRow}>
                                    <MapPin size={13} color={colors.slate}/>
                                    <AppText variant="caption" numberOfLines={1} style={styles.flex}>
                                        {project.province}
                                    </AppText>
                                </View>
                            </View>
                            <ChevronRight size={18} color={colors.muted}/>
                        </View>

                        <View style={styles.badgeRow}>
                            <Badge
                                icon={Layers}
                                label={t('mobile.overnight.projectSubsCount', {
                                    count: project.activeSubscriptionCount ?? 0,
                                })}
                                background={colors.primaryLight}
                                color={colors.primary}
                            />
                            <Badge
                                icon={PackageCheck}
                                label={t('mobile.overnight.projectOrdersCount', {
                                    count: project.missionCount ?? 0,
                                })}
                                background={colors.slateLight}
                                color={colors.slateDark}
                            />
                        </View>
                    </Card>
                ))
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: radius.card,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: 2},
    flex: {flex: 1},
});
