import {redirect} from 'next/navigation';
import {PORTAL_ROUTES} from '@/features/auth/utils/portal';

export default function LegacyAssignedAliasPage() {
    redirect(PORTAL_ROUTES.legacyAssignedMissions);
}
