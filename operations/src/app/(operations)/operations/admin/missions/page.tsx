import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/utils/portal';

export default function LegacyDispatchAliasPage() {
    redirect(PORTAL_ROUTES.legacyDispatchMissions);
}
