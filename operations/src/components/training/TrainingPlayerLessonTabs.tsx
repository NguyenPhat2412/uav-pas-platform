'use client';

import {useId, useState} from 'react';
import {FolderOpen} from 'lucide-react';
import {Badge, Card} from '@/components/ui';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {useTrainingCourseChecklist} from '@/hooks/training/useTraining';
import type {
    TrainingCourseDetail,
    TrainingCourseLessonItem,
    TrainingLessonDetail,
} from '@/types/training/training.types';
import {LessonResourceList} from '@/components/training/TrainingLessonViewers';
import {flattenLessons} from '@/utils/training/course-helpers';
import {LEVEL_LABELS, trainingCategoryLabel} from '@/utils/training/training-meta';

type LessonTab = 'overview' | 'resources' | 'checklist';

export function TrainingPlayerLessonTabs({
    course,
    slug,
    currentItem,
    lesson,
    lessonLoading,
}: {
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
        {
            id: 'checklist',
            label: steps.length > 0 ? `Checklist (${(course.checkedSteps ?? []).length}/${steps.length})` : 'Checklist',
        },
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
                <Badge>{trainingCategoryLabel(course.targetPortal, course.category)}</Badge>
                {level && <Badge>{level.label}</Badge>}
                {course.isMandatory && <Badge variant="warning">Bắt buộc</Badge>}
                <span>
                    {course.lessonCount > 0 ? `${course.lessonCount} bài` : 'Chưa có bài học'} · {course.estimatedMinutes} phút
                    {documentCount > 0 && ` · ${documentCount} tài liệu`}
                </span>
            </div>
        </section>
    );
}

function LessonResources({
    lesson,
    loading,
    hasLesson,
}: {
    lesson: TrainingLessonDetail | undefined;
    loading: boolean;
    hasLesson: boolean;
}) {
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
    const steps = course.checklistSteps ?? [];
    const checked = course.checkedSteps ?? [];
    const allLessonsDone = flattenLessons(course.sections ?? []).every(lesson => lesson.completed);
    const mutation = useTrainingCourseChecklist(course.id, slug);

    if (steps.length === 0) return <p className="text-sm text-muted-foreground">Khóa học này không có checklist thực hành.</p>;

    const toggle = (index: number) => {
        if (mutation.isPending) return;
        const next = new Set(checked);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        const checkedSteps = Array.from(next).sort((a, b) => a - b);
        // The course only counts as finished once every lesson is done as well.
        mutation.mutate({checkedSteps, markCompleted: checkedSteps.length >= steps.length && allLessonsDone});
    };

    return (
        <div className="max-w-3xl space-y-3">
            <p className="text-xs text-muted-foreground">Đánh dấu từng bước khi bạn đã làm được trong thực tế.</p>
            <Card className="overflow-hidden p-0">
                <ol className="divide-y divide-border">
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
            </Card>
            {mutation.error && <ErrorNotice error={mutation.error} />}
        </div>
    );
}
