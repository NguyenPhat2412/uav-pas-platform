import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, Image, Pressable, StyleSheet, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {useEventListener} from 'expo';
import {useVideoPlayer, VideoView, type VideoPlayer} from 'expo-video';
import {ChevronLeft, ChevronRight, CircleCheck, Download, ExternalLink, FileText, PlayCircle} from 'lucide-react-native';
import {AppText, Badge, Button, Card, ErrorState, LoadingState, Screen, SectionTitle} from '@/components/ui';
import {LESSON_ICONS} from '@/components/training/TrainingBits';
import {MarkdownText} from '@/components/training/MarkdownText';
import {useTrainingLesson, useTrainingLessonProgress} from '@/hooks/training/useTraining';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {formatFileSize, isLastSlide, isPositionSaveDue, isVideoWatched, resumePosition, slideCounter} from '@/shared/utils/training/course-helpers';
import type {TrainingLessonDetail, TrainingLessonSlide, UpdateTrainingLessonProgressPayload} from '@/shared/types/training/training.types';
import {colors, radius, spacing} from '@/styles/tokens';

type Save = (payload: UpdateTrainingLessonProgressPayload) => void;

function seek(player: VideoPlayer, seconds: number) {
    player.currentTime = seconds;
}

/** An uploaded video: resumes where the learner stopped, saves the position every 15 s and completes at 90 %. */
function VideoLesson({url, lesson, onSave}: { url: string; lesson: TrainingLessonDetail; onSave: Save }) {
    const player = useVideoPlayer(url, created => {
        created.timeUpdateEventInterval = 1;
    });
    const completedRef = useRef(lesson.completed);
    const lastSavedAt = useRef(0);
    const position = useRef(lesson.positionSeconds ?? 0);

    useEventListener(player, 'sourceLoad', ({duration}) => {
        const start = resumePosition(lesson.positionSeconds ?? 0, duration);
        if (start > 0) seek(player, start);
    });
    useEventListener(player, 'timeUpdate', ({currentTime}) => {
        position.current = currentTime;
        if (!completedRef.current && isVideoWatched(currentTime, player.duration)) {
            completedRef.current = true;
            lastSavedAt.current = Date.now();
            onSave({completed: true, positionSeconds: Math.floor(currentTime)});
        } else if (isPositionSaveDue(lastSavedAt.current, Date.now()) && player.playing) {
            lastSavedAt.current = Date.now();
            onSave({positionSeconds: Math.floor(currentTime)});
        }
    });
    // Leaving the lesson keeps the place, as closing the tab does on the web.
    const saveOnLeave = useRef(onSave);
    useEffect(() => {
        saveOnLeave.current = onSave;
    }, [onSave]);
    useEffect(() => {
        lastSavedAt.current = Date.now();
        return () => {
            if (position.current > 0) saveOnLeave.current({positionSeconds: Math.floor(position.current)});
        };
    }, []);

    return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls allowsPictureInPicture/>;
}

