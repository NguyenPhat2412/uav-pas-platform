'use client';

import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
    ArrowLeft,
    BookOpen,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    FileText,
    FolderOpen,
    PanelRightClose,
    PanelRightOpen,
    Presentation,
    Trophy,
    Video,
    X,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {ApiError} from '@/lib/api';
import {trainingService} from '@/features/training/api/training.api';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import type {
    TrainingCourseDetail,
    TrainingCourseLessonItem,
    TrainingCourseSection,
    TrainingLessonDetail,
    TrainingLessonType,
    UpdateTrainingLessonProgressPayload,
} from '@/features/training/types/training.types';
import {
    ArticleLesson,
    DocumentLesson,
    ExternalVideoLesson,
    LessonMediaEmpty,
    LessonResourceList,
    SlidesLesson,
    STAGE_FRAME,
    VideoFileLesson,
} from '@/features/training/components/TrainingLessonViewers';
import {
    courseLessonProgress,
    flattenLessons,
    LESSON_TYPE_LABELS,
    neighbourLessons,
    parseLessonParam,
    pickStartLesson,
    sumLessonMinutes,
} from '@/features/training/utils/course-helpers';
import {LEVEL_LABELS, trainingCategoryLabel} from '@/features/training/utils/training-meta';

export const trainingCourseQueryKey = (slug: string) => ['uav-training-course', slug] as const;
const lessonQueryKey = (id: number) => ['uav-training-lesson', id] as const;

/** One cache entry per lesson, shared by the stage and the sidebar's "Tài liệu" menus. */
function lessonQueryOptions(id: number) {
    return {
        queryKey: lessonQueryKey(id),
        queryFn: ({signal}: {signal: AbortSignal}) => trainingService.getLesson(id, signal),
        // Signed media URLs change on every fetch; refetching would restart the video.
        staleTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
    };
}

const LESSON_ICONS: Record<TrainingLessonType, LucideIcon> = {
    VIDEO: Video,
    SLIDES: Presentation,
    ARTICLE: BookOpen,
    DOCUMENT: FileText,
};

/** Video and slides play on a black stage; articles and PDFs sit on a light reading surface. */
const isDarkStage = (type: TrainingLessonType | undefined) => type === 'VIDEO' || type === 'SLIDES';

/** The player's top bar colour (Udemy's near-black). */
const BAR_BG = 'bg-[#1c1d1f]';

/**
 * Udemy-style course player: a slim dark top bar (back, course title, progress ring), the lesson
 * stage on the left with the lesson bar and Tổng quan / Tài liệu / Checklist tabs under it, and the
 * "Nội dung khóa học" curriculum on the right (sticky, own scroll, can be hidden). The current lesson
 * lives in the URL (`?lesson=ID`) so a refresh or a shared link opens the same lesson. Mount inside
 * a Suspense boundary (it reads search params). `emptyHint` explains a course with no lessons yet
 * (the admin preview says where to add files).
 */
