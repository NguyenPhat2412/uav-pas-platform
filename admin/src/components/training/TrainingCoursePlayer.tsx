'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {ArrowLeft, PanelRightClose, PanelRightOpen, Trophy} from 'lucide-react';
import {Button} from '@/components/ui';
import {ApiError} from '@/lib/api';
import {useTrainingCourse, useTrainingLesson, useTrainingLessonProgress} from '@/hooks/training/useTraining';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import type {UpdateTrainingLessonProgressPayload} from '@/types/training/training.types';
import {STAGE_FRAME} from '@/components/training/TrainingLessonViewers';
import {TrainingPlayerCurriculumSidebar} from '@/components/training/TrainingPlayerCurriculumSidebar';
import {TrainingPlayerLessonTabs} from '@/components/training/TrainingPlayerLessonTabs';
import {
    BAR_BG,
    isDarkStage,
    TrainingCompletionControl,
    TrainingPlayerNavButton,
    TrainingPlayerStage,
} from '@/components/training/TrainingPlayerStage';
import {
    courseLessonProgress,
    flattenLessons,
    LESSON_TYPE_LABELS,
    neighbourLessons,
    parseLessonParam,
    pickStartLesson,
} from '@/utils/training/course-helpers';

/**
 * Udemy-style course player: a slim dark top bar (back, course title, progress ring), the lesson
 * stage on the left with the lesson bar and Tổng quan / Tài liệu / Checklist tabs under it, and the
 * "Nội dung khóa học" curriculum on the right (sticky, own scroll, can be hidden). The current lesson
 * lives in the URL (`?lesson=ID`) so a refresh or a shared link opens the same lesson. Mount inside
 * a Suspense boundary (it reads search params). `emptyHint` explains a course with no lessons yet
 * (the admin preview says where to add files).
 */
