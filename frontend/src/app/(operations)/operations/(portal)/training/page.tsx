'use client';

import {OperationsPage} from '@/components/layout/OperationsPage';
import {TrainingAcademyWorkspace} from '@/features/training/components/TrainingAcademyWorkspace';

export default function OperationsTrainingRoutePage() {
    return (
        <OperationsPage permission={null} activeResource="training">
            <TrainingAcademyWorkspace defaultPortal="OPERATIONS" />
        </OperationsPage>
    );
}
