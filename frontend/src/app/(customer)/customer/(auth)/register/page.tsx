import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/features/auth/utils/auth-entry';

export default function RegisterPage() {
    redirect(authEntryUrl('register', '/customer/dashboard'));
}
