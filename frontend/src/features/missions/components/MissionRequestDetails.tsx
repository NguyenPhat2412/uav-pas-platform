import styles from './MissionRequestDetails.module.css';

type RequestDetails = {
  requestedDate: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
};

/** The original customer request, shared by the customer and dispatch detail views. */
export function MissionRequestDetails({ mission }: { mission: RequestDetails }) {
  return <dl className={styles.details}>
    <div><dt>Ngày yêu cầu</dt><dd><time dateTime={mission.requestedDate}>{mission.requestedDate.split('-').reverse().join('/')}</time></dd></div>
    {(mission.latitude != null || mission.longitude != null) && <div><dt>Tọa độ yêu cầu</dt><dd>Vĩ độ: {mission.latitude ?? 'Chưa nhập'} · Kinh độ: {mission.longitude ?? 'Chưa nhập'}</dd></div>}
    {mission.notes && <div className={styles.notes}><dt>Ghi chú yêu cầu</dt><dd>{mission.notes}</dd></div>}
  </dl>;
}
