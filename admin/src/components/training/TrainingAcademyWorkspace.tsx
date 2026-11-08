'use client';

import {useMemo, useState} from 'react';
import {Eye, Plus, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui';
import {
    useSaveTrainingDocument,
    useTrainingDocumentProgress,
    useTrainingOverview,
} from '@/hooks/training/useTraining';
import {
    emptyTrainingDocumentDraft,
    trainingDocumentDraftFromDetail,
    trainingDocumentFieldErrors,
} from '@/forms/training/training-form';
import type {
    TrainingAcademyWorkspaceProps,
    TrainingDocument,
    UpsertTrainingDocumentPayload,
} from '@/types/training/training.types';
import {adminTrainingPreviewHref, PORTAL_META} from '@/utils/training/training-meta';
import {TrainingCourseCatalog} from '@/components/training/TrainingCourseCatalog';
import {TrainingCourseFormModal} from '@/components/training/TrainingCourseFormModal';
import {TrainingDocumentMasterDetail} from '@/components/training/TrainingDocumentMasterDetail';
import {TrainingEnrollmentStatsStrip} from '@/components/training/TrainingEnrollmentStatsStrip';

/**
 * Training for one portal. Customers and operations staff read lessons and tick off checklists;
 * with `manage` (admin pages) the same catalogue is shown read-only with add and edit actions.
 * Each page fixes its portal, so there is no in-page switch between portals.
 */
export function TrainingAcademyWorkspace({
    defaultPortal,
    manage = false,
}: TrainingAcademyWorkspaceProps) {
    const activePortal = defaultPortal;

    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [onlyMandatory, setOnlyMandatory] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDocCode, setSelectedDocCode] = useState<string | null>(null);

    const [learnerPreview, setLearnerPreview] = useState<boolean>(false);
    const [editorOpen, setEditorOpen] = useState<boolean>(false);
    const [editingDoc, setEditingDoc] = useState<TrainingDocument | null>(null);
    const [formState, setFormState] = useState<UpsertTrainingDocumentPayload>(() =>
        emptyTrainingDocumentDraft(defaultPortal),
    );

    const {data, isLoading, isFetching, refetch} = useTrainingOverview(activePortal);
    const allDocuments = useMemo(() => data?.documents ?? [], [data?.documents]);

    const filteredDocuments = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return allDocuments.filter(doc => {
            if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
            if (onlyMandatory && !doc.isMandatory) return false;
            if (!q) return true;
            return (
                doc.code.toLowerCase().includes(q) ||
                doc.title.toLowerCase().includes(q) ||
                doc.summary.toLowerCase().includes(q) ||
                doc.category.toLowerCase().includes(q)
            );
        });
    }, [allDocuments, selectedCategory, onlyMandatory, searchQuery]);

    // A selection hidden by the filters falls back to the first visible document (derived, not stored).
    const activeDocument = useMemo(() => {
        if (!selectedDocCode) return filteredDocuments[0] ?? null;
        return filteredDocuments.find(doc => doc.code === selectedDocCode) ?? filteredDocuments[0] ?? null;
    }, [filteredDocuments, selectedDocCode]);

    // Inputs stay disabled while pending, until the refetched totals have landed too.
    const progressMutation = useTrainingDocumentProgress(activePortal);

    const saveDocumentMutation = useSaveTrainingDocument(editingDoc?.id, {
        onSuccess: saved => {
            setEditorOpen(false);
            setEditingDoc(null);
            setSelectedDocCode(saved.code);
        },
    });

    const portalInfo = PORTAL_META[activePortal];

    const availableCategories = useMemo(() => {
        const set = new Set<string>();
        allDocuments.forEach(doc => {
            if (doc.category) set.add(doc.category);
        });
        return Array.from(set);
    }, [allDocuments]);

    const getCategoryLabel = (categoryKey: string) =>
        PORTAL_META[activePortal]?.categories?.[categoryKey] ||
        PORTAL_META.CUSTOMER.categories[categoryKey] ||
        PORTAL_META.OPERATIONS.categories[categoryKey] ||
        PORTAL_META.ADMIN.categories[categoryKey] ||
        categoryKey;

    const handleToggleStep = (doc: TrainingDocument, stepIdx: number) => {
        // A second click before the first save settles would be computed from the stale checklist.
        if (progressMutation.isPending) return;
        const current = new Set(doc.checkedSteps ?? []);
        if (current.has(stepIdx)) current.delete(stepIdx);
        else current.add(stepIdx);
        const nextSteps = Array.from(current).sort((a, b) => a - b);
        const allDone = doc.checklistSteps.length > 0 && nextSteps.length >= doc.checklistSteps.length;
        progressMutation.mutate({
            documentId: doc.id,
            checkedSteps: nextSteps,
            markCompleted: allDone,
        });
    };

    const handleMarkAllCompleted = (doc: TrainingDocument) => {
        if (progressMutation.isPending) return;
        progressMutation.mutate({
            documentId: doc.id,
            checkedSteps: doc.checklistSteps.map((_, idx) => idx),
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
        saveDocumentMutation.reset();
        setFormState(emptyTrainingDocumentDraft(activePortal, defaultCategory, allDocuments.length + 1));
        setEditorOpen(true);
    };

    const openEditModal = (doc: TrainingDocument) => {
        setEditingDoc(doc);
        saveDocumentMutation.reset();
        setFormState(trainingDocumentDraftFromDetail(doc));
        setEditorOpen(true);
    };

    const docFieldErrors = trainingDocumentFieldErrors(saveDocumentMutation.error);

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
                    <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Làm mới
                    </Button>

                    {manage && (
                        <Button
                            type="button"
                            variant={learnerPreview ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => setLearnerPreview(value => !value)}
                            aria-pressed={learnerPreview}
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Xem như học viên
                        </Button>
                    )}

                    {manage && (
                        <Button type="button" variant="primary" size="sm" onClick={openCreateModal}>
                            <Plus className="h-3.5 w-3.5" />
                            Thêm tài liệu
                        </Button>
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
            ) : (
                <>
                    <TrainingEnrollmentStatsStrip
                        manage={manage}
                        totalDocs={data?.totalDocuments ?? 0}
                        completedDocs={data?.completedDocuments ?? 0}
                        mandatoryDocs={data?.mandatoryDocuments ?? 0}
                        mandatoryCompleted={data?.mandatoryCompleted ?? 0}
                        totalMinutes={data?.totalEstimatedMinutes ?? 0}
                        completedMinutes={data?.completedMinutes ?? 0}
                        allDocsCount={allDocuments.length}
                        availableCategories={availableCategories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                        onlyMandatory={onlyMandatory}
                        onToggleOnlyMandatory={() => setOnlyMandatory(prev => !prev)}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        getCategoryLabel={getCategoryLabel}
                    />

                    <TrainingDocumentMasterDetail
                        isLoading={isLoading}
                        manage={manage}
                        activePortal={activePortal}
                        filteredDocuments={filteredDocuments}
                        activeDocument={activeDocument}
                        isProgressPending={progressMutation.isPending}
                        onSelectDocument={setSelectedDocCode}
                        onEditDocument={openEditModal}
                        onToggleStep={handleToggleStep}
                        onMarkAllCompleted={handleMarkAllCompleted}
                        onResetProgress={handleResetProgress}
                        getCategoryLabel={getCategoryLabel}
                    />
                </>
            )}

            {editorOpen && (
                <TrainingCourseFormModal
                    editingDoc={editingDoc}
                    formState={formState}
                    onChangeForm={setFormState}
                    fieldErrors={docFieldErrors}
                    error={saveDocumentMutation.error}
                    isSaving={saveDocumentMutation.isPending}
                    onClose={() => setEditorOpen(false)}
                    onSubmit={payload => saveDocumentMutation.mutate(payload)}
                />
            )}
        </div>
    );
}
