import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {usePathname, useRouter} from 'expo-router';
import {CircleCheck, GraduationCap} from 'lucide-react-native';
import {AppText, Badge, Card, ChipGroup, EmptyState, ErrorState, LoadingState, Screen, TextField} from '@/components/ui';
import {categoryLabel, clampPercent, ProgressBar} from '@/components/training/TrainingBits';
import {useTrainingCourses} from '@/hooks/training/useTraining';
import {useI18n} from '@/providers/I18nContext';
import {courseCallToAction, matchesCourseSearch} from '@/shared/utils/training/course-helpers';
import type {TrainingCourseSummary} from '@/shared/types/training/training.types';
import {colors, radius, spacing} from '@/styles/tokens';

function CourseCard({course, onPress}: { course: TrainingCourseSummary; onPress: () => void }) {
    const {t} = useI18n();
    const cta = courseCallToAction(course.status, course.completedLessons);
    const percent = clampPercent(course.progressPercent);
    const empty = (course.lessonCount ?? 0) === 0;
    const documents = course.documentCount ?? 0;
    return (
        <Card onPress={onPress} accessibilityLabel={course.title} style={styles.card}>
            <View style={styles.cover}>
                {course.coverUrl
                    ? <Image source={{uri: course.coverUrl}} style={styles.coverImage} resizeMode="cover" accessibilityIgnoresInvertColors/>
                    : (
                        <View style={styles.coverFallback}>
                            <GraduationCap size={32} color={colors.slate} strokeWidth={1.5}/>
                            <AppText variant="caption">{categoryLabel(t, course.category)}</AppText>
                        </View>
                    )}
                {course.isMandatory && <View style={styles.mandatory}><Badge label={t('mobile.training.mandatory')} background={colors.surface} color={colors.primary}/></View>}
            </View>
            <View style={styles.body}>
                <AppText variant="title" numberOfLines={2}>{course.title}</AppText>
                {course.summary ? <AppText variant="small" numberOfLines={1}>{course.summary}</AppText> : null}
                {empty ? <AppText variant="caption">{t('mobile.training.noLessons')}</AppText> : (
                    <>
                        <AppText variant="caption">
                            {t('mobile.training.meta', {lessons: course.lessonCount, minutes: course.estimatedMinutes})}
                            {documents > 0 ? ` · ${t('mobile.training.documents', {count: documents})}` : ''}
                        </AppText>
                        {cta === 'continue' && <ProgressBar percent={percent} label={`${percent}%`}/>}
                        {cta === 'done'
                            ? <Badge label={t('mobile.training.done')} icon={CircleCheck}/>
                            : <AppText style={styles.cta}>{t(cta === 'continue' ? 'mobile.training.continue' : 'mobile.training.start')}</AppText>}
                    </>
                )}
            </View>
        </Card>
    );
}

/** The customer course catalogue: search, topic chips and one card per course (web TrainingCourseCatalog). */
export function TrainingCatalogScreen() {
    const {t} = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const coursePathname = pathname.startsWith('/operations') ? '/operations/training/[slug]' : '/customer/training/[slug]';
    const query = useTrainingCourses();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('ALL');
    const courses = useMemo(() => query.data ?? [], [query.data]);
    const categories = useMemo(() => Array.from(new Set(courses.map(course => course.category))), [courses]);
    const visible = courses.filter(course => (category === 'ALL' || course.category === category) && matchesCourseSearch(course, search));
    const completed = courses.filter(course => course.status === 'COMPLETED').length;

    return (
        <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
            {courses.length > 0 && <AppText variant="caption">{t('mobile.training.completedCount', {done: completed, total: courses.length})}</AppText>}
            {courses.length > 0 && (
                <>
                    <TextField label={t('mobile.training.search')} placeholder={t('mobile.training.search')} value={search} onChangeText={setSearch}
                               autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search"/>
                    {categories.length > 1 && (
                        <ChipGroup value={category} onChange={setCategory}
                                   options={[{value: 'ALL', label: t('mobile.training.all')}, ...categories.map(value => ({value, label: categoryLabel(t, value)}))]}/>
                    )}
                </>
            )}
            {query.isPending ? <LoadingState label={t('mobile.training.loading')}/>
                : query.isError ? <ErrorState message={t('mobile.training.loadError')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()}/>
                    : visible.length === 0 ? <EmptyState icon={GraduationCap} message={t(courses.length === 0 ? 'mobile.training.empty' : 'mobile.training.noMatch')}/>
                        : visible.map(course => (
                            <CourseCard key={course.id} course={course}
                                        onPress={() => router.push({pathname: coursePathname, params: {slug: course.slug}})}/>
                        ))}
        </Screen>
    );
}

const styles = StyleSheet.create({
    card: {padding: 0, overflow: 'hidden', gap: 0},
    cover: {aspectRatio: 16 / 9, backgroundColor: colors.slateLight},
    coverImage: {width: '100%', height: '100%'},
    coverFallback: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm},
    mandatory: {position: 'absolute', top: spacing.sm, left: spacing.sm, borderRadius: radius.control},
    body: {padding: spacing.lg, gap: spacing.sm},
    cta: {color: colors.primary, fontWeight: '600'},
});