export function TrainingCoursePlayer({
    slug,
    backHref,
    backLabel = 'Tất cả khóa học',
    emptyHint,
}: {
    slug: string;
    backHref: string;
    backLabel?: string;
    emptyHint?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const courseQuery = useTrainingCourse(slug);
    const course = courseQuery.data;
    const sections = useMemo(() => course?.sections ?? [], [course?.sections]);

    const requestedId = parseLessonParam(searchParams.get('lesson'));
    const lessonId = useMemo(() => pickStartLesson(sections, requestedId), [sections, requestedId]);

    const hrefForLesson = useCallback((id: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('lesson', String(id));
        return `${pathname}?${params.toString()}`;
    }, [pathname, searchParams]);

    // A missing or foreign ?lesson= is replaced by the lesson actually shown, so the URL can be shared.
    useEffect(() => {
        if (lessonId !== null && lessonId !== requestedId) router.replace(hrefForLesson(lessonId), {scroll: false});
    }, [lessonId, requestedId, hrefForLesson, router]);

    const lessonQuery = useTrainingLesson(lessonId ?? 0, lessonId !== null);
    const lesson = lessonQuery.data && lessonQuery.data.id === lessonId ? lessonQuery.data : undefined;

    const progress = useTrainingLessonProgress(slug);

    // The mutation is shared by every lesson: an error from the last lesson must not follow the learner.
    const {mutate: mutateProgress, reset: resetProgress} = progress;
    useEffect(() => {
        resetProgress();
    }, [lessonId, resetProgress]);

    const saveProgress = useCallback((id: number, payload: UpdateTrainingLessonProgressPayload, wasCompleted: boolean) => {
        mutateProgress({id, payload, wasCompleted});
    }, [mutateProgress]);

    if (courseQuery.error) {
        const notFound = courseQuery.error instanceof ApiError && courseQuery.error.status === 404;
        return (
            <div className="bg-card" data-course-player>
                <TopBar backHref={backHref} backLabel={backLabel} title="Khóa học" />
                <div className="p-5">
                    {notFound ? (
                        <div className="py-12 text-center">
                            <p className="text-sm font-semibold text-foreground">Không tìm thấy khóa học</p>
                            <p className="text-xs text-muted-foreground">Khóa học đã bị ẩn hoặc không dành cho cổng này.</p>
                        </div>
                    ) : (
                        <ErrorNotice error={courseQuery.error} />
                    )}
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="bg-card" data-course-player role="status" aria-label="Đang tải khóa học">
                <TopBar backHref={backHref} backLabel={backLabel} title="" />
                <div className="flex flex-col lg:flex-row">
                    <div className="min-w-0 flex-1">
                        <div className={`${STAGE_FRAME} animate-pulse ${BAR_BG}`} />
                        <div className="space-y-2 p-5">
                            <div className="h-5 w-64 animate-pulse rounded-badge bg-surface-variant" />
                            <div className="h-3 w-32 animate-pulse rounded-badge bg-surface-variant" />
                        </div>
                    </div>
                    <div className="space-y-2 border-l border-border p-4 lg:w-[22rem] xl:w-[25rem]">
                        {[0, 1, 2, 3, 4].map(index => <div key={index} className="h-10 animate-pulse rounded-badge bg-surface-variant" />)}
                    </div>
                </div>
            </div>
        );
    }

    const nav = lessonId !== null ? neighbourLessons(sections, lessonId) : {prev: null, next: null};
    const currentItem = flattenLessons(sections).find(item => item.id === lessonId) ?? null;
    const counts = courseLessonProgress(sections);

    return (
        <div className="flex flex-col bg-card" data-course-player>
            <TopBar backHref={backHref} backLabel={backLabel} title={course.title}>
                <ProgressRing done={counts.done} total={counts.total} percent={counts.percent} />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(open => !open)}
                    aria-pressed={sidebarOpen}
                    aria-controls="course-curriculum"
                    title={sidebarOpen ? 'Ẩn nội dung khóa học' : 'Hiện nội dung khóa học'}
                    className="h-8 shrink-0 border border-white/25 px-2.5 text-white hover:bg-white/10 hover:text-white"
                >
                    {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                    <span className="hidden sm:inline">{sidebarOpen ? 'Ẩn nội dung' : 'Nội dung khóa học'}</span>
                </Button>
            </TopBar>

            <div className="flex flex-col lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                    <div className={isDarkStage(currentItem?.type) ? 'bg-black' : 'border-b border-border bg-white'}>
                        <TrainingPlayerStage
                            lessonId={lessonId}
                            expectedType={currentItem?.type}
                            lesson={lesson}
                            error={lessonQuery.error}
                            emptyHint={emptyHint}
                            onSave={saveProgress}
                        />
                    </div>

                    <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-foreground">
                                {currentItem?.title ?? (lessonId === null ? 'Chưa có bài học' : 'Đang tải bài học')}
                            </h2>
                            {currentItem && (
                                <p className="text-xs text-muted-foreground">
                                    {LESSON_TYPE_LABELS[currentItem.type]} · {currentItem.durationMinutes} phút
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {lesson && (
                                <TrainingCompletionControl
                                    lesson={lesson}
                                    saving={progress.isPending}
                                    onComplete={() => saveProgress(lesson.id, {completed: true, positionSeconds: lesson.positionSeconds ?? 0}, lesson.completed)}
                                />
                            )}
                            <TrainingPlayerNavButton href={nav.prev !== null ? hrefForLesson(nav.prev) : null} direction="prev" />
                            <TrainingPlayerNavButton href={nav.next !== null ? hrefForLesson(nav.next) : null} direction="next" />
                        </div>
                    </div>
                    {progress.error && <div className="px-5 pt-3 sm:px-8"><ErrorNotice error={progress.error} /></div>}

                    <TrainingPlayerLessonTabs
                        course={course}
                        slug={slug}
                        currentItem={currentItem}
                        lesson={lesson}
                        lessonLoading={lessonId !== null && !lesson && !lessonQuery.error}
                    />
                </div>

                {sidebarOpen && (
                    <TrainingPlayerCurriculumSidebar
                        sections={sections}
                        currentId={lessonId}
                        hrefForLesson={hrefForLesson}
                        onClose={() => setSidebarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
}

function TopBar({backHref, backLabel, title, children}: {backHref: string; backLabel: string; title: string; children?: ReactNode}) {
    return (
        <div className={`flex min-h-14 min-w-0 items-center gap-3 ${BAR_BG} px-4 py-2 text-white sm:px-5`}>
            <Link
                href={backHref}
                className="inline-flex shrink-0 items-center gap-1 rounded-control px-1.5 py-1 text-xs font-medium text-white/75 hover:bg-white/10 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{backLabel}</span>
            </Link>
            <span className="h-6 w-px shrink-0 bg-white/20" aria-hidden />
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h1>
            {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
        </div>
    );
}

/** Udemy's circular "your progress" badge: a ring around a trophy and the "x/y bài" count. */
function ProgressRing({done, total, percent}: {done: number; total: number; percent: number}) {
    const radius = 15;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(Math.max(percent, 0), 100);
    return (
        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={`Tiến độ: ${done}/${total} bài`}>
            <span className="relative inline-flex h-9 w-9 items-center justify-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 h-9 w-9 -rotate-90" aria-hidden>
                    <circle cx="18" cy="18" r={radius} fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="3" />
                    <circle
                        cx="18"
                        cy="18"
                        r={radius}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - clamped / 100)}
                        className="transition-[stroke-dashoffset] duration-500"
                    />
                </svg>
                <Trophy className="h-3.5 w-3.5 text-white/80" aria-hidden />
            </span>
            <span className="text-xs font-semibold whitespace-nowrap tabular-nums">{done}/{total} bài</span>
        </div>
    );
}
