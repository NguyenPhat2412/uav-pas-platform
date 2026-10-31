import {redirect} from 'next/navigation';
import {SECURITY_HOME} from '@/types/security/security.types';

export default function Page() {
    redirect(SECURITY_HOME);
}
