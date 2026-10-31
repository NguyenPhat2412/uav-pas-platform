'use client';

import {Suspense, use} from 'react';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {TrainingCoursePlayer} from '@/components/training/TrainingCoursePlayer';

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
