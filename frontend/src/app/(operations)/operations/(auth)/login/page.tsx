import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/features/auth/utils/auth-entry';

export default function LoginPage() {
    redirect(authEntryUrl('login', '/operations/overview'));
}
