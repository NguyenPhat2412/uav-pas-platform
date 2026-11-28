import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/utils/portal';

export default function OperationsIndexPage() {
    redirect(PORTAL_ROUTES.operationsHome);
}
