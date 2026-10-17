'use client';
import { useState } from 'react';
import { eventNote, eventTitle, formatDate, type TimelineEvent } from './presentation';
export function MissionTimeline({ events, showActor = false }: { events: TimelineEvent[]; showActor?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const ordered = [...events].sort((a,b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id-b.id).reverse();
  const visible = expanded ? ordered : ordered.slice(0, 4);
  return <div className="mission-history">
    <div className="history-intro"><p>Cập nhật mới nhất</p><span>{events.length} sự kiện</span></div>
    {!events.length ? <p className="mission-muted">Chưa có cập nhật.</p> : <ol className="mission-timeline">{visible.map((event, index) => <li className="timeline-item" key={event.id}>
      <span className={`history-marker ${index === 0 ? 'history-marker-latest' : ''}`} aria-hidden="true" />
      <div className="history-content"><strong>{eventTitle(event)}</strong><time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
      {eventNote(event) && <p>{eventNote(event)}</p>}{showActor && event.actor && <small>Thực hiện bởi {event.actor}</small>}</div>
    </li>)}</ol>}
    {events.length > 4 && <button className="history-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn lịch sử' : `Xem toàn bộ ${events.length} sự kiện`}</button>}
  </div>;
}
