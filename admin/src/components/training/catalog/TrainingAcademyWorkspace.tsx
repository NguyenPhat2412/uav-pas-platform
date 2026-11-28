'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {BookOpenCheck, Eye, Plus, RefreshCw, ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {
    useSaveTrainingDocument,
    useTrainingDocumentProgress,
    useTrainingOverview,
} from '@/hooks/useTraining';
import {
    emptyTrainingDocumentDraft,
    trainingDocumentDraftFromDetail,
    trainingDocumentFieldErrors,
} from '@/forms/training-form';
import type {
    TrainingAcademyWorkspaceProps,
    TrainingDocument,
    UpsertTrainingDocumentPayload,
} from '@/types/training.types';
import {adminTrainingPreviewHref, PORTAL_META} from '@/utils/training-meta';
import {TrainingCourseCatalog} from '@/components/training/catalog/TrainingCourseCatalog';
import {TrainingCourseFormModal} from '@/components/training/editor/TrainingCourseFormModal';
import {TrainingDocumentMasterDetail} from '@/components/training/catalog/TrainingDocumentMasterDetail';
import {TrainingEnrollmentStatsStrip} from '@/components/training/catalog/TrainingEnrollmentStatsStrip';
import {TrainingGovernanceGuideBanner} from '@/components/training/catalog/TrainingGovernanceGuideBanner';

/**
 * Operations training entry: when an operator is granted `USER_PERMISSION_MANAGE`, they can add
 * courses, upload PDF/video/slide lessons, view them inline and toggle to the learner catalogue.
 * Operators without management permission see the learner course catalogue directly.
 */
export function OperationsTrainingWorkspace() {
    const {can} = useAuth();
    const canManage = can('USER_PERMISSION_MANAGE');

    if (!canManage) {
        return (
            <TrainingCourseCatalog
                portal="OPERATIONS"
                courseHref={slug => `/operations/training/${encodeURIComponent(slug)}`}
            />
        );
    }

    return (
        <TrainingAcademyWorkspace
            defaultPortal="OPERATIONS"
            manage
            learnerBasePath="/operations/training"
        />
    );
}

/**
 * Training for one portal. Customers and operations staff read lessons and tick off checklists;
 * with `manage` (admin or authorised operations pages) the catalogue is shown with add/edit and
 * inline PDF/video lesson management.
 */
export function TrainingAcademyWorkspace({
    defaultPortal,
    manage = false,
    learnerBasePath,
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
                            ? `Thêm, sửa hoặc ẩn khóa học, tải tệp PDF và video đào tạo mà ${portalInfo.audience} thấy trong mục Đào tạo.`
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
                            {learnerPreview ? 'Quản lý đào tạo' : 'Xem như học viên'}
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

            {manage && !learnerBasePath && (
                <div className="flex flex-col justify-between gap-3 bg-surface-variant/40 px-5 py-3 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap items-center gap-1.5" role="navigation" aria-label="Phân khu tài liệu đào tạo">
                        {(
                            [
                                {portal: 'CUSTOMER' as const, href: '/admin/training/customer', label: 'Khách hàng'},
                                {portal: 'OPERATIONS' as const, href: '/admin/training/operations', label: 'SOP Điều hành & Đội bay'},
                                {portal: 'ADMIN' as const, href: '/admin/training/admin', label: 'Quy chuẩn Quản trị'},
                            ] as const
                        ).map(tab => {
                            const isCurrent = activePortal === tab.portal;
                            return (
                                <Link
                                    key={tab.portal}
                                    href={tab.href}
                                    aria-current={isCurrent ? 'page' : undefined}
                                    className={`inline-flex items-center rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        isCurrent
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-border bg-card text-foreground hover:bg-surface-variant'
                                    }`}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5">
                            <BookOpenCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true"/>
                            <span>Quản lý tài liệu SOP vận hành và hướng dẫn chuẩn bị 8 hạng mục hồ sơ đối tác.</span>
                        </span>
                        <Link
                            href="/admin/marketplace/providers"
                            className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-primary hover:underline"
                        >
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
                            <span>Mở duyệt đối tác</span>
                        </Link>
                    </div>
                </div>
            )}

            {manage && !learnerBasePath && (
                <TrainingGovernanceGuideBanner activePortal={activePortal} />
            )}

            {manage && learnerPreview ? (
                <TrainingCourseCatalog
                    portal={activePortal}
                    embedded
                    manage
                    courseHref={slug => adminTrainingPreviewHref(slug, activePortal, null, learnerBasePath)}
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
                        learnerBasePath={learnerBasePath}
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
