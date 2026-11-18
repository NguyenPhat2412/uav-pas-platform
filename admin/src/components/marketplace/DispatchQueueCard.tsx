'use client';

import {Calendar, FolderKanban, MapPin, Plane, Send, Sparkles, Star, User, Zap} from 'lucide-react';
import {Button, OptionalMark} from '@/components/ui';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {formatMarketplaceVnd} from '@/forms/marketplace/admin-marketplace-form';
import {useI18n} from '@/providers/I18nContext';
import type {AdminDispatchQueueItem} from '@/types/marketplace/marketplace.types';

export function DispatchQueueCard({
    item,
    noteValue,
    canModerate,
    isPending,
    onNoteChange,
    onManualAssign,
    onAutoAssign,
}: {
    item: AdminDispatchQueueItem;
    noteValue: string;
    canModerate: boolean;
    isPending: boolean;
    onNoteChange: (val: string) => void;
    onManualAssign: (providerId: number) => void;
    onAutoAssign: () => void;
}) {
    const {t, formatDate} = useI18n();
    const {mission, candidates} = item;

    return (
        <div className="space-y-3.5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-badge bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-white">
                            {mission.code}
                        </span>
                        <strong className="line-clamp-2 text-base font-semibold text-on-surface">
                            {mission.title}
                        </strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                        {mission.customerName && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <User size={13} aria-hidden="true"/>
                                <strong className="text-on-surface">{mission.customerName}</strong>
                            </span>
                        )}
                        {mission.projectName && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <FolderKanban size={13} aria-hidden="true"/>
                                <span>{mission.projectName}</span>
                            </span>
                        )}
                        {mission.locationName && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <MapPin size={13} aria-hidden="true"/>
                                <span className="max-w-52 truncate">{mission.locationName}</span>
                            </span>
                        )}
                        {mission.requestedDate && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <Calendar size={13} aria-hidden="true"/>
                                <span>{formatDate(mission.requestedDate)}</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                    {mission.quotedSubtotalVnd != null && (
                        <div className="flex items-center gap-1.5">
                            <strong className="text-base font-bold text-primary whitespace-nowrap">
                                {formatMarketplaceVnd(Number(mission.quotedSubtotalVnd))}
                            </strong>
                            <IllustrativeTag/>
                        </div>
                    )}
                    {canModerate && (
                        <Button
                            type="button"
                            size="sm"
                            disabled={isPending || candidates.length === 0}
                            leftIcon={<Zap size={14} aria-hidden="true"/>}
                            onClick={onAutoAssign}
                            className="whitespace-nowrap"
                        >
                            {t('adminCommerce.marketplace.dispatch.autoAssignBtn')}
                        </Button>
                    )}
                </div>
            </div>

            {canModerate && (
                <label className="block space-y-1 text-xs font-semibold text-on-surface">
                    <span className="block">
                        {t('adminCommerce.marketplace.dispatch.noteLabel')}
                        <OptionalMark/>
                    </span>
                    <input
                        type="text"
                        aria-label={`${t('adminCommerce.marketplace.dispatch.noteLabel')} ${mission.code}`}
                        value={noteValue}
                        onChange={e => onNoteChange(e.target.value)}
                        placeholder={t('adminCommerce.marketplace.dispatch.notePlaceholder')}
                        className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                    />
                </label>
            )}

            {candidates.length === 0 ? (
                <div className="rounded-panel border border-dashed border-border px-4 py-3 text-xs text-muted">
                    {t('adminCommerce.marketplace.dispatch.noCandidates')}
                </div>
            ) : (
                <div className="uav-bezel">
                    <div className="uav-bezel-core divide-y divide-border">
                        {candidates.map((cand, idx) => {
                            const isTop = idx === 0;
                            return (
                                <div
                                    key={cand.providerId}
                                    className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5"
                                >
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                                    isTop
                                                        ? 'bg-slate-900 text-white'
                                                        : 'bg-slate-100 text-on-surface'
                                                }`}
                                            >
                                                {isTop && <Sparkles size={11} className="text-amber-400" aria-hidden="true"/>}
                                                {isTop
                                                    ? t('adminCommerce.marketplace.dispatch.topPick')
                                                    : t('adminCommerce.marketplace.dispatch.rankLabel', {rank: idx + 1})}
                                            </span>
                                            <strong className="line-clamp-2 text-sm font-semibold text-on-surface">
                                                {cand.displayName}
                                            </strong>
                                            <span className="rounded-badge border border-slate-200 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-muted tabular-nums">
                                                {t('adminCommerce.marketplace.dispatch.scoreLabel', {
                                                    score: Math.round(cand.score),
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <MapPin size={12} aria-hidden="true"/>
                                                {cand.province} ·{' '}
                                                {t('adminCommerce.marketplace.dispatch.distanceKm', {
                                                    km: Number(cand.distanceKm ?? 0).toFixed(1),
                                                })}
                                            </span>
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <Plane size={12} aria-hidden="true"/>
                                                {t('adminCommerce.marketplace.dispatch.availableUavs', {
                                                    count: cand.availableUavCount,
                                                })}
                                            </span>
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <Star size={12} className="text-amber-500" aria-hidden="true"/>
                                                {Number(cand.ratingAvg ?? 0).toFixed(1)} ({cand.completedMissionsCount})
                                            </span>
                                        </div>
                                    </div>
                                    {canModerate && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={isPending}
                                            leftIcon={<Send size={13} aria-hidden="true"/>}
                                            onClick={() => onManualAssign(cand.providerId)}
                                            className="whitespace-nowrap"
                                        >
                                            {t('adminCommerce.marketplace.dispatch.assignBtn')}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
