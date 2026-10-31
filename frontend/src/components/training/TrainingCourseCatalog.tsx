'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {CircleCheck, RefreshCw, Search, X} from 'lucide-react';
import {useTrainingCourses} from '@/hooks/training/useTraining';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import type {TrainingCourseSummary, TrainingPortalTier} from '@/types/training/training.types';
import {PORTAL_META, TRAINING_CATEGORY_ICONS, TrainingDefaultCategoryIcon, trainingCategoryLabel} from '@/utils/training/training-meta';
import {courseCallToAction, matchesCourseSearch} from '@/utils/training/course-helpers';
import type {CourseCallToAction} from '@/utils/training/course-helpers';

/**
 * The learner's course catalogue: a grid of course cards with search and a topic filter.
 * `courseHref` decides where a card leads (the portal's own player, or the admin preview).
 * `embedded` drops the page heading when the catalogue sits inside another page; `manage` (admin
 * preview) tells admins where to add lessons to an empty course.
 */
export function TrainingCourseCatalog({portal, courseHref, embedded = false, manage = false}: {
    portal: TrainingPortalTier;
    courseHref: (slug: string) => string;
    embedded?: boolean;
    manage?: boolean;
}) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('ALL');
    const query = useTrainingCourses(portal);
    const courses = useMemo(() => query.data ?? [], [query.data]);

    const categoryOptions = useMemo(() => {
        const counts = new Map<string, number>();
        courses.forEach(course => counts.set(course.category, (counts.get(course.category) ?? 0) + 1));
        return [
            {value: 'ALL', label: 'Tất cả', count: courses.length},
            ...Array.from(counts, ([value, count]) => ({value, label: trainingCategoryLabel(portal, value), count})),
        ];
    }, [courses, portal]);

    const visible = courses.filter(course =>
        (category === 'ALL' || course.category === category) && matchesCourseSearch(course, search));
    const completed = courses.filter(course => course.status === 'COMPLETED').length;
    const meta = PORTAL_META[portal];

    return (
        <div className="bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                {embedded ? (
                    <p className="text-sm text-muted">Danh mục khóa học như {meta.audience} nhìn thấy.</p>
                ) : (
                    <div className="space-y-1">
                        <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{meta.title}</h1>
                        <p className="text-sm text-muted">
                            {meta.subtitle}
                            {courses.length > 0 && <> · Đã hoàn thành <strong className="text-foreground">{completed}/{courses.length}</strong> khóa</>}
                        </p>
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Tìm khóa học"
                            aria-label="Tìm khóa học"
                            className="h-9 w-full rounded-control border border-border-input bg-card pr-8 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground/40 focus:outline-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Xóa từ khóa"
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <FilterSelect label="Chủ đề" value={category} onChange={setCategory} options={categoryOptions} />
                    <button
                        type="button"
                        onClick={() => void query.refetch()}
                        aria-label="Làm mới"
                        title="Làm mới"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-border-input bg-card text-muted hover:bg-surface-variant hover:text-foreground"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="p-5">
                {query.error ? (
                    <ErrorNotice error={query.error} />
                ) : query.isPending ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" role="status" aria-label="Đang tải khóa học">
                        {[0, 1, 2, 3].map(index => (
                            <div key={index} className="overflow-hidden rounded-panel border border-border">
                                <div className="aspect-video animate-pulse bg-surface-variant" />
                                <div className="space-y-2 p-3">
                                    <div className="h-4 w-3/4 animate-pulse rounded-badge bg-surface-variant" />
                                    <div className="h-3 w-1/2 animate-pulse rounded-badge bg-surface-variant" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 py-14 text-center">
                        <p className="text-sm font-semibold text-foreground">
                            {courses.length === 0 ? 'Chưa có khóa học' : 'Không có khóa học phù hợp'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {courses.length === 0 ? 'Khóa học mới sẽ hiện ở đây.' : 'Thử bỏ bộ lọc hoặc đổi từ khóa.'}
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {visible.map(course => (
                            <li key={course.id}>
                                <CourseCard course={course} href={courseHref(course.slug)} portal={portal} manage={manage} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function CourseCard({course, href, portal, manage}: {course: TrainingCourseSummary; href: string; portal: TrainingPortalTier; manage: boolean}) {
    const cta = courseCallToAction(course.status, course.completedLessons);
    const empty = (course.lessonCount ?? 0) === 0;
    const Icon = TRAINING_CATEGORY_ICONS[course.category] ?? TrainingDefaultCategoryIcon;
    const percent = Math.min(Math.max(Math.round(course.progressPercent ?? 0), 0), 100);
    return (
        <Link
            href={href}
            className="group flex h-full flex-col overflow-hidden rounded-panel border border-border bg-card transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
        >
            <div className="relative aspect-video overflow-hidden border-b border-border bg-surface-variant">
                {course.coverUrl ? (
                    // Signed storage URLs change on every request, so next/image optimisation would not help.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                        <Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden />
                        <span className="px-4 text-center text-[11px] font-medium">{trainingCategoryLabel(portal, course.category)}</span>
                    </div>
                )}
                {course.isMandatory && (
                    <span className="absolute top-2 left-2 rounded-badge bg-card/95 px-1.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
                        Bắt buộc
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-3">
                <h2 className="line-clamp-2 text-sm leading-snug font-semibold text-foreground">{course.title}</h2>
                {course.summary && <p className="line-clamp-1 text-xs text-muted">{course.summary}</p>}
                {!empty && (
                    <p className="text-[11px] text-muted-foreground">
                        {course.lessonCount} bài · {course.estimatedMinutes} phút
                        {(course.documentCount ?? 0) > 0 && ` · ${course.documentCount} tài liệu`}
                    </p>
                )}
                <div className="mt-auto pt-2">
                    {empty ? <EmptyCourseNote manage={manage} /> : <CourseProgress cta={cta} percent={percent} />}
                </div>
            </div>
        </Link>
    );
}

/** A course with no active lessons yet (admins have not added files). */
function EmptyCourseNote({manage}: {manage: boolean}) {
    return (
        <div className="space-y-0.5">
            <span className="inline-flex rounded-badge border border-border bg-surface-variant px-1.5 py-0.5 text-[11px] font-semibold text-muted">Chưa có bài học</span>
            <p className="text-[11px] text-muted-foreground">
                {manage ? 'Thêm video, PDF hoặc tài liệu trong Đào tạo (mục Bài học của khóa).' : 'Nội dung sẽ sớm được cập nhật.'}
            </p>
        </div>
    );
}

function CourseProgress({cta, percent}: {cta: CourseCallToAction; percent: number}) {
    return (
        <>
            {cta === 'continue' && (
                <div className="mb-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-variant" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ">
                        <div className="h-full bg-slate-700" style={{width: `${percent}%`}} />
                    </div>
                    <span className="text-[11px] font-medium text-muted">{percent}%</span>
                </div>
            )}
            {cta === 'done' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <CircleCheck className="h-3.5 w-3.5" />
                    Đã hoàn thành
                </span>
            ) : (
                <span className="text-xs font-semibold text-primary group-hover:underline">
                    {cta === 'continue' ? 'Tiếp tục học' : 'Bắt đầu'}
                </span>
            )}
        </>
    );
}
