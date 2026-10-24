'use client';
import {useState} from 'react';
import {eventNote, eventTitle, formatDate, type TimelineEvent} from "@/components/shared/presentation";
import {useI18n} from '@/contexts/I18nContext';

export function MissionTimeline({events, showActor = false}: { events: TimelineEvent[]; showActor?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const {t} = useI18n();
    const ordered = [...events].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id - b.id).reverse();
    const visible = expanded ? ordered : ordered.slice(0, 4);
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                <p>{t('missionShared.latestUpdates')}</p>
                <span className="rounded-panel bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700">
                    {t('missionShared.eventCount', {count: events.length})}
                </span>
            </div>
            {!events.length ? (
                <p className="text-sm text-slate-500">{t('missionShared.noUpdates')}</p>
            ) : (
                <ol className="relative space-y-4 border-l-2 border-slate-200 pl-4 ml-2">
                    {visible.map((event, index) => (
                        <li className="relative space-y-1" key={event.id}>
                            <span
                                className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card ${
                                    index === 0 ? 'bg-primary' : 'bg-slate-300'
                                }`}
                                aria-hidden="true"
                            />
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <strong className="text-sm font-bold text-slate-900">{eventTitle(event)}</strong>
                                    <time dateTime={event.createdAt} className="text-xs tabular-nums text-slate-400">
                                        {formatDate(event.createdAt)}
                                    </time>
                                </div>
                                {eventNote(event) && <p className="text-xs leading-relaxed text-slate-600">{eventNote(event)}</p>}
                                {showActor && event.actor && (
                                    <small className="block text-[11px] font-medium text-slate-400">
                                        {t('missionShared.performedBy', {actor: event.actor})}
                                    </small>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            {events.length > 4 && (
                <button
                    className="inline-flex items-center text-xs font-bold text-primary hover:underline cursor-pointer"
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? t('missionShared.collapseHistory') : t('missionShared.showAllEvents', {count: events.length})}
                </button>
            )}
        </div>
    );
}
