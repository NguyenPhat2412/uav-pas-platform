'use client';

import {CheckCircle2, Clock, Edit3, Layers} from 'lucide-react';
import {Badge, Button, Card} from '@/components/ui';
import type {TrainingDocument, TrainingPortalTier} from '@/types/training/training.types';
import {MarkdownSopRenderer} from '@/components/training/MarkdownSopRenderer';
import {TrainingCourseAdminPanel} from '@/components/training/TrainingCourseLessonsPanel';
import {LEVEL_LABELS} from '@/utils/training/training-meta';

export interface TrainingDocumentMasterDetailProps {
    isLoading: boolean;
    manage: boolean;
    activePortal: TrainingPortalTier;
    filteredDocuments: TrainingDocument[];
    activeDocument: TrainingDocument | null;
    isProgressPending: boolean;
    onSelectDocument: (code: string) => void;
    onEditDocument: (doc: TrainingDocument) => void;
    onToggleStep: (doc: TrainingDocument, stepIdx: number) => void;
    onMarkAllCompleted: (doc: TrainingDocument) => void;
    onResetProgress: (doc: TrainingDocument) => void;
    getCategoryLabel: (categoryKey: string) => string;
}

export function TrainingDocumentMasterDetail({
    isLoading,
    manage,
    activePortal,
    filteredDocuments,
    activeDocument,
    isProgressPending,
    onSelectDocument,
    onEditDocument,
    onToggleStep,
    onMarkAllCompleted,
    onResetProgress,
    getCategoryLabel,
}: TrainingDocumentMasterDetailProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                <div className="space-y-3 p-5 lg:col-span-4">
                    {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="h-20 animate-pulse border border-border bg-surface-variant" />
                    ))}
                </div>
                <div className="space-y-4 p-6 lg:col-span-8">
                    <div className="h-8 w-2/3 animate-pulse bg-surface-variant" />
                    <div className="h-64 animate-pulse bg-surface-variant" />
                </div>
            </div>
        );
    }

    if (filteredDocuments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Layers className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Không có bài học phù hợp</p>
                <p className="text-xs text-muted-foreground">Thử bỏ bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
            {/* LEFT COLUMN: LESSON LIST */}
            <div className="divide-y divide-border bg-card lg:col-span-4">
                <div className="bg-surface-variant/60 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    {manage ? 'Tài liệu' : 'Bài học'} ({filteredDocuments.length})
                </div>

                <div className="divide-y divide-border">
                    {filteredDocuments.map(doc => {
                        const isSelected = activeDocument?.code === doc.code;
                        const isCompleted = doc.progressStatus === 'COMPLETED';
                        const isInProgress = doc.progressStatus === 'IN_PROGRESS';
                        const checkedCount = doc.checkedSteps?.length ?? 0;
                        const totalSteps = doc.checklistSteps?.length ?? 0;

                        return (
                            <button
                                key={doc.id}
                                type="button"
                                onClick={() => onSelectDocument(doc.code)}
                                aria-current={isSelected ? 'true' : undefined}
                                className={`flex w-full flex-col gap-1.5 p-4 text-left transition-colors ${
                                    isSelected
                                        ? 'border-l-2 border-l-primary bg-surface-variant/80'
                                        : 'bg-card hover:bg-surface-variant/40'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">{doc.title}</span>
                                    {manage ? (
                                        !doc.active && <Badge className="shrink-0">Đang ẩn</Badge>
                                    ) : (
                                        <Badge
                                            className={`shrink-0 ${
                                                isCompleted
                                                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                                    : isInProgress
                                                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                                      : ''
                                            }`}
                                        >
                                            {isCompleted
                                                ? 'Đã học'
                                                : isInProgress
                                                  ? `${checkedCount}/${totalSteps} bước`
                                                  : 'Chưa học'}
                                        </Badge>
                                    )}
                                </div>

                                <p className="line-clamp-1 text-xs text-muted">{doc.summary}</p>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                                    {doc.isMandatory && (
                                        <span className="font-semibold text-amber-700 dark:text-amber-300">Bắt buộc</span>
                                    )}
                                    <span>{getCategoryLabel(doc.category)}</span>
                                    <span>· {doc.estimatedMinutes} phút</span>
                                    {manage && <span className="font-mono">· {doc.code}</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT COLUMN: READER & CHECKLIST */}
            <div className="divide-y divide-border bg-card lg:col-span-8">
                {activeDocument && (
                    <>
                        {/* Document Header */}
                        <div className="space-y-3 bg-card p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                                    <Badge>{getCategoryLabel(activeDocument.category)}</Badge>
                                    {LEVEL_LABELS[activeDocument.level] && (
                                        <span className={`rounded-badge border px-2 py-0.5 font-medium ${LEVEL_LABELS[activeDocument.level].toneClass}`}>
                                            {LEVEL_LABELS[activeDocument.level].label}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {activeDocument.estimatedMinutes} phút
                                    </span>
                                    {manage && (
                                        <span className="font-mono">
                                            {activeDocument.code} · {activeDocument.versionTag}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {manage ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEditDocument(activeDocument)}
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                            Sửa tài liệu
                                        </Button>
                                    ) : activeDocument.progressStatus === 'COMPLETED' ? (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            disabled={isProgressPending}
                                            onClick={() => onResetProgress(activeDocument)}
                                        >
                                            Học lại
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="primary"
                                            size="sm"
                                            disabled={isProgressPending}
                                            onClick={() => onMarkAllCompleted(activeDocument)}
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Đánh dấu đã học
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-base font-bold text-foreground sm:text-lg">{activeDocument.title}</h2>
                            <p className="text-sm leading-relaxed text-muted">{activeDocument.summary}</p>
                        </div>

                        {/* Course: cover, learner preview and lessons */}
                        {manage && (
                            <TrainingCourseAdminPanel
                                key={activeDocument.id}
                                document={activeDocument}
                                portal={activePortal}
                            />
                        )}

                        {/* Content */}
                        <div className="bg-card p-5">
                            <MarkdownSopRenderer markdown={activeDocument.contentMarkdown} />
                        </div>

                        {/* Checklist: learners tick it off; admins see it read-only */}
                        {(activeDocument.checklistSteps ?? []).length > 0 && (
                            <div className="space-y-3 bg-surface-variant/40 p-5">
                                <h3 className="text-sm font-bold text-foreground">
                                    Checklist
                                    {!manage && ` (${activeDocument.checkedSteps?.length ?? 0}/${activeDocument.checklistSteps.length})`}
                                </h3>

                                <Card className="overflow-hidden p-0">
                                    <ol className="divide-y divide-border bg-card">
                                        {activeDocument.checklistSteps.map((stepText, stepIdx) => {
                                            const checked = (activeDocument.checkedSteps ?? []).includes(stepIdx);
                                            return manage ? (
                                                <li key={stepIdx} className="flex items-start gap-3 px-4 py-3 text-sm text-foreground">
                                                    <span className="w-5 shrink-0 text-muted-foreground">{stepIdx + 1}.</span>
                                                    {stepText}
                                                </li>
                                            ) : (
                                                <li key={stepIdx}>
                                                    <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-variant/60">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            disabled={isProgressPending}
                                                            onChange={() => onToggleStep(activeDocument, stepIdx)}
                                                            className="mt-0.5 h-4 w-4 shrink-0 rounded-badge border-border accent-primary"
                                                        />
                                                        <span className={`text-sm ${checked ? 'text-foreground' : 'text-muted'}`}>
                                                            {stepText}
                                                        </span>
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
