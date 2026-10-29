'use client';

import {Suspense, use} from 'react';
import {AdminTrainingCoursePreview} from '@/features/training/components/AdminTrainingCoursePreview';

/** An admin opening a course the way a learner sees it ("Xem như học viên"). */
export default function AdminTrainingCoursePreviewRoutePage({params}: {params: Promise<{slug: string}>}) {
    const {slug} = use(params);
    return (
        <Suspense fallback={null}>
            <AdminTrainingCoursePreview slug={slug} />
        </Suspense>
    );
}
