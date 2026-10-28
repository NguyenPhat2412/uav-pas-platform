import {useI18n} from '@/contexts/I18nContext';
import type {MissionRequestDetailsData as RequestDetails} from '@/features/missions/types/mission.types';

/** The original customer request, shared by the customer and dispatch detail views. */
export function MissionRequestDetails({mission}: { mission: RequestDetails }) {
    const {t} = useI18n();
    return <dl className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-6 gap-y-4 border-t border-border pt-4">
        <div className="min-w-0">
            <dt className="mb-1 text-xs font-semibold text-muted">{t('missionShared.requestedDate')}</dt>
            <dd className="m-0 break-words text-sm leading-relaxed text-foreground">
                <time dateTime={mission.requestedDate}>{mission.requestedDate.split('-').reverse().join('/')}</time>
            </dd>
        </div>
        {(mission.latitude != null || mission.longitude != null) && <div className="min-w-0">
            <dt className="mb-1 text-xs font-semibold text-muted">{t('missionShared.requestedCoordinates')}</dt>
            <dd className="m-0 break-words text-sm leading-relaxed text-foreground">{t('missionShared.coordinatesValue', {lat: mission.latitude ?? t('missionShared.notEntered'), lng: mission.longitude ?? t('missionShared.notEntered')})}</dd>
        </div>}
        {mission.notes && <div className="col-span-full min-w-0">
            <dt className="mb-1 text-xs font-semibold text-muted">{t('missionShared.requestNotes')}</dt>
            <dd className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{mission.notes}</dd>
        </div>}
    </dl>;
}
