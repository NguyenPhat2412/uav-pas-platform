import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/features/auth/utils/portal';

export default function AdminIndexPage() {
    redirect(PORTAL_ROUTES.adminHome);
}
