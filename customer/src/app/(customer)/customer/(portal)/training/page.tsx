'use client';

import {PageGuard} from '@/components/customer/CustomerLayout';
import {TrainingCourseCatalog} from '@/components/training/catalog/TrainingCourseCatalog';

export default function CustomerTrainingRoutePage() {
    return (
        <PageGuard permission={null}>
            <TrainingCourseCatalog portal="CUSTOMER" courseHref={slug => `/customer/training/${encodeURIComponent(slug)}`} />
        </PageGuard>
    );
}
