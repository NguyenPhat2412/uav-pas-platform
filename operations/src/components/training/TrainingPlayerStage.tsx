'use client';

import Link from 'next/link';
import {ChevronLeft, ChevronRight, CircleCheck, FolderOpen} from 'lucide-react';
import {Badge, Button} from '@/components/ui';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import type {
    TrainingLessonDetail,
    TrainingLessonType,
    UpdateTrainingLessonProgressPayload,
} from '@/types/training/training.types';
import {
    ArticleLesson,
    DocumentLesson,
    ExternalVideoLesson,
    LessonMediaEmpty,
    SlidesLesson,
    STAGE_FRAME,
    VideoFileLesson,
} from '@/components/training/TrainingLessonViewers';

/** Video and slides play on a black stage; articles and PDFs sit on a light reading surface. */
export const isDarkStage = (type: TrainingLessonType | undefined) => type === 'VIDEO' || type === 'SLIDES';

/** The player's top bar colour (Udemy's near-black). */
export const BAR_BG = 'bg-[#1c1d1f]';

export function TrainingPlayerStage({
    lessonId,
    expectedType,
    lesson,
    error,
    emptyHint,
    onSave,
}: {
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
export function TrainingCompletionControl({
    lesson,
    saving,
    onComplete,
}: {
    lesson: TrainingLessonDetail;
    saving: boolean;
    onComplete: () => void;
}) {
    if (lesson.completed) {
        return (
            <Badge className="inline-flex h-8 items-center gap-1 bg-slate-100 px-2.5 text-xs font-semibold text-slate-700">
                <CircleCheck className="h-3.5 w-3.5" />
                Đã hoàn thành
            </Badge>
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
        <Button type="button" variant="primary" size="sm" isLoading={saving} onClick={onComplete}>
            <CircleCheck className="h-3.5 w-3.5" />
            {MANUAL_COMPLETE_LABELS[lesson.type] ?? 'Đánh dấu hoàn thành'}
        </Button>
    );
}

export function TrainingPlayerNavButton({href, direction}: {href: string | null; direction: 'prev' | 'next'}) {
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
