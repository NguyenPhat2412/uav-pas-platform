import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/utils/auth/portal';

export default function CustomerIndexPage() {
    redirect(PORTAL_ROUTES.customerHome);
}
