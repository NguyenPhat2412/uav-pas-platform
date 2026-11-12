'use client';

import {Suspense, use} from 'react';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {TrainingCoursePlayer} from '@/components/training/TrainingCoursePlayer';

export default function OperationsTrainingCourseRoutePage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = use(params);
    return (
        <OperationsPage permission={null} activeResource="training">
            <Suspense fallback={null}>
                <TrainingCoursePlayer slug={slug} backHref="/operations/training" />
            </Suspense>
        </OperationsPage>
    );
}
