export type TrainingPortalTier = 'CUSTOMER' | 'OPERATIONS' | 'ADMIN';

export type TrainingProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type TrainingLevel = 'FOUNDATION' | 'STANDARD' | 'ADVANCED' | 'SOP_CRITICAL';

export interface TrainingDocument {
    id: number;
    code: string;
    slug: string;
    targetPortal: TrainingPortalTier;
    category: string;
    level: TrainingLevel | string;
    versionTag: string;
    estimatedMinutes: number;
    isMandatory: boolean;
    sortOrder: number;
    active: boolean;
    title: string;
    summary: string;
    contentMarkdown: string;
    checklistSteps: string[];
    progressStatus: TrainingProgressStatus;
    checkedSteps: number[];
    completedAt: string | null;
    updatedAt: string | null;
}

export interface TrainingOverview {
    portal: TrainingPortalTier;
    totalDocuments: number;
    completedDocuments: number;
    mandatoryDocuments: number;
    mandatoryCompleted: number;
    totalEstimatedMinutes: number;
    completedMinutes: number;
    documents: TrainingDocument[];
}

export interface UpdateTrainingProgressPayload {
    checkedSteps: number[];
    markCompleted?: boolean;
}

export interface UpsertTrainingDocumentPayload {
    code: string;
    targetPortal: TrainingPortalTier;
    category: string;
    level: string;
    versionTag?: string;
    estimatedMinutes: number;
    isMandatory: boolean;
    sortOrder: number;
    active: boolean;
    title: string;
    summary: string;
    contentMarkdown: string;
    checklistSteps: string[];
}

export interface TrainingAcademyWorkspaceProps {
    defaultPortal: TrainingPortalTier;
    /** Admin view: add and edit documents instead of tracking the reader's own progress. */
    manage?: boolean;
}

/** Where /admin/training lands: the sidebar lists the customer, operations and admin catalogues separately. */
export const TRAINING_ADMIN_HOME = '/admin/training/customer';