/** A slide deck, one image per page; reaching the last slide completes the lesson. */
function SlidesLesson({slides, onReachedEnd}: { slides: TrainingLessonSlide[]; onReachedEnd: () => void }) {
    const [width, setWidth] = useState(0);
    const [index, setIndex] = useState(0);
    const reported = useRef(false);
    const list = useRef<FlatList<TrainingLessonSlide>>(null);

    useEffect(() => {
        if (!reported.current && isLastSlide(index, slides.length)) {
            reported.current = true;
            onReachedEnd();
        }
    }, [index, slides.length, onReachedEnd]);

    const go = (next: number) => {
        const target = Math.min(Math.max(next, 0), slides.length - 1);
        list.current?.scrollToIndex({index: target, animated: true});
        setIndex(target);
    };

    return (
        <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.slides}>
            {width > 0 && (
                <FlatList ref={list} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(_, n) => String(n)}
                          getItemLayout={(_, n) => ({length: width, offset: width * n, index: n})}
                          onMomentumScrollEnd={event => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
                          renderItem={({item}) => (
                              <View style={{width}}>
                                  <View style={styles.slideFrame}>
                                      {item.url ? <Image source={{uri: item.url}} style={styles.slideImage} resizeMode="contain" accessibilityIgnoresInvertColors/> : null}
                                  </View>
                                  {item.caption ? <AppText variant="small" style={styles.caption}>{item.caption}</AppText> : null}
                              </View>
                          )}/>
            )}
            <View style={styles.slideNav}>
                <Pressable onPress={() => go(index - 1)} disabled={index === 0} accessibilityRole="button" hitSlop={8} style={index === 0 && styles.disabled}>
                    <ChevronLeft size={24} color={colors.slateDark}/>
                </Pressable>
                <AppText variant="small">{slideCounter(index, slides.length)}</AppText>
                <Pressable onPress={() => go(index + 1)} disabled={isLastSlide(index, slides.length)} accessibilityRole="button" hitSlop={8}
                           style={isLastSlide(index, slides.length) && styles.disabled}>
                    <ChevronRight size={24} color={colors.slateDark}/>
                </Pressable>
            </View>
        </View>
    );
}

function OpenRow({icon: Icon, title, detail, url}: { icon: typeof FileText; title: string; detail?: string; url: string }) {
    return (
        <Pressable onPress={() => void WebBrowser.openBrowserAsync(url)} accessibilityRole="link" accessibilityLabel={title}
                   style={({pressed}) => [styles.openRow, pressed && styles.pressed]}>
            <View style={styles.openIcon}><Icon size={18} color={colors.slateDark}/></View>
            <View style={styles.flex}>
                <AppText numberOfLines={2}>{title}</AppText>
                {detail ? <AppText variant="caption">{detail}</AppText> : null}
            </View>
            <ExternalLink size={16} color={colors.muted}/>
        </Pressable>
    );
}

function LessonContent({lesson, onSave}: { lesson: TrainingLessonDetail; onSave: Save }) {
    const {t} = useI18n();
    const completeAtEnd = useCallback(() => {
        if (!lesson.completed) onSave({completed: true, positionSeconds: 0});
    }, [lesson.completed, onSave]);

    if (lesson.type === 'VIDEO' && lesson.video?.url) {
        return lesson.video.kind === 'FILE'
            ? <VideoLesson url={lesson.video.url} lesson={lesson} onSave={onSave}/>
            : <Button label={t('mobile.training.openVideo')} icon={PlayCircle} tone="secondary" onPress={() => void WebBrowser.openBrowserAsync(lesson.video!.url!)}/>;
    }
    if (lesson.type === 'SLIDES' && lesson.slides.length > 0) return <SlidesLesson slides={lesson.slides} onReachedEnd={completeAtEnd}/>;
    if (lesson.type === 'DOCUMENT' && lesson.document?.url) {
        const file = lesson.document.kind === 'EMBED' ? null : lesson.document;
        return <Card><OpenRow icon={FileText} title={file?.fileName || t('mobile.training.openDocument')} detail={file ? formatFileSize(file.size) : undefined} url={lesson.document.url}/></Card>;
    }
    if (lesson.type === 'ARTICLE' && lesson.bodyMarkdown?.trim()) return null;
    return <AppText variant="small">{t('mobile.training.noContent')}</AppText>;
}

const MANUAL_LABEL = {ARTICLE: 'mobile.training.markDone', DOCUMENT: 'mobile.training.markRead', VIDEO: 'mobile.training.markWatched', SLIDES: 'mobile.training.markDone'} as const;

