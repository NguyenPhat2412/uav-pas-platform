import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ArrowLeft, ArrowRight, CheckCircle2, FolderKanban, MapPin, Plus} from 'lucide-react-native';
import {
    isoDatePlusDays,
    SubscriptionScheduleConfirmCard,
    SubscriptionWizardStepper,
    type WizardStep,
} from '@/components/marketplace/catalog/SubscriptionScheduleConfirmCard';
import {ProjectZoneMapField} from '@/components/project/ProjectZoneMapField';
import {
    AppText,
    Button,
    Card,
    EmptyState,
    ErrorState,
    LoadingState,
    Screen,
    SectionTitle,
    TextField,
} from '@/components/ui';
import {usePublicListingDetail} from '@/hooks/useMarketplaceCatalog';
import {useProjectList, useProjectMutations} from '@/hooks/useProjects';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {extractActionableError} from '@/shared/forms/marketplace-forms';
import {validateProjectInput, validateSubscriptionBooking} from '@/shared/forms/project-form';
import type {CustomerProject, ProjectScheduleType} from '@/shared/types/project.types';
import {cleanEntityName} from '@/utils/clean-text';
import {colors, radius, spacing} from '@/styles/tokens';

/**
 * 3-step "Đăng ký cho dự án" Wizard (UI-GUIDE §3.4 & S1-mobile.md #4):
 * Step 1: Select existing project or quick-create inline (`ErrorState` on 404 with retry)
 * Step 2: Draw polygon / GPS flight zone (`ProjectZoneMapField`)
 * Step 3: Pick cadence, start date, units & confirm (`POST /api/v1/projects/{id}/subscriptions`)
 */
export function ProjectSubscriptionWizardScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ slug?: string; units?: string }>();

    const listingQuery = usePublicListingDetail(params.slug);
    const projectsQuery = useProjectList();
    const mutations = useProjectMutations();

    const [step, setStep] = useState<WizardStep>(1);
    const [selectedProject, setSelectedProject] = useState<CustomerProject | null>(null);
    const [showInlineCreate, setShowInlineCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newProvince, setNewProvince] = useState('Hà Nội');
    const [areaGeoJson, setAreaGeoJson] = useState('');
    const [scheduleType, setScheduleType] = useState<ProjectScheduleType>('ONCE');
    const [startDate, setStartDate] = useState(() => isoDatePlusDays(1));
    const [unitsInput, setUnitsInput] = useState(() => params.units || '1');

    if (listingQuery.isPending) {
        return (
            <Screen>
                <LoadingState label={t('services.loading')}/>
            </Screen>
        );
    }

    const listing = listingQuery.data?.listing;
    if (listingQuery.isError || !listing) {
        return (
            <Screen>
                <ErrorState
                    message={t('mobile.marketplace.listingNotFound')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void listingQuery.refetch()}
                />
            </Screen>
        );
    }

    const projects = projectsQuery.data?.content ?? [];
    const activeProject = selectedProject ?? projects[0] ?? null;

    const handleSelectProject = (project: CustomerProject) => {
        setSelectedProject(project);
        if (!areaGeoJson && project.areaGeoJson) {
            setAreaGeoJson(project.areaGeoJson);
        }
    };

    const handleInlineCreate = () => {
        const err = validateProjectInput({name: newName, province: newProvince});
        if (err) {
            toast.show(t('mobile.provider.saveError'), 'error');
            return;
        }
        mutations.createProject.mutate(
            {name: newName.trim(), province: newProvince.trim()},
            {
                onSuccess: created => {
                    setSelectedProject(created);
                    setShowInlineCreate(false);
                    setNewName('');
                    toast.show(t('mobile.overnight.projectSavedToast'), 'success');
                },
                onError: e =>
                    toast.show(extractActionableError(e, t('mobile.provider.saveError')), 'error'),
            },
        );
    };

    const handleNextOrSubmit = () => {
        if (step === 1) {
            if (!activeProject) {
                toast.show(t('mobile.overnight.selectProjectRequired'), 'error');
                return;
            }
            if (!areaGeoJson && activeProject.areaGeoJson) {
                setAreaGeoJson(activeProject.areaGeoJson);
            }
            setStep(2);
            return;
        }
        if (step === 2) {
            if (!areaGeoJson.trim()) {
                toast.show(t('mobile.overnight.zoneRequired'), 'error');
                return;
            }
            setStep(3);
            return;
        }

        if (!activeProject) return;
        const minUnits = Number(listing.minBookingUnits || 1);
        const units = Math.max(minUnits, Number(unitsInput) || minUnits);
        const payload = {
            listingId: listing.id,
            areaGeoJson,
            scheduleType,
            startDate,
            units,
            locationName: activeProject.province,
        };
        const checkErr = validateSubscriptionBooking(payload);
        if (checkErr) {
            toast.show(t('mobile.provider.saveError'), 'error');
            return;
        }

        mutations.createSubscription.mutate(
            {
                projectId: activeProject.id,
                payload,
            },
            {
                onSuccess: () => {
                    toast.show(t('mobile.overnight.subCreatedToast'), 'success');
                    router.replace({
                        pathname: '/customer/projects/[id]',
                        params: {id: String(activeProject.id)},
                    });
                },
                onError: e =>
                    toast.show(extractActionableError(e, t('mobile.provider.saveError')), 'error'),
            },
        );
    };

    return (
        <View style={styles.root}>
            <Screen contentStyle={styles.scrollPad}>
                <SubscriptionWizardStepper step={step} onSelectStep={setStep}/>

                {step === 1 ? (
                    <>
                        <SectionTitle title={t('mobile.overnight.pickProjectTitle')}/>
                        {projectsQuery.isPending && !projectsQuery.data ? (
                            <LoadingState label={t('mobile.overnight.projectsLoading')}/>
                        ) : projectsQuery.isError ? (
                            <ErrorState
                                message={t('mobile.overnight.projectsLoadError')}
                                retryLabel={t('common.retry')}
                                onRetry={() => void projectsQuery.refetch()}
                            />
                        ) : projects.length === 0 ? (
                            <EmptyState
                                icon={FolderKanban}
                                message={t('mobile.overnight.projectsEmpty')}
                                action={
                                    <Button
                                        size="sm"
                                        icon={Plus}
                                        label={t('mobile.overnight.createFirstProjectBtn')}
                                        onPress={() => setShowInlineCreate(true)}
                                    />
                                }
                            />
                        ) : (
                            projects.map(proj => {
                                const chosen = activeProject?.id === proj.id;
                                return (
                                    <Pressable
                                        key={proj.id}
                                        accessibilityRole="radio"
                                        accessibilityLabel={`${cleanEntityName(proj.name)}, ${proj.province}`}
                                        accessibilityState={{checked: chosen}}
                                        onPress={() => handleSelectProject(proj)}
                                        style={[styles.projectOption, chosen && styles.projectOptionChosen]}>
                                        <FolderKanban size={20} color={chosen ? colors.primary : colors.slate}/>
                                        <View style={styles.flex}>
                                            <AppText variant="title" numberOfLines={1}>
                                                {cleanEntityName(proj.name)}
                                            </AppText>
                                            <View style={styles.metaRow}>
                                                <MapPin size={12} color={colors.slate}/>
                                                <AppText variant="caption" numberOfLines={1}>
                                                    {proj.province}
                                                </AppText>
                                            </View>
                                        </View>
                                        {chosen ? <CheckCircle2 size={18} color={colors.primary}/> : null}
                                    </Pressable>
                                );
                            })
                        )}

                        <Button
                            size="sm"
                            tone="secondary"
                            icon={Plus}
                            label={t('mobile.overnight.orCreateProjectBtn')}
                            onPress={() => setShowInlineCreate(prev => !prev)}
                        />

                        {showInlineCreate ? (
                            <Card>
                                <TextField
                                    label={t('mobile.overnight.projectNameLabel')}
                                    required
                                    placeholder={t('mobile.overnight.projectNamePlaceholder')}
                                    value={newName}
                                    onChangeText={setNewName}
                                />
                                <TextField
                                    label={t('mobile.overnight.projectProvinceLabel')}
                                    required
                                    value={newProvince}
                                    onChangeText={setNewProvince}
                                />
                                <Button
                                    size="sm"
                                    icon={CheckCircle2}
                                    loading={mutations.createProject.isPending}
                                    label={t('common.save')}
                                    onPress={handleInlineCreate}
                                />
                            </Card>
                        ) : null}
                    </>
                ) : step === 2 ? (
                    <Card>
                        <ProjectZoneMapField
                            label={t('mobile.overnight.drawAreaTitle')}
                            required
                            value={areaGeoJson}
                            onChange={setAreaGeoJson}
                        />
                    </Card>
                ) : (
                    <SubscriptionScheduleConfirmCard
                        listing={listing}
                        projectName={activeProject?.name ?? ''}
                        scheduleType={scheduleType}
                        onChangeSchedule={setScheduleType}
                        startDate={startDate}
                        onChangeStartDate={setStartDate}
                        unitsInput={unitsInput}
                        onChangeUnits={setUnitsInput}
                    />
                )}
            </Screen>

            <View style={[styles.bottomBar, {paddingBottom: Math.max(insets.bottom, spacing.sm)}]}>
                {step > 1 ? (
                    <Button
                        tone="secondary"
                        icon={ArrowLeft}
                        label={t('mobile.shop.prevStepBtn')}
                        onPress={() => setStep((step - 1) as WizardStep)}
                    />
                ) : null}
                <Button
                    icon={step === 3 ? CheckCircle2 : ArrowRight}
                    loading={mutations.createSubscription.isPending}
                    label={
                        step === 3
                            ? t('mobile.overnight.subscribeForProjectBtn')
                            : t('mobile.shop.nextStepBtn')
                    }
                    onPress={handleNextOrSubmit}
                    style={styles.flex}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1, backgroundColor: colors.canvas},
    scrollPad: {paddingBottom: spacing.xl},
    projectOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    projectOptionChosen: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    metaRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
    },
    flex: {flex: 1},
});
