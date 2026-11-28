import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/utils/auth-entry';

export default function Page() {
    redirect(authEntryUrl('login', '/admin/dashboard'));
}
