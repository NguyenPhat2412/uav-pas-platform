'use client';

import {OperationsPage} from '@/components/layout/OperationsPage';
import {TrainingCourseCatalog} from '@/features/training/components/TrainingCourseCatalog';

export default function OperationsTrainingRoutePage() {
    return (
        <OperationsPage permission={null} activeResource="training">
            <TrainingCourseCatalog portal="OPERATIONS" courseHref={slug => `/operations/training/${encodeURIComponent(slug)}`} />
        </OperationsPage>
    );
}
