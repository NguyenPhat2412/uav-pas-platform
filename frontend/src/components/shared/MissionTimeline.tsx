'use client';
import {useState} from 'react';
import {eventNote, eventTitle, formatDate, type TimelineEvent} from "@/components/shared/presentation";
import {useI18n} from '@/contexts/I18nContext';

export function MissionTimeline({events, showActor = false}: { events: TimelineEvent[]; showActor?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const {t} = useI18n();
    const ordered = [...events].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id - b.id).reverse();
    const visible = expanded ? ordered : ordered.slice(0, 4);
    return <div className="mission-history">
        <div className="history-intro"><p>{t('missionShared.latestUpdates')}</p><span>{t('missionShared.eventCount', {count: events.length})}</span></div>
        {!events.length ? <p className="mission-muted">{t('missionShared.noUpdates')}</p> :
            <ol className="mission-timeline">{visible.map((event, index) => <li className="timeline-item"
                                                                                key={event.id}>
                <span className={`history-marker ${index === 0 ? 'history-marker-latest' : ''}`} aria-hidden="true"/>
                <div className="history-content"><strong>{eventTitle(event)}</strong>
                    <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                    {eventNote(event) && <p>{eventNote(event)}</p>}{showActor && event.actor &&
                        <small>{t('missionShared.performedBy', {actor: event.actor})}</small>}</div>
            </li>)}</ol>}
        {events.length > 4 && <button className="history-toggle" type="button" aria-expanded={expanded}
                                      onClick={() => setExpanded(!expanded)}>{expanded ? t('missionShared.collapseHistory') : t('missionShared.showAllEvents', {count: events.length})}</button>}
    </div>;
}
