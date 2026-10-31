import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/utils/auth/portal';

export default function LegacyDispatchAliasPage() {
    redirect(PORTAL_ROUTES.legacyDispatchMissions);
}
