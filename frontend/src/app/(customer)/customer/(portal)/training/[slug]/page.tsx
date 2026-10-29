'use client';

import {Suspense, use} from 'react';
import {PageGuard} from '@/components/customer/layout';
import {TrainingCoursePlayer} from '@/features/training/components/TrainingCoursePlayer';

export default function CustomerTrainingCourseRoutePage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = use(params);
    return (
        <PageGuard permission={null}>
            <Suspense fallback={null}>
                <TrainingCoursePlayer slug={slug} backHref="/customer/training" />
            </Suspense>
        </PageGuard>
    );
}
