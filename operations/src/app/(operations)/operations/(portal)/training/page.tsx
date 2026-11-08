'use client';

import {OperationsPage} from '@/components/layout/OperationsPage';
import {OperationsTrainingWorkspace} from '@/components/training/TrainingAcademyWorkspace';

export default function OperationsTrainingRoutePage() {
    return (
        <OperationsPage permission={null} activeResource="training">
            <OperationsTrainingWorkspace />
        </OperationsPage>
    );
}
