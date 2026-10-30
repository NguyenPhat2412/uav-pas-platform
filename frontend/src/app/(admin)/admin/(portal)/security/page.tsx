import {redirect} from 'next/navigation';
import {SECURITY_HOME} from '@/features/security/types/security.types';

export default function Page() {
    redirect(SECURITY_HOME);
}
