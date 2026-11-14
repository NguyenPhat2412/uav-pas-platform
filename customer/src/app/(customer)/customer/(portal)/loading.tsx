import {PageSkeleton} from '@/components/ui/PageSkeleton';

// Page changes inside the portal show a page-shaped skeleton; the 3D loader in the parent loading.tsx is only for entry.
export default function PortalLoading() {
    return <PageSkeleton />;
}
