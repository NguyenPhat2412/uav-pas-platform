'use client';

import {CheckCircle2, Search, X} from 'lucide-react';
import {Badge, Button, Input} from '@/components/ui';

export interface TrainingEnrollmentStatsStripProps {
    manage: boolean;
    totalDocs: number;
    completedDocs: number;
    mandatoryDocs: number;
    mandatoryCompleted: number;
    totalMinutes: number;
    completedMinutes: number;
    allDocsCount: number;
    availableCategories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    onlyMandatory: boolean;
    onToggleOnlyMandatory: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    getCategoryLabel: (categoryKey: string) => string;
}

export function TrainingEnrollmentStatsStrip({
    manage,
    totalDocs,
    completedDocs,
    mandatoryDocs,
    mandatoryCompleted,
    totalMinutes,
    completedMinutes,
    allDocsCount,
    availableCategories,
    selectedCategory,
    onSelectCategory,
    onlyMandatory,
    onToggleOnlyMandatory,
    searchQuery,
    onSearchChange,
    getCategoryLabel,
}: TrainingEnrollmentStatsStripProps) {
    const completionPct = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
    const isMandatoryCertified = mandatoryDocs > 0 && mandatoryCompleted >= mandatoryDocs;

    return (
        <>
            {/* SUMMARY: the learner's progress, or the catalogue size for admins */}
            {manage ? (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 text-sm text-muted">
                    <span>
                        <strong className="text-foreground">{totalDocs}</strong> tài liệu
                    </span>
                    <span>
                        <strong className="text-foreground">{mandatoryDocs}</strong> bắt buộc
                    </span>
                    <span>
                        <strong className="text-foreground">{totalMinutes}</strong> phút học
                    </span>
                </div>
            ) : (
                <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-5">
                    <div className="flex items-center gap-3 sm:w-72">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-variant">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{width: `${completionPct}%`}}
                            />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{completionPct}%</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
                        <span>
                            Đã học <strong className="text-foreground">{completedDocs}/{totalDocs}</strong> bài
                        </span>
                        <span>
                            {isMandatoryCertified ? (
                                'Đã xong các bài bắt buộc'
                            ) : (
                                <>
                                    Bắt buộc còn{' '}
                                    <strong className="text-foreground">{mandatoryDocs - mandatoryCompleted}</strong>
                                </>
                            )}
                        </span>
                        <span>
                            <strong className="text-foreground">{completedMinutes}/{totalMinutes}</strong> phút
                        </span>
                    </div>
                    {isMandatoryCertified && (
                        <Badge className="inline-flex w-fit items-center gap-1 border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đạt chuẩn
                        </Badge>
                    )}
                </div>
            )}

            {/* FILTER & SEARCH BAR */}
            <div className="flex flex-col justify-between gap-3 bg-surface-variant/50 px-5 py-3 lg:flex-row lg:items-center">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                        type="button"
                        variant={selectedCategory === 'ALL' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => onSelectCategory('ALL')}
                        className="h-7 px-2.5 text-xs"
                    >
                        Tất cả ({allDocsCount})
                    </Button>
                    {availableCategories.map(cat => {
                        const active = selectedCategory === cat;
                        return (
                            <Button
                                key={cat}
                                type="button"
                                variant={active ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => onSelectCategory(cat)}
                                className="h-7 px-2.5 text-xs"
                            >
                                {getCategoryLabel(cat)}
                            </Button>
                        );
                    })}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onToggleOnlyMandatory}
                        className={`h-7 px-2.5 text-xs ${
                            onlyMandatory
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : ''
                        }`}
                    >
                        Chỉ bài bắt buộc
                    </Button>
                </div>

                <div className="relative w-full lg:w-72">
                    <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Tìm bài học..."
                        aria-label="Tìm bài học"
                        className="h-8 pr-8 pl-8 text-xs"
                    />
                    {searchQuery && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onSearchChange('')}
                            aria-label="Xóa từ khóa"
                            className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 px-0"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
