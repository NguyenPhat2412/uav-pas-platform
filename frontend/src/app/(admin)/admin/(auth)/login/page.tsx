import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/features/auth/utils/auth-entry';

export default function Page() {
    redirect(authEntryUrl('login', '/admin/dashboard'));
}
