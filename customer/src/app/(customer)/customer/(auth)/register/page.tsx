import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/utils/auth/auth-entry';

export default function RegisterPage() {
    redirect(authEntryUrl('register', '/customer/dashboard'));
}
