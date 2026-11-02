import React from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {CheckSquare, ChevronRight, CircleCheck, GraduationCap, Play, Square} from 'lucide-react-native';
import {AppText, Badge, Button, Card, EmptyState, ErrorState, LoadingState, Screen, SectionTitle} from '@/components/ui';
import {categoryLabel, LESSON_ICONS, ProgressBar} from '@/components/training/TrainingBits';
import {MarkdownText} from '@/components/training/MarkdownText';
import {useTrainingCourse, useTrainingCourseChecklist} from '@/hooks/training/useTraining';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {courseCallToAction, courseLessonProgress, pickStartLesson} from '@/shared/utils/training/course-helpers';
import type {TrainingCourseDetail} from '@/shared/types/training/training.types';
import {colors, radius, spacing} from '@/styles/tokens';

function Checklist({course, slug, allLessonsDone}: { course: TrainingCourseDetail; slug: string; allLessonsDone: boolean }) {
    const {t} = useI18n();
    const toast = useToast();
    const mutation = useTrainingCourseChecklist(course.id, slug);
    const steps = course.checklistSteps ?? [];
    const checked = new Set(course.checkedSteps ?? []);
    if (steps.length === 0) return null;

    const toggle = (index: number) => {
        const next = new Set(checked);
        if (next.has(index)) next.delete(index); else next.add(index);
        const checkedSteps = [...next].sort((a, b) => a - b);
        mutation.mutate({checkedSteps, markCompleted: checkedSteps.length >= steps.length && allLessonsDone},
            {onError: () => toast.show(t('mobile.training.saveError'), 'error')});
    };

    return (
        <Card>
            <SectionTitle title={t('mobile.training.checklist')} action={<AppText variant="caption">{checked.size}/{steps.length}</AppText>}/>
            {steps.map((step, index) => {
                const done = checked.has(index);
                const Icon = done ? CheckSquare : Square;
                return (
                    <Pressable key={index} onPress={() => toggle(index)} disabled={mutation.isPending} accessibilityRole="checkbox"
                               accessibilityState={{checked: done, disabled: mutation.isPending}} style={({pressed}) => [styles.step, pressed && styles.pressed]}>
                        <Icon size={20} color={done ? colors.primary : colors.slate}/>
                        <AppText style={[styles.flex, done && styles.stepDone]}>{step}</AppText>
                    </Pressable>
                );
            })}
        </Card>
    );
}

/** One course: cover, progress, the curriculum by section and the practical checklist (web TrainingCoursePlayer sidebar). */
export function TrainingCourseScreen() {
    const {t} = useI18n();
    const router = useRouter();
    const {slug = ''} = useLocalSearchParams<{ slug: string }>();
    const query = useTrainingCourse(slug);
    const course = query.data;

    if (query.isPending) return <Screen><LoadingState label={t('mobile.training.loading')}/></Screen>;
    if (query.isError || !course) {
        return <Screen><ErrorState message={t('mobile.training.loadError')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()}/></Screen>;
    }

    const sections = course.sections ?? [];
    const progress = courseLessonProgress(sections);
    const startId = pickStartLesson(sections, null);
    const cta = courseCallToAction(course.status, progress.done);
    const openLesson = (id: number) => router.push({pathname: '/customer/training/lesson/[id]', params: {id: String(id), slug}});

    return (
        <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
            <Card style={styles.hero}>
                <View style={styles.cover}>
                    {course.coverUrl
                        ? <Image source={{uri: course.coverUrl}} style={styles.coverImage} resizeMode="cover" accessibilityIgnoresInvertColors/>
                        : <View style={styles.coverFallback}><GraduationCap size={40} color={colors.slate} strokeWidth={1.5}/></View>}
                </View>
                <View style={styles.heroBody}>
                    <View style={styles.badges}>
                        <Badge label={categoryLabel(t, course.category)}/>
                        {course.isMandatory && <Badge label={t('mobile.training.mandatory')} background={colors.primaryLight} color={colors.primary}/>}
                    </View>
                    <AppText variant="heading">{course.title}</AppText>
                    {course.summary ? <AppText variant="small" numberOfLines={2}>{course.summary}</AppText> : null}
                    {progress.total > 0 && (
                        <>
                            <ProgressBar percent={progress.percent} label={t('mobile.training.lessonsDone', {done: progress.done, total: progress.total})}/>
                            {cta === 'done'
                                ? <Badge label={t('mobile.training.done')} icon={CircleCheck}/>
                                : startId !== null && <Button label={t(cta === 'continue' ? 'mobile.training.continue' : 'mobile.training.start')} icon={Play} onPress={() => openLesson(startId)}/>}
                        </>
                    )}
                </View>
            </Card>

            {course.overviewMarkdown?.trim() ? <Card><MarkdownText markdown={course.overviewMarkdown}/></Card> : null}

            <SectionTitle title={t('mobile.training.curriculum')}/>
            {progress.total === 0 ? <EmptyState icon={GraduationCap} message={t('mobile.training.noLessons')}/> : sections.map((section, s) => (
                <Card key={`${section.title}-${s}`}>
                    {section.title ? <AppText variant="title">{section.title}</AppText> : null}
                    {section.lessons.map(lesson => {
                        const Icon = LESSON_ICONS[lesson.type] ?? LESSON_ICONS.ARTICLE;
                        return (
                            <Pressable key={lesson.id} onPress={() => openLesson(lesson.id)} accessibilityRole="button" accessibilityLabel={lesson.title}
                                       style={({pressed}) => [styles.lesson, pressed && styles.pressed]}>
                                <View style={[styles.lessonIcon, lesson.completed && styles.lessonIconDone]}>
                                    {lesson.completed ? <CircleCheck size={18} color={colors.white}/> : <Icon size={18} color={colors.slateDark}/>}
                                </View>
                                <View style={styles.flex}>
                                    <AppText numberOfLines={2}>{lesson.title}</AppText>
                                    <AppText variant="caption">
                                        {t(`mobile.training.types.${lesson.type}`)}
                                        {lesson.durationMinutes > 0 ? ` · ${t('mobile.training.minutes', {minutes: lesson.durationMinutes})}` : ''}
                                    </AppText>
                                </View>
                                <ChevronRight size={18} color={colors.muted}/>
                            </Pressable>
                        );
                    })}
                </Card>
            ))}

            <Checklist course={course} slug={slug} allLessonsDone={progress.total > 0 && progress.done >= progress.total}/>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    pressed: {opacity: 0.7},
    hero: {padding: 0, overflow: 'hidden', gap: 0},
    cover: {aspectRatio: 16 / 9, backgroundColor: colors.slateLight},
    coverImage: {width: '100%', height: '100%'},
    coverFallback: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    heroBody: {padding: spacing.lg, gap: spacing.sm},
    badges: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    lesson: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm},
    lessonIcon: {width: 36, height: 36, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center'},
    lessonIconDone: {backgroundColor: colors.slateDark},
    step: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xs},
    stepDone: {color: colors.textSecondary, textDecorationLine: 'line-through'},
});
