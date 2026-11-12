'use client';

import {useEffect, useId, useRef, useState} from 'react';
import Link from 'next/link';
import {
    BookOpen,
    Check,
    ChevronDown,
    FileText,
    FolderOpen,
    Presentation,
    Video,
    X,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Button} from '@/components/ui';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {useTrainingLesson} from '@/hooks/training/useTraining';
import type {
    TrainingCourseLessonItem,
    TrainingCourseSection,
    TrainingLessonType,
} from '@/types/training/training.types';
import {LessonResourceList} from '@/components/training/TrainingLessonViewers';
import {LESSON_TYPE_LABELS, sumLessonMinutes} from '@/utils/training/course-helpers';

const LESSON_ICONS: Record<TrainingLessonType, LucideIcon> = {
    VIDEO: Video,
    SLIDES: Presentation,
    ARTICLE: BookOpen,
    DOCUMENT: FileText,
};

export function TrainingPlayerCurriculumSidebar({
    sections,
    currentId,
    hrefForLesson,
    onClose,
}: {
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
    const firstNumbers = sections.reduce<number[]>(
        (starts, _section, index) => [
            ...starts,
            index === 0 ? 1 : starts[index - 1] + sections[index - 1].lessons.length,
        ],
        [],
    );

    return (
        <aside
            id="course-curriculum"
            aria-label="Nội dung khóa học"
            className="w-full shrink-0 border-t border-border bg-card lg:sticky lg:top-13 lg:max-h-[calc(100vh-3.25rem)] lg:w-[22rem] lg:overflow-y-auto lg:border-t-0 lg:border-l xl:w-[25rem]"
        >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
                <h2 className="text-base font-bold text-foreground">Nội dung khóa học</h2>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Ẩn nội dung khóa học"
                    title="Ẩn nội dung khóa học"
                    className="h-8 w-8 px-0"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {sections.length === 0 ? (
                <p className="px-4 py-6 text-xs text-muted-foreground">Chưa có bài học.</p>
            ) : (
                sections.map((section, sectionIndex) => {
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
                                    <span className="block text-sm font-bold text-foreground">
                                        Phần {sectionIndex + 1}: {section.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                                        {sectionDone}/{section.lessons.length} · {sumLessonMinutes(section.lessons)} phút
                                    </span>
                                </span>
                                <ChevronDown
                                    className={`mt-0.5 h-4 w-4 shrink-0 text-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                                    aria-hidden
                                />
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
                })
            )}
        </aside>
    );
}

function CurriculumLesson({
    item,
    number,
    current,
    href,
}: {
    item: TrainingCourseLessonItem;
    number: number;
    current: boolean;
    href: string;
}) {
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
    const query = useTrainingLesson(lessonId, open);
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
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(value => !value)}
                aria-expanded={open}
                aria-controls={menuId}
                className="h-7 gap-1 px-2 text-xs font-semibold"
            >
                <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                Tài liệu ({count})
                <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </Button>
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