export function TrainingCoursePlayer({slug, backHref, backLabel = 'Tất cả khóa học', emptyHint}: {
    slug: string;
    backHref: string;
    backLabel?: string;
    emptyHint?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const courseQuery = useQuery({
        queryKey: trainingCourseQueryKey(slug),
        queryFn: ({signal}) => trainingService.getCourse(slug, signal),
    });
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

    const lessonQuery = useQuery({
        ...lessonQueryOptions(lessonId ?? 0),
        enabled: lessonId !== null,
    });
    const lesson = lessonQuery.data && lessonQuery.data.id === lessonId ? lessonQuery.data : undefined;

    const progress = useMutation({
        mutationFn: ({id, payload}: {id: number; payload: UpdateTrainingLessonProgressPayload; wasCompleted: boolean}) =>
            trainingService.updateLessonProgress(id, payload),
        onSuccess: (saved, {id, wasCompleted}) => {
            // Keep the cached signed URLs; only the progress fields change.
            queryClient.setQueryData<TrainingLessonDetail>(lessonQueryKey(id), current =>
                current ? {...current, completed: saved?.completed ?? current.completed, positionSeconds: saved?.positionSeconds ?? current.positionSeconds} : current);
            if ((saved?.completed ?? false) !== wasCompleted) {
                void queryClient.invalidateQueries({queryKey: trainingCourseQueryKey(slug)});
                void queryClient.invalidateQueries({queryKey: ['uav-training-courses']});
            }
        },
    });

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
                <button
                    type="button"
                    onClick={() => setSidebarOpen(open => !open)}
                    aria-pressed={sidebarOpen}
                    aria-controls="course-curriculum"
                    title={sidebarOpen ? 'Ẩn nội dung khóa học' : 'Hiện nội dung khóa học'}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-white/25 px-2.5 text-xs font-medium text-white hover:bg-white/10"
                >
                    {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                    <span className="hidden sm:inline">{sidebarOpen ? 'Ẩn nội dung' : 'Nội dung khóa học'}</span>
                </button>
            </TopBar>

            <div className="flex flex-col lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                    <div className={isDarkStage(currentItem?.type) ? 'bg-black' : 'border-b border-border bg-white'}>
                        <LessonStage
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
                                <CompletionControl
                                    lesson={lesson}
                                    saving={progress.isPending}
                                    onComplete={() => saveProgress(lesson.id, {completed: true, positionSeconds: lesson.positionSeconds ?? 0}, lesson.completed)}
                                />
                            )}
                            <NavButton href={nav.prev !== null ? hrefForLesson(nav.prev) : null} direction="prev" />
                            <NavButton href={nav.next !== null ? hrefForLesson(nav.next) : null} direction="next" />
                        </div>
                    </div>
                    {progress.error && <div className="px-5 pt-3 sm:px-8"><ErrorNotice error={progress.error} /></div>}

                    <LessonTabs
                        course={course}
                        slug={slug}
                        currentItem={currentItem}
                        lesson={lesson}
                        lessonLoading={lessonId !== null && !lesson && !lessonQuery.error}
                    />
                </div>

                {sidebarOpen && (
                    <Curriculum
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

function NavButton({href, direction}: {href: string | null; direction: 'prev' | 'next'}) {
    const label = direction === 'prev' ? 'Bài trước' : 'Bài tiếp';
    const content = direction === 'prev'
        ? <><ChevronLeft className="h-3.5 w-3.5" />{label}</>
        : <>{label}<ChevronRight className="h-3.5 w-3.5" /></>;
    const className = 'inline-flex h-8 items-center gap-1 rounded-control border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-surface-variant';
    if (!href) {
        return <span aria-disabled="true" className={`${className} pointer-events-none opacity-40`}>{content}</span>;
    }
    return <Link href={href} scroll={false} className={className}>{content}</Link>;
}

function LessonStage({lessonId, expectedType, lesson, error, emptyHint, onSave}: {
    lessonId: number | null;
    expectedType: TrainingLessonType | undefined;
    lesson: TrainingLessonDetail | undefined;
    error: Error | null;
    emptyHint?: string;
    onSave: (id: number, payload: UpdateTrainingLessonProgressPayload, wasCompleted: boolean) => void;
}) {
    if (lessonId === null) {
        return (
            <LessonMediaEmpty
                tone="light"
                icon={<FolderOpen className="h-8 w-8" strokeWidth={1.5} />}
                title="Chưa có bài học"
                detail={emptyHint ?? 'Khóa học này chưa có video hay tài liệu. Vui lòng quay lại sau.'}
            />
        );
    }
    if (error) return <div className="bg-white p-5"><ErrorNotice error={error} /></div>;
    if (!lesson) {
        const dark = isDarkStage(expectedType);
        return <div className={`${STAGE_FRAME} animate-pulse ${dark ? BAR_BG : 'bg-slate-100'}`} role="status" aria-label="Đang tải bài học" />;
    }

    switch (lesson.type) {
        case 'VIDEO': {
            const video = lesson.video;
            if (!video || !video.url) {
                return (
                    <LessonMediaEmpty
                        title="Video chưa sẵn sàng"
                        detail={video?.kind === 'FILE' ? 'Kho lưu trữ tệp chưa được cấu hình nên chưa phát được video.' : 'Bài học này chưa có video.'}
                    />
                );
            }
            if (video.kind === 'EXTERNAL') return <ExternalVideoLesson key={lesson.id} url={video.url} title={lesson.title} />;
            return (
                <VideoFileLesson
                    key={lesson.id}
                    url={video.url}
                    contentType={video.contentType}
                    completed={lesson.completed}
                    positionSeconds={lesson.positionSeconds ?? 0}
                    onSave={payload => onSave(lesson.id, payload, lesson.completed)}
                />
            );
        }
        case 'SLIDES':
            return (
                <SlidesLesson
                    key={lesson.id}
                    slides={lesson.slides ?? []}
                    title={lesson.title}
                    completed={lesson.completed}
                    onReachedEnd={() => onSave(lesson.id, {completed: true, positionSeconds: 0}, lesson.completed)}
                />
            );
        case 'DOCUMENT':
            return (
                <DocumentLesson
                    key={lesson.id}
                    document={lesson.document}
                    title={lesson.title}
                    lessonId={lesson.id}
                    completed={lesson.completed}
                    onReachedEnd={() => onSave(lesson.id, {completed: true, positionSeconds: 0}, lesson.completed)}
                />
            );
        default:
            return <ArticleLesson markdown={lesson.bodyMarkdown} />;
    }
}

const MANUAL_COMPLETE_LABELS: Partial<Record<TrainingLessonType, string>> = {
    ARTICLE: 'Đánh dấu hoàn thành',
    DOCUMENT: 'Đánh dấu đã đọc',
    VIDEO: 'Đánh dấu đã xem',
};

/** Done state, or the manual "mark" button (the page's one red CTA) for lessons that cannot track themselves. */
function CompletionControl({lesson, saving, onComplete}: {lesson: TrainingLessonDetail; saving: boolean; onComplete: () => void}) {
    if (lesson.completed) {
        return (
            <span className="inline-flex h-8 items-center gap-1 rounded-control bg-slate-100 px-2.5 text-xs font-semibold text-slate-700">
                <CircleCheck className="h-3.5 w-3.5" />
                Đã hoàn thành
            </span>
        );
    }
    const manual = lesson.type === 'ARTICLE' || lesson.type === 'DOCUMENT' || (lesson.type === 'VIDEO' && lesson.video?.kind === 'EXTERNAL');
    if (!manual) {
        return (
            <span className="text-xs text-muted-foreground">
                {lesson.type === 'SLIDES' ? 'Hoàn thành khi xem đến slide cuối' : 'Hoàn thành khi xem 90% video'}
            </span>
        );
    }
    return (
        <button
            type="button"
            onClick={onComplete}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1 rounded-control bg-primary px-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
            <CircleCheck className="h-3.5 w-3.5" />
            {MANUAL_COMPLETE_LABELS[lesson.type] ?? 'Đánh dấu hoàn thành'}
        </button>
    );
}

function Curriculum({sections, currentId, hrefForLesson, onClose}: {
    sections: TrainingCourseSection[];
    currentId: number | null;
    hrefForLesson: (id: number) => string;
    onClose: () => void;
}) {
    // Sections open by default when they hold the current lesson (or the course is short); a click overrides.
    const [toggled, setToggled] = useState<ReadonlyMap<number, boolean>>(() => new Map());
    const isOpen = (index: number, section: TrainingCourseSection) =>
        toggled.get(index) ?? (sections.length <= 3 || section.lessons.some(item => item.id === currentId));
    // Lessons are numbered across the whole course, as on Udemy.
    const firstNumbers = sections.reduce<number[]>((starts, _section, index) =>
        [...starts, index === 0 ? 1 : starts[index - 1] + sections[index - 1].lessons.length], []);

    return (
        <aside
            id="course-curriculum"
            aria-label="Nội dung khóa học"
            className="w-full shrink-0 border-t border-border bg-card lg:sticky lg:top-13 lg:max-h-[calc(100vh-3.25rem)] lg:w-[22rem] lg:overflow-y-auto lg:border-t-0 lg:border-l xl:w-[25rem]"
        >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
                <h2 className="text-base font-bold text-foreground">Nội dung khóa học</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Ẩn nội dung khóa học"
                    title="Ẩn nội dung khóa học"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-surface-variant hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {sections.length === 0 ? (
                <p className="px-4 py-6 text-xs text-muted-foreground">Chưa có bài học.</p>
            ) : sections.map((section, sectionIndex) => {
                const open = isOpen(sectionIndex, section);
                const sectionDone = section.lessons.filter(item => item.completed).length;
                const firstNumber = firstNumbers[sectionIndex];
                return (
                    <section key={`${section.title}-${sectionIndex}`} className="border-b border-border">
                        <button
                            type="button"
                            onClick={() => setToggled(current => new Map(current).set(sectionIndex, !open))}
                            aria-expanded={open}
                            className="flex w-full items-start gap-2 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-foreground">Phần {sectionIndex + 1}: {section.title}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                                    {sectionDone}/{section.lessons.length} · {sumLessonMinutes(section.lessons)} phút
                                </span>
                            </span>
                            <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                        {open && (
                            <ol>
                                {section.lessons.map((item, index) => (
                                    <CurriculumLesson
                                        key={item.id}
                                        item={item}
                                        number={firstNumber + index}
                                        current={item.id === currentId}
                                        href={hrefForLesson(item.id)}
                                    />
                                ))}
                            </ol>
                        )}
                    </section>
                );
            })}
        </aside>
    );
}

function CurriculumLesson({item, number, current, href}: {item: TrainingCourseLessonItem; number: number; current: boolean; href: string}) {
    const Icon = LESSON_ICONS[item.type] ?? FileText;
    const resourceCount = item.resourceCount ?? 0;
    return (
        <li className={`relative flex items-start gap-3 px-4 py-2.5 ${current ? 'bg-slate-200/70' : 'hover:bg-slate-100'}`}>
            <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    item.completed ? 'border-[#1c1d1f] bg-[#1c1d1f] text-white' : 'border-slate-400 bg-white'
                }`}
                role="img"
                aria-label={item.completed ? 'Đã xong' : 'Chưa xong'}
            >
                {item.completed && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
            </span>
            <div className="min-w-0 flex-1">
                {/* The link covers the whole row; the resources menu sits above it. */}
                <Link
                    href={href}
                    scroll={false}
                    aria-current={current ? 'step' : undefined}
                    className={`line-clamp-2 text-sm text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-foreground/40 ${current ? 'font-semibold' : ''}`}
                >
                    {number}. {item.title}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5" aria-label={LESSON_TYPE_LABELS[item.type]} />
                        {item.durationMinutes} phút
                    </span>
                    {resourceCount > 0 && <LessonResourcesMenu lessonId={item.id} count={resourceCount} />}
                </div>
            </div>
        </li>
    );
}

/** Udemy's small "Resources" dropdown on a curriculum row; loads that lesson's files on first open. */
function LessonResourcesMenu({lessonId, count}: {lessonId: number; count: number}) {
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const query = useQuery({...lessonQueryOptions(lessonId), enabled: open});
    const resources = query.data?.resources ?? [];

    useEffect(() => {
        if (!open) return;
        const onPointer = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative z-[1] ml-auto">
            <button
                type="button"
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                aria-controls={menuId}
                className="inline-flex h-7 items-center gap-1 rounded-control border border-foreground/70 bg-card px-2 text-xs font-semibold text-foreground hover:bg-slate-100"
            >
                <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                Tài liệu ({count})
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {open && (
                <div id={menuId} className="absolute top-full right-0 z-20 mt-1 w-72 overflow-hidden rounded-control border border-border bg-card shadow-lg">
                    {query.error ? (
                        <div className="p-3"><ErrorNotice error={query.error} /></div>
                    ) : query.isPending ? (
                        <div className="space-y-2 p-3" role="status" aria-label="Đang tải tài liệu">
                            {[0, 1].map(index => <div key={index} className="h-8 animate-pulse rounded-badge bg-surface-variant" />)}
                        </div>
                    ) : resources.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-muted-foreground">Bài học này không có tài liệu.</p>
                    ) : (
                        <LessonResourceList resources={resources} compact />
                    )}
                </div>
            )}
        </div>
    );
}

type LessonTab = 'overview' | 'resources' | 'checklist';

function LessonTabs({course, slug, currentItem, lesson, lessonLoading}: {
    course: TrainingCourseDetail;
    slug: string;
    currentItem: TrainingCourseLessonItem | null;
    lesson: TrainingLessonDetail | undefined;
    lessonLoading: boolean;
}) {
    const [tab, setTab] = useState<LessonTab>('overview');
    const tabsId = useId();
    const steps = course.checklistSteps ?? [];
    const resourceCount = lesson?.resources?.length ?? currentItem?.resourceCount ?? 0;
    const tabs: Array<{id: LessonTab; label: string}> = [
        {id: 'overview', label: 'Tổng quan'},
        {id: 'resources', label: resourceCount > 0 ? `Tài liệu (${resourceCount})` : 'Tài liệu'},
        {id: 'checklist', label: steps.length > 0 ? `Checklist (${(course.checkedSteps ?? []).length}/${steps.length})` : 'Checklist'},
    ];
    return (
        <div>
            <div role="tablist" aria-label="Thông tin bài học" className="flex gap-6 overflow-x-auto border-b border-border px-5 sm:px-8">
                {tabs.map(item => (
                    <button
                        key={item.id}
                        id={`${tabsId}-${item.id}`}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.id}
                        aria-controls={`${tabsId}-panel`}
                        onClick={() => setTab(item.id)}
                        className={`-mb-px shrink-0 border-b-2 py-3 text-sm font-bold whitespace-nowrap ${
                            tab === item.id ? 'border-foreground text-foreground' : 'border-transparent text-muted hover:text-foreground'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`} className="px-5 py-6 sm:px-8">
                {tab === 'overview' && <CourseOverview course={course} />}
                {tab === 'resources' && <LessonResources lesson={lesson} loading={lessonLoading} hasLesson={currentItem !== null} />}
                {tab === 'checklist' && <CourseChecklist course={course} slug={slug} />}
            </div>
        </div>
    );
}

/** The course summary and its meta only: training content comes from the lessons' files, not from text. */
function CourseOverview({course}: {course: TrainingCourseDetail}) {
    const level = LEVEL_LABELS[course.level];
    const documentCount = course.documentCount ?? 0;
    return (
        <section className="max-w-3xl space-y-2">
            <h3 className="text-base font-bold text-foreground">Về khóa học này</h3>
            {course.summary && <p className="text-sm leading-relaxed text-muted">{course.summary}</p>}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-badge border border-border bg-surface-variant px-2 py-0.5">{trainingCategoryLabel(course.targetPortal, course.category)}</span>
                {level && <span className="rounded-badge border border-border bg-surface-variant px-2 py-0.5">{level.label}</span>}
                {course.isMandatory && <span className="rounded-badge border border-border px-2 py-0.5 font-semibold text-foreground">Bắt buộc</span>}
                <span>
                    {course.lessonCount > 0 ? `${course.lessonCount} bài` : 'Chưa có bài học'} · {course.estimatedMinutes} phút
                    {documentCount > 0 && ` · ${documentCount} tài liệu`}
                </span>
            </div>
        </section>
    );
}

function LessonResources({lesson, loading, hasLesson}: {lesson: TrainingLessonDetail | undefined; loading: boolean; hasLesson: boolean}) {
    if (loading) {
        return (
            <div className="max-w-3xl space-y-2" role="status" aria-label="Đang tải tài liệu">
                {[0, 1].map(index => <div key={index} className="h-12 animate-pulse rounded-badge bg-surface-variant" />)}
            </div>
        );
    }
    const resources = lesson?.resources ?? [];
    if (!hasLesson || resources.length === 0) {
        return (
            <div className="flex max-w-3xl flex-col items-center gap-1 rounded-panel border border-dashed border-border py-10 text-center">
                <FolderOpen className="h-6 w-6 text-slate-400" strokeWidth={1.5} aria-hidden />
                <p className="text-sm font-semibold text-foreground">Không có tài liệu đính kèm</p>
                <p className="text-xs text-muted-foreground">Bài học này không có tệp để tải về.</p>
            </div>
        );
    }
    return (
        <div className="max-w-3xl space-y-3">
            <p className="text-xs text-muted-foreground">Tài liệu đi kèm bài “{lesson?.title}”. Liên kết tải có hiệu lực trong phiên học.</p>
            <LessonResourceList resources={resources} />
        </div>
    );
}

function CourseChecklist({course, slug}: {course: TrainingCourseDetail; slug: string}) {
    const queryClient = useQueryClient();
    const steps = course.checklistSteps ?? [];
    const checked = course.checkedSteps ?? [];
    const allLessonsDone = flattenLessons(course.sections ?? []).every(lesson => lesson.completed);
    const mutation = useMutation({
        mutationFn: (checkedSteps: number[]) => trainingService.updateProgress(course.id, {
            checkedSteps,
            // The course only counts as finished once every lesson is done as well.
            markCompleted: checkedSteps.length >= steps.length && allLessonsDone,
        }),
        onSuccess: saved => {
            queryClient.setQueryData<TrainingCourseDetail>(trainingCourseQueryKey(slug), current =>
                current && saved ? {...current, checkedSteps: saved.checkedSteps ?? current.checkedSteps} : current);
            return Promise.all([
                queryClient.invalidateQueries({queryKey: trainingCourseQueryKey(slug)}),
                queryClient.invalidateQueries({queryKey: ['uav-training-courses']}),
            ]);
        },
    });

    if (steps.length === 0) return <p className="text-sm text-muted-foreground">Khóa học này không có checklist thực hành.</p>;

    const toggle = (index: number) => {
        if (mutation.isPending) return;
        const next = new Set(checked);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        mutation.mutate(Array.from(next).sort((a, b) => a - b));
    };

    return (
        <div className="max-w-3xl space-y-3">
            <p className="text-xs text-muted-foreground">Đánh dấu từng bước khi bạn đã làm được trong thực tế.</p>
            <ol className="divide-y divide-border rounded-panel border border-border">
                {steps.map((step, index) => {
                    const isChecked = checked.includes(index);
                    return (
                        <li key={index}>
                            <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-surface-variant/60">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={mutation.isPending}
                                    onChange={() => toggle(index)}
                                    className="mt-0.5 h-4 w-4 shrink-0 accent-slate-700"
                                />
                                <span className={`text-sm ${isChecked ? 'text-foreground' : 'text-muted'}`}>{step}</span>
                            </label>
                        </li>
                    );
                })}
            </ol>
            {mutation.error && <ErrorNotice error={mutation.error} />}
        </div>
    );
}
