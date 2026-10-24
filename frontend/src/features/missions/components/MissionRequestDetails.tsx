import styles from './MissionRequestDetails.module.css';
import {useI18n} from '@/contexts/I18nContext';

type RequestDetails = {
    requestedDate: string;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
};

/** The original customer request, shared by the customer and dispatch detail views. */
export function MissionRequestDetails({mission}: { mission: RequestDetails }) {
    const {t} = useI18n();
    return <dl className={styles.details}>
        <div>
            <dt>{t('missionShared.requestedDate')}</dt>
            <dd>
                <time dateTime={mission.requestedDate}>{mission.requestedDate.split('-').reverse().join('/')}</time>
            </dd>
        </div>
        {(mission.latitude != null || mission.longitude != null) && <div>
            <dt>{t('missionShared.requestedCoordinates')}</dt>
            <dd>{t('missionShared.coordinatesValue', {lat: mission.latitude ?? t('missionShared.notEntered'), lng: mission.longitude ?? t('missionShared.notEntered')})}</dd>
        </div>}
        {mission.notes && <div className={styles.notes}>
            <dt>{t('missionShared.requestNotes')}</dt>
            <dd>{mission.notes}</dd>
        </div>}
    </dl>;
}
