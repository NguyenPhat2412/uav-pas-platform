import React, {useState} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {Save} from 'lucide-react-native';
import {ProjectZoneMapField} from '@/components/project/ProjectZoneMapField';
import {Button, Card, ErrorState, KeyboardAnchor, LoadingState, Screen, TextField} from '@/components/ui';
import {useProjectDetail, useProjectMutations} from '@/hooks/useProjects';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {extractActionableError} from '@/shared/forms/marketplace-forms';
import {validateProjectInput} from '@/shared/forms/project-form';
import type {CustomerProject} from '@/shared/types/project.types';

function ProjectFormBody({project}: { project?: CustomerProject }) {
    const {t} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const mutations = useProjectMutations();

    const [name, setName] = useState(project?.name ?? '');
    const [province, setProvince] = useState(project?.province ?? 'Hà Nội');
    const [note, setNote] = useState(project?.note ?? '');
    const [areaGeoJson, setAreaGeoJson] = useState(project?.areaGeoJson ?? '');

    const busy = mutations.createProject.isPending || mutations.updateProject.isPending;

    const handleSubmit = async () => {
        const payload = {
            name: name.trim(),
            province: province.trim(),
            note: note.trim() || null,
            areaGeoJson: areaGeoJson.trim() || null,
        };
        const errCode = validateProjectInput(payload);
        if (errCode) {
            toast.show(t('missionForm.checkErrors'), 'error');
            return;
        }
        try {
            if (project) {
                await mutations.updateProject.mutateAsync({id: project.id, payload});
                toast.show(t('mobile.overnight.projectSavedToast'), 'success');
                router.back();
            } else {
                const created = await mutations.createProject.mutateAsync(payload);
                toast.show(t('mobile.overnight.projectSavedToast'), 'success');
                router.replace({
                    pathname: '/customer/projects/[id]',
                    params: {id: String(created.id)},
                });
            }
        } catch (err) {
            toast.show(extractActionableError(err, t('mobile.provider.saveError')), 'error');
        }
    };

    return (
        <Screen>
            <Card>
                <TextField
                    label={t('mobile.overnight.projectNameLabel')}
                    required
                    placeholder={t('mobile.overnight.projectNamePlaceholder')}
                    value={name}
                    onChangeText={setName}
                    maxLength={160}
                />
                <TextField
                    label={t('mobile.overnight.projectProvinceLabel')}
                    required
                    value={province}
                    onChangeText={setProvince}
                    maxLength={100}
                />
                <TextField
                    label={t('mobile.overnight.projectNoteLabel')}
                    optional
                    value={note}
                    onChangeText={setNote}
                    multiline
                    maxLength={1000}
                />
            </Card>

            <Card>
                <ProjectZoneMapField
                    label={t('mobile.overnight.drawAreaTitle')}
                    optional
                    value={areaGeoJson}
                    onChange={setAreaGeoJson}
                />
            </Card>

            <KeyboardAnchor>
                <Button
                    icon={Save}
                    loading={busy}
                    label={t('common.save')}
                    onPress={() => void handleSubmit()}
                />
            </KeyboardAnchor>
        </Screen>
    );
}

export function ProjectCreateScreen() {
    return <ProjectFormBody/>;
}

export function ProjectEditScreen() {
    const {t} = useI18n();
    const {id} = useLocalSearchParams<{ id: string }>();
    const detail = useProjectDetail(Number(id));

    if (detail.isPending) {
        return (
            <Screen>
                <LoadingState label={t('missionDetail.loading')}/>
            </Screen>
        );
    }
    if (detail.isError || !detail.data) {
        return (
            <Screen>
                <ErrorState
                    message={t('missionDetail.loadError')}
                    retryLabel={t('common.retry')}
                    onRetry={() => void detail.refetch()}
                />
            </Screen>
        );
    }
    return <ProjectFormBody project={detail.data}/>;
}
