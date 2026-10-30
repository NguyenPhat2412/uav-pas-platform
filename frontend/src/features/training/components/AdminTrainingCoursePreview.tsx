'use client';

import {useQuery} from '@tanstack/react-query';
import {useSearchParams} from 'next/navigation';
import {AdminPage} from '@/components/layout/AdminPage';
import {trainingService} from '@/lib/api/resources';
import type {TrainingPortalTier} from '@/features/training/types/training.types';
import {TrainingCoursePlayer, trainingCourseQueryKey} from '@/features/training/components/TrainingCoursePlayer';
import {adminTrainingHome} from '@/features/training/utils/training-meta';

const PORTALS: readonly TrainingPortalTier[] = ['CUSTOMER', 'OPERATIONS', 'ADMIN'];

/**
 * The course player inside the admin shell. The sidebar highlights the training entry of the
 * course's portal (taken from the course once loaded, from `?portal=` until then).
 */
export function AdminTrainingCoursePreview({slug}: {slug: string}) {
    const searchParams = useSearchParams();
    const {data: course} = useQuery({
        queryKey: trainingCourseQueryKey(slug),
        queryFn: ({signal}) => trainingService.getCourse(slug, signal),
    });
    const hinted = searchParams.get('portal') as TrainingPortalTier | null;
    const portal: TrainingPortalTier = course?.targetPortal ?? (hinted && PORTALS.includes(hinted) ? hinted : 'CUSTOMER');
    const home = adminTrainingHome(portal);
    return (
        // activeDestination matches a resource without its leading slash.
        <AdminPage title="Xem như học viên" permission="DASHBOARD_READ" activeResource={home.slice(1)}>
            <TrainingCoursePlayer
                slug={slug}
                backHref={home}
                backLabel="Quay lại quản lý"
                emptyHint="Thêm video, PDF hoặc tài liệu trong Đào tạo: mở khóa học và kéo thả tệp vào mục Bài học."
            />
        </AdminPage>
    );
}
