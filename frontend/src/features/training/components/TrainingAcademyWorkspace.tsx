'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
    CheckCircle2,
    Clock,
    Edit3,
    Layers,
    Plus,
    Eye,
    RefreshCw,
    Search,
    X,
} from 'lucide-react';
import {trainingService} from '@/features/training/api/training.api';
import type {
    TrainingAcademyWorkspaceProps,
    TrainingDocument,
    TrainingOverview,
    TrainingPortalTier,
    UpsertTrainingDocumentPayload,
} from '@/features/training/types/training.types';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {MarkdownSopRenderer} from '@/features/training/components/MarkdownSopRenderer';
import {adminTrainingPreviewHref, LEVEL_LABELS, PORTAL_META} from '@/features/training/utils/training-meta';
import {TrainingCourseCatalog} from '@/features/training/components/TrainingCourseCatalog';
import {TrainingCourseAdminPanel} from '@/features/training/components/TrainingCourseLessonsPanel';

/**
 * Training for one portal. Customers and operations staff read lessons and tick off checklists;
 * with `manage` (admin pages) the same catalogue is shown read-only with add and edit actions.
 * Each page fixes its portal, so there is no in-page switch between portals.
 */
export function TrainingAcademyWorkspace({
    defaultPortal,
    manage = false,
}: TrainingAcademyWorkspaceProps) {
    const queryClient = useQueryClient();
    const activePortal = defaultPortal;

    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    const [onlyMandatory, setOnlyMandatory] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDocCode, setSelectedDocCode] = useState<string | null>(null);

    const [learnerPreview, setLearnerPreview] = useState<boolean>(false);
    const [editorOpen, setEditorOpen] = useState<boolean>(false);
    const [editingDoc, setEditingDoc] = useState<TrainingDocument | null>(null);
    const [formState, setFormState] = useState<UpsertTrainingDocumentPayload>({
        code: '',
        targetPortal: defaultPortal,
        category: 'PREFLIGHT_SOP',
        level: 'STANDARD',
        versionTag: 'SOP-2026.2',
        estimatedMinutes: 15,
        isMandatory: true,
        sortOrder: 10,
        active: true,
        title: '',
        summary: '',
        contentMarkdown: '',
        checklistSteps: [''],
    });

    const {data, isLoading, isFetching, refetch} = useQuery({
        queryKey: ['uav-training-overview', activePortal],
        queryFn: ({signal}) =>
            trainingService.getOverview(
                {
                    portal: activePortal,
                },
                signal,
            ),
    });

    const allDocuments = data?.documents ?? [];

    const filteredDocuments = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return allDocuments.filter((doc) => {
            if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
                return false;
            }
            if (onlyMandatory && !doc.isMandatory) {
                return false;
            }
            if (!q) {
                return true;
            }
            return (
                doc.code.toLowerCase().includes(q) ||
                doc.title.toLowerCase().includes(q) ||
                doc.summary.toLowerCase().includes(q) ||
                doc.category.toLowerCase().includes(q)
            );
        });
    }, [allDocuments, selectedCategory, onlyMandatory, searchQuery]);

    useEffect(() => {
        if (filteredDocuments.length === 0) {
            setSelectedDocCode(null);
            return;
        }
        const exists = filteredDocuments.some((d) => d.code === selectedDocCode);
        if (!exists) {
            setSelectedDocCode(filteredDocuments[0].code);
        }
    }, [filteredDocuments, selectedDocCode]);

    const activeDocument = useMemo(() => {
        if (!selectedDocCode) return filteredDocuments[0] ?? null;
        return (
            filteredDocuments.find((doc) => doc.code === selectedDocCode) ??
            filteredDocuments[0] ??
            null
        );
    }, [filteredDocuments, selectedDocCode]);

    const progressMutation = useMutation({
        mutationFn: ({
            documentId,
            checkedSteps,
            markCompleted,
        }: {
            documentId: number;
            checkedSteps: number[];
            markCompleted?: boolean;
        }) => trainingService.updateProgress(documentId, {checkedSteps, markCompleted}),
        // The next click is computed from the cached document, so write the server's copy in right away and keep the
        // mutation pending (inputs disabled) until the refetched totals have landed too.
        onSuccess: (saved) => {
            queryClient.setQueryData<TrainingOverview>(['uav-training-overview', activePortal], (overview) =>
                overview && saved
                    ? {...overview, documents: overview.documents.map((doc) => (doc.id === saved.id ? {...doc, ...saved} : doc))}
                    : overview,
            );
            return queryClient.invalidateQueries({queryKey: ['uav-training-overview', activePortal]});
        },
    });

    const saveDocumentMutation = useMutation({
        mutationFn: (payload: UpsertTrainingDocumentPayload) => {
            if (editingDoc) {
                return trainingService.updateDocument(editingDoc.id, payload);
            }
            return trainingService.createDocument(payload);
        },
        onSuccess: (saved) => {
            setEditorOpen(false);
            setEditingDoc(null);
            setSelectedDocCode(saved.code);
            queryClient.invalidateQueries({queryKey: ['uav-training-overview']});
        },
    });

    const portalInfo = PORTAL_META[activePortal];

    const availableCategories = useMemo(() => {
        const set = new Set<string>();
        allDocuments.forEach((doc) => {
            if (doc.category) set.add(doc.category);
        });
        return Array.from(set);
    }, [allDocuments]);

    const getCategoryLabel = (categoryKey: string) => {
        return (
            PORTAL_META[activePortal]?.categories?.[categoryKey] ||
            PORTAL_META.CUSTOMER.categories[categoryKey] ||
            PORTAL_META.OPERATIONS.categories[categoryKey] ||
            PORTAL_META.ADMIN.categories[categoryKey] ||
            categoryKey
        );
    };

    const handleToggleStep = (doc: TrainingDocument, stepIdx: number) => {
        // A second click before the first save settles would be computed from the stale checklist.
        if (progressMutation.isPending) return;
        const current = new Set(doc.checkedSteps ?? []);
        if (current.has(stepIdx)) {
            current.delete(stepIdx);
        } else {
            current.add(stepIdx);
        }
        const nextSteps = Array.from(current).sort((a, b) => a - b);
        const allDone =
            doc.checklistSteps.length > 0 && nextSteps.length >= doc.checklistSteps.length;
        progressMutation.mutate({
            documentId: doc.id,
            checkedSteps: nextSteps,
            markCompleted: allDone,
        });
    };

    const handleMarkAllCompleted = (doc: TrainingDocument) => {
        if (progressMutation.isPending) return;
        const allIndices = doc.checklistSteps.map((_, idx) => idx);
        progressMutation.mutate({
            documentId: doc.id,
            checkedSteps: allIndices,
            markCompleted: true,
        });
    };

    const handleResetProgress = (doc: TrainingDocument) => {
        if (progressMutation.isPending) return;
        progressMutation.mutate({
            documentId: doc.id,
            checkedSteps: [],
            markCompleted: false,
        });
    };

    const openCreateModal = () => {
        const defaultCategory = Object.keys(PORTAL_META[activePortal].categories)[0] || 'GENERAL';
        setEditingDoc(null);
        setFormState({
            code: `TRN-${activePortal === 'CUSTOMER' ? 'CUST' : activePortal === 'OPERATIONS' ? 'OPS' : 'ADM'}-0${allDocuments.length + 1}`,
            targetPortal: activePortal,
            category: defaultCategory,
            level: 'STANDARD',
            versionTag: 'SOP-2026.2',
            estimatedMinutes: 15,
            isMandatory: true,
            sortOrder: (allDocuments.length + 1) * 10,
            active: true,
            title: '',
            summary: '',
            contentMarkdown: '### 1. Mục tiêu quy trình\n- Mô tả chi tiết các bước thực hiện.\n\n### 2. Tiêu chuẩn kỹ thuật\n- Các thông số an toàn bắt buộc.',
            checklistSteps: [
                'Xác nhận đã đọc và nắm vững quy trình kỹ thuật',
                'Kiểm tra danh mục an toàn trước khi áp dụng trên hệ thống',
            ],
        });
        setEditorOpen(true);
    };

    const openEditModal = (doc: TrainingDocument) => {
        setEditingDoc(doc);
        setFormState({
            code: doc.code,
            targetPortal: doc.targetPortal,
            category: doc.category,
            level: doc.level,
            versionTag: doc.versionTag || 'SOP-2026.1',
            estimatedMinutes: doc.estimatedMinutes || 15,
            isMandatory: doc.isMandatory,
            sortOrder: doc.sortOrder || 10,
            active: doc.active,
            title: doc.title,
            summary: doc.summary,
            contentMarkdown: doc.contentMarkdown,
            checklistSteps: doc.checklistSteps.length > 0 ? [...doc.checklistSteps] : [''],
        });
        setEditorOpen(true);
    };

    const totalDocs = data?.totalDocuments ?? 0;
    const completedDocs = data?.completedDocuments ?? 0;
    const mandatoryDocs = data?.mandatoryDocuments ?? 0;
    const mandatoryCompleted = data?.mandatoryCompleted ?? 0;
    const totalMinutes = data?.totalEstimatedMinutes ?? 0;
    const completedMinutes = data?.completedMinutes ?? 0;
    const completionPct = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
    const isMandatoryCertified = mandatoryDocs > 0 && mandatoryCompleted >= mandatoryDocs;

    return (
        <div className="divide-y divide-border bg-card">
            {/* 1. HEADER */}
            <div className="flex flex-col justify-between gap-3 bg-card px-5 py-4 lg:flex-row lg:items-center">
                <div className="space-y-1">
                    <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                        {manage ? `Tài liệu đào tạo cho ${portalInfo.audience}` : portalInfo.title}
                    </h1>
                    <p className="max-w-3xl text-sm text-muted">
                        {manage
                            ? `Thêm, sửa hoặc ẩn tài liệu mà ${portalInfo.audience} thấy trong mục Đào tạo.`
                            : portalInfo.subtitle}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-variant hover:text-foreground"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>

                    {manage && (
                        <button
                            type="button"
                            onClick={() => setLearnerPreview(value => !value)}
                            aria-pressed={learnerPreview}
                            className={`inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-medium transition-colors ${
                                learnerPreview
                                    ? 'border-foreground bg-surface-variant text-foreground'
                                    : 'border-border bg-card text-muted hover:bg-surface-variant hover:text-foreground'
                            }`}
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Xem như học viên
                        </button>
                    )}

                    {manage && (
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Thêm tài liệu
                        </button>
                    )}
                </div>
            </div>

            {manage && learnerPreview ? (
                <TrainingCourseCatalog
                    portal={activePortal}
                    embedded
                    manage
                    courseHref={slug => adminTrainingPreviewHref(slug, activePortal)}
                />
            ) : <>
            {/* 2. SUMMARY: the learner's progress, or the catalogue size for admins */}
            {manage ? (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 text-sm text-muted">
                    <span><strong className="text-foreground">{totalDocs}</strong> tài liệu</span>
                    <span><strong className="text-foreground">{mandatoryDocs}</strong> bắt buộc</span>
                    <span><strong className="text-foreground">{totalMinutes}</strong> phút học</span>
                </div>
            ) : (
                <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-5">
                    <div className="flex items-center gap-3 sm:w-72">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-variant">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{width: `${completionPct}%`}}
                            />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{completionPct}%</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
                        <span>Đã học <strong className="text-foreground">{completedDocs}/{totalDocs}</strong> bài</span>
                        <span>
                            {isMandatoryCertified
                                ? 'Đã xong các bài bắt buộc'
                                : <>Bắt buộc còn <strong className="text-foreground">{mandatoryDocs - mandatoryCompleted}</strong></>}
                        </span>
                        <span><strong className="text-foreground">{completedMinutes}/{totalMinutes}</strong> phút</span>
                    </div>
                    {isMandatoryCertified && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-badge border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đạt chuẩn
                        </span>
                    )}
                </div>
            )}

            {/* 3. FILTER & SEARCH BAR */}
            <div className="flex flex-col justify-between gap-3 bg-surface-variant/50 px-5 py-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory('ALL')}
                        className={`rounded-control border px-2.5 py-1 text-xs font-medium transition-colors ${
                            selectedCategory === 'ALL'
                                ? 'border-primary bg-primary text-white'
                                : 'border-border bg-card text-muted hover:text-foreground'
                        }`}
                    >
                        Tất cả ({allDocuments.length})
                    </button>
                    {availableCategories.map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-control border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    active
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-border bg-card text-muted hover:text-foreground'
                                }`}
                            >
                                {getCategoryLabel(cat)}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setOnlyMandatory((prev) => !prev)}
                        className={`rounded-control border px-2.5 py-1 text-xs font-medium transition-colors ${
                            onlyMandatory
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'border-border bg-card text-muted hover:text-foreground'
                        }`}
                    >
                        Chỉ bài bắt buộc
                    </button>
                </div>

                <div className="relative w-full lg:w-72">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm bài học..."
                        aria-label="Tìm bài học"
                        className="w-full rounded-control border border-border bg-card py-1.5 pr-8 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Xóa từ khóa"
                            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 4. 2-COLUMN MASTER-DETAIL WORKSPACE */}
            {isLoading ? (
                <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                    <div className="space-y-3 p-5 lg:col-span-4">
                        {[1, 2, 3, 4].map((idx) => (
                            <div
                                key={idx}
                                className="h-20 animate-pulse border border-border bg-surface-variant"
                            />
                        ))}
                    </div>
                    <div className="space-y-4 p-6 lg:col-span-8">
                        <div className="h-8 w-2/3 animate-pulse bg-surface-variant" />
                        <div className="h-64 animate-pulse bg-surface-variant" />
                    </div>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">Không có bài học phù hợp</p>
                    <p className="text-xs text-muted-foreground">Thử bỏ bộ lọc hoặc từ khóa tìm kiếm.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                    {/* LEFT COLUMN: LESSON LIST */}
                    <div className="divide-y divide-border bg-card lg:col-span-4">
                        <div className="bg-surface-variant/60 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                            {manage ? 'Tài liệu' : 'Bài học'} ({filteredDocuments.length})
                        </div>

                        <div className="divide-y divide-border">
                            {filteredDocuments.map((doc) => {
                                const isSelected = activeDocument?.code === doc.code;
                                const isCompleted = doc.progressStatus === 'COMPLETED';
                                const isInProgress = doc.progressStatus === 'IN_PROGRESS';
                                const checkedCount = doc.checkedSteps?.length ?? 0;
                                const totalSteps = doc.checklistSteps?.length ?? 0;

                                return (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        onClick={() => setSelectedDocCode(doc.code)}
                                        aria-current={isSelected ? 'true' : undefined}
                                        className={`flex w-full flex-col gap-1.5 p-4 text-left transition-colors ${
                                            isSelected
                                                ? 'border-l-2 border-l-primary bg-surface-variant/80'
                                                : 'bg-card hover:bg-surface-variant/40'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                                {doc.title}
                                            </span>
                                            {manage ? (
                                                !doc.active && (
                                                    <span className="shrink-0 rounded-badge border border-border bg-surface-variant px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                                        Đang ẩn
                                                    </span>
                                                )
                                            ) : (
                                                <span
                                                    className={`shrink-0 rounded-badge border px-1.5 py-0.5 text-[11px] font-medium ${
                                                        isCompleted
                                                            ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                                            : isInProgress
                                                              ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                                              : 'border-border bg-surface-variant text-muted-foreground'
                                                    }`}
                                                >
                                                    {isCompleted
                                                        ? 'Đã học'
                                                        : isInProgress
                                                          ? `${checkedCount}/${totalSteps} bước`
                                                          : 'Chưa học'}
                                                </span>
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
                                            <span className="rounded-badge border border-border bg-surface-variant px-2 py-0.5 font-medium">
                                                {getCategoryLabel(activeDocument.category)}
                                            </span>
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
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(activeDocument)}
                                                    className="inline-flex items-center gap-1.5 rounded-control border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted hover:bg-surface-variant hover:text-foreground"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                    Sửa tài liệu
                                                </button>
                                            ) : activeDocument.progressStatus === 'COMPLETED' ? (
                                                <button
                                                    type="button"
                                                    disabled={progressMutation.isPending}
                                                    onClick={() => handleResetProgress(activeDocument)}
                                                    className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-variant px-3 py-1 text-xs font-medium text-muted hover:text-foreground"
                                                >
                                                    Học lại
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={progressMutation.isPending}
                                                    onClick={() =>
                                                        handleMarkAllCompleted(activeDocument)
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Đánh dấu đã học
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <h2 className="text-base font-bold text-foreground sm:text-lg">
                                        {activeDocument.title}
                                    </h2>

                                    <p className="text-sm leading-relaxed text-muted">
                                        {activeDocument.summary}
                                    </p>
                                </div>

                                {/* Course: cover, learner preview and lessons */}
                                {manage && <TrainingCourseAdminPanel key={activeDocument.id} document={activeDocument} portal={activePortal} />}

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

                                        <ol className="divide-y divide-border border border-border bg-card">
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
                                                                disabled={progressMutation.isPending}
                                                                onChange={() => handleToggleStep(activeDocument, stepIdx)}
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
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            </>}

            {/* 5. ADMIN CREATE / EDIT MODAL */}
            {editorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-overlay border border-border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border bg-surface-variant px-5 py-3.5">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">
                                    {editingDoc
                                        ? `Sửa tài liệu ${editingDoc.code}`
                                        : 'Thêm tài liệu đào tạo'}
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    Tài liệu hiện ngay ở cổng đã chọn sau khi lưu.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditorOpen(false)}
                                className="rounded-control p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Mã tài liệu (Code) <RequiredMark />
                                    </label>
                                    <input
                                        type="text"
                                        aria-required
                                        value={formState.code}
                                        onChange={(e) =>
                                            setFormState({...formState, code: e.target.value})
                                        }
                                        className="w-full rounded-control border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Phân cấp cổng (Portal) <RequiredMark />
                                    </label>
                                    <select
                                        value={formState.targetPortal}
                                        onChange={(e) =>
                                            setFormState({
                                                ...formState,
                                                targetPortal: e.target.value as TrainingPortalTier,
                                            })
                                        }
                                        className="w-full rounded-control border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                                    >
                                        <option value="CUSTOMER">CUSTOMER (Khách hàng)</option>
                                        <option value="OPERATIONS">OPERATIONS (Điều hành)</option>
                                        <option value="ADMIN">ADMIN (Quản trị)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Cấp độ SOP <RequiredMark />
                                    </label>
                                    <select
                                        value={formState.level}
                                        onChange={(e) =>
                                            setFormState({...formState, level: e.target.value})
                                        }
                                        className="w-full rounded-control border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                                    >
                                        <option value="FOUNDATION">FOUNDATION (Cơ bản)</option>
                                        <option value="STANDARD">STANDARD (Tiêu chuẩn)</option>
                                        <option value="ADVANCED">ADVANCED (Chuyên sâu)</option>
                                        <option value="SOP_CRITICAL">
                                            SOP_CRITICAL (SOP Trọng yếu)
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Mã chuyên đề (Category) <RequiredMark />
                                    </label>
                                    <input
                                        type="text"
                                        aria-required
                                        value={formState.category}
                                        onChange={(e) =>
                                            setFormState({...formState, category: e.target.value})
                                        }
                                        className="w-full rounded-control border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Phiên bản (Version) <OptionalMark />
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.versionTag}
                                        onChange={(e) =>
                                            setFormState({...formState, versionTag: e.target.value})
                                        }
                                        className="w-full rounded-control border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Thời lượng (Phút) <RequiredMark />
                                    </label>
                                    <input
                                        type="number"
                                        aria-required
                                        value={formState.estimatedMinutes}
                                        onChange={(e) =>
                                            setFormState({
                                                ...formState,
                                                estimatedMinutes: Number(e.target.value) || 10,
                                            })
                                        }
                                        className="w-full rounded-control border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-foreground">
                                    Tiêu đề học phần / Tài liệu SOP <RequiredMark />
                                </label>
                                <input
                                    type="text"
                                    aria-required
                                    value={formState.title}
                                    onChange={(e) =>
                                        setFormState({...formState, title: e.target.value})
                                    }
                                    className="w-full rounded-control border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-foreground">
                                    Tóm tắt mục tiêu đào tạo <OptionalMark />
                                </label>
                                <textarea
                                    rows={2}
                                    value={formState.summary}
                                    onChange={(e) =>
                                        setFormState({...formState, summary: e.target.value})
                                    }
                                    className="w-full rounded-control border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-foreground">
                                    Nội dung chi tiết (Hỗ trợ Markdown: ### Tiêu đề, - Danh sách, | Bảng |) <RequiredMark />
                                </label>
                                <textarea
                                    rows={8}
                                    value={formState.contentMarkdown}
                                    onChange={(e) =>
                                        setFormState({
                                            ...formState,
                                            contentMarkdown: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-control border border-border bg-card px-3 py-2 font-mono text-xs text-foreground"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-foreground">
                                    Các bước Checklist thực hành (Mỗi dòng 1 bước kiểm tra) <OptionalMark />
                                </label>
                                <textarea
                                    rows={4}
                                    value={formState.checklistSteps.join('\n')}
                                    onChange={(e) =>
                                        setFormState({
                                            ...formState,
                                            checklistSteps: e.target.value
                                                .split('\n')
                                                .map((s) => s.trim())
                                                .filter(Boolean),
                                        })
                                    }
                                    className="w-full rounded-control border border-border bg-card px-3 py-2 text-xs text-foreground"
                                />
                            </div>

                            <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formState.isMandatory}
                                    onChange={(e) =>
                                        setFormState({...formState, isMandatory: e.target.checked})
                                    }
                                    className="h-4 w-4 accent-primary"
                                />
                                <span className="font-medium text-foreground">
                                    Đánh dấu là tài liệu SOP bắt buộc (Mandatory SOP)
                                </span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-variant px-5 py-3">
                            <button
                                type="button"
                                onClick={() => setEditorOpen(false)}
                                className="rounded-control border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={
                                    saveDocumentMutation.isPending ||
                                    !formState.code.trim() ||
                                    !formState.title.trim()
                                }
                                onClick={() => saveDocumentMutation.mutate(formState)}
                                className="rounded-control bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {saveDocumentMutation.isPending
                                    ? 'Đang lưu...'
                                    : editingDoc
                                      ? 'Cập nhật SOP'
                                      : 'Tạo tài liệu SOP'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
