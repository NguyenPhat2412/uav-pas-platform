import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/utils/auth/portal';

export default function AdminIndexPage() {
    redirect(PORTAL_ROUTES.adminHome);
}
