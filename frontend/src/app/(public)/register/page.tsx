import {redirect} from 'next/navigation';
import {customerUrl} from "@/features/marketing/content/origins";

export const metadata = {robots: {index: false, follow: false}};
export default function Page() {
    redirect(`${customerUrl}/register`)
}
