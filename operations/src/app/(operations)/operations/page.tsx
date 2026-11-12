import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/utils/auth/portal';

export default function OperationsIndexPage() {
    redirect(PORTAL_ROUTES.operationsHome);
}
