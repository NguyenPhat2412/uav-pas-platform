import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/utils/auth/auth-entry';

export default function LoginPage() {
    redirect(authEntryUrl('login', '/operations/overview'));
}
