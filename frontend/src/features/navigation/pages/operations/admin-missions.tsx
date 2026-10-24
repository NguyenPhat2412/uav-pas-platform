import {redirect} from 'next/navigation';

export default function LegacyDispatchAlias() {
    redirect("/operations/dispatch/missions");
}
