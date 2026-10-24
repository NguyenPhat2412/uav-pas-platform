import {redirect} from 'next/navigation';
import {authEntryUrl} from '@/features/auth/utils/auth-entry';

export const metadata = {robots: {index: false, follow: false}};
export default function Page() {
    redirect(authEntryUrl('login'));
}
