import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/utils/portal';

export default function LegacyAssignedAliasPage() {
    redirect(PORTAL_ROUTES.legacyAssignedMissions);
}
