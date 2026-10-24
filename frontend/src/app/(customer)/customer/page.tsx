import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/features/auth/utils/portal';

export default function CustomerIndexPage() {
    redirect(PORTAL_ROUTES.customerHome);
}
