import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/utils/auth-entry';

export default function LoginPage() {
    redirect(authEntryUrl('login', '/customer/dashboard'));
}