/** One lesson: its video, slides, article or document, attachments, completion and the way to the next lesson. */
export function TrainingLessonScreen() {
    const {t} = useI18n();
    const toast = useToast();
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string; slug?: string }>();
    const lessonId = Number(params.id);
    const query = useTrainingLesson(lessonId);
    const lesson = query.data;
    const progress = useTrainingLessonProgress(params.slug || lesson?.courseSlug || '');
    const {mutate} = progress;
    const wasCompleted = lesson?.completed ?? false;

    const save = useCallback<Save>(payload => {
        mutate({id: lessonId, payload, wasCompleted}, payload.completed ? {onError: () => toast.show(t('mobile.training.saveError'), 'error')} : undefined);
    }, [mutate, lessonId, wasCompleted, toast, t]);

    if (query.isPending) return <Screen><LoadingState label={t('mobile.training.lessonLoading')}/></Screen>;
    if (query.isError || !lesson) {
        return <Screen><ErrorState message={t('mobile.training.lessonLoadError')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()}/></Screen>;
    }

    const Icon = LESSON_ICONS[lesson.type] ?? LESSON_ICONS.ARTICLE;
    const automatic = (lesson.type === 'VIDEO' && lesson.video?.kind === 'FILE') || lesson.type === 'SLIDES';
    const resources = (lesson.resources ?? []).filter(resource => !!resource.url);
    const openLesson = (id: number) => router.replace({pathname: '/customer/training/lesson/[id]', params: {id: String(id), slug: params.slug ?? lesson.courseSlug}});

    return (
        <Screen>
            <View style={styles.titleRow}>
                <View style={styles.openIcon}><Icon size={18} color={colors.slateDark}/></View>
                <View style={styles.flex}>
                    <AppText variant="title">{lesson.title}</AppText>
                    <AppText variant="caption">
                        {t(`mobile.training.types.${lesson.type}`)}
                        {lesson.durationMinutes > 0 ? ` · ${t('mobile.training.minutes', {minutes: lesson.durationMinutes})}` : ''}
                    </AppText>
                </View>
            </View>

            <LessonContent key={lesson.id} lesson={lesson} onSave={save}/>
            {lesson.bodyMarkdown?.trim() ? <Card><MarkdownText markdown={lesson.bodyMarkdown}/></Card> : null}

            {resources.length > 0 && (
                <Card>
                    <SectionTitle title={t('mobile.training.resources')}/>
                    {resources.map((resource, index) => (
                        <OpenRow key={index} icon={Download} title={resource.title} detail={formatFileSize(resource.size)} url={resource.url!}/>
                    ))}
                </Card>
            )}

            {lesson.completed ? <Badge label={t('mobile.training.completed')} icon={CircleCheck}/>
                : automatic ? <AppText variant="caption">{t(lesson.type === 'SLIDES' ? 'mobile.training.autoSlides' : 'mobile.training.autoVideo')}</AppText>
                    : <Button label={t(MANUAL_LABEL[lesson.type] ?? 'mobile.training.markDone')} icon={CircleCheck} loading={progress.isPending}
                              onPress={() => save({completed: true, positionSeconds: lesson.positionSeconds ?? 0})}/>}

            <View style={styles.pager}>
                <Button label={t('mobile.training.prev')} icon={ChevronLeft} tone="secondary" style={styles.flex}
                        disabled={lesson.prevLessonId == null} onPress={() => lesson.prevLessonId != null && openLesson(lesson.prevLessonId)}/>
                <Button label={t('mobile.training.next')} icon={ChevronRight} tone="secondary" style={styles.flex}
                        disabled={lesson.nextLessonId == null} onPress={() => lesson.nextLessonId != null && openLesson(lesson.nextLessonId)}/>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    pressed: {opacity: 0.7},
    disabled: {opacity: 0.3},
    titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    video: {width: '100%', aspectRatio: 16 / 9, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.text},
    slides: {gap: spacing.sm},
    slideFrame: {aspectRatio: 16 / 9, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.slateLight},
    slideImage: {width: '100%', height: '100%'},
    caption: {marginTop: spacing.sm, textAlign: 'center'},
    slideNav: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl},
    openRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs},
    openIcon: {width: 36, height: 36, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center'},
    pager: {flexDirection: 'row', gap: spacing.md},
});
