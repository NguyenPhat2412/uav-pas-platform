'use client';
import {displayLabel} from "@/lib/presentation";
import {type ReactNode, useMemo, useState} from 'react';
import {
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
    type VisibilityState
} from '@tanstack/react-table';
import {ArrowDown, ArrowUp, ChevronsUpDown, Search, SlidersHorizontal} from 'lucide-react';
import {Button} from '@/components/ui';
import {EmptyState} from "@/components/data/WorkspaceState";
import {useI18n} from '@/providers/I18nContext';
import type {TableColumn, TableFilter} from '@/types/ui';

export type {TableColumn, TableFilter};

export function DataTable<T extends { id: number }>({
                                                        data,
                                                        columns,
                                                        label,
                                                        filters = [],
                                                        actions,
                                                        pageSize = 10,
                                                        toolbar,
                                                        searchLabel
                                                    }: {
    data: T[];
    columns: TableColumn<T>[];
    label: string;
    filters?: TableFilter[];
    actions?: ReactNode;
    pageSize?: number;
    toolbar?: ReactNode;
    searchLabel?: string
}) {
    const {t} = useI18n();
    const [search, setSearch] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [visibility, setVisibility] = useState<VisibilityState>({});
    const [density, setDensity] = useState<'standard' | 'compact'>('standard');
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize});
    // TanStack v8 exposes mutable table callbacks; this component intentionally isn't compiler-memoized.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        state: {globalFilter: search, sorting, columnFilters, columnVisibility: visibility, pagination},
        onGlobalFilterChange: setSearch,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setVisibility,
        onPaginationChange: setPagination,
        getRowId: row => String(row.id),
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: 'includesString',
    });
    const count = table.getFilteredRowModel().rows.length;
    const namedColumns = table.getAllLeafColumns().filter(column => column.getCanHide());
    const headers = useMemo(() => new Map(columns.map(column => [column.id || ('accessorKey' in column ? String(column.accessorKey) : ''), typeof column.header === 'string' ? column.header : ''])), [columns]);
    return (
        <section className="rounded-panel border border-border bg-card overflow-hidden" aria-label={label}>
            <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-slate-50/60 p-3.5">
                <label className="relative flex min-w-[200px] flex-1 items-center">
                    <Search size={16} className="pointer-events-none absolute left-3 text-slate-400"/>
                    <input
                        className="h-9 w-full rounded-control border border-border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                        aria-label={searchLabel || `${t('console.table.search')} ${label}`}
                        placeholder={`${t('console.table.search')}…`}
                        value={search}
                        onChange={event => {
                            setSearch(event.target.value);
                            table.setPageIndex(0);
                        }}
                    />
                </label>
                {filters.map(filter => (
                    <label key={filter.column} className="inline-flex items-center">
                        <span className="sr-only">{filter.label}</span>
                        <select
                            className="h-9 rounded-control border border-border-input bg-card px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                            aria-label={filter.label}
                            value={String(table.getColumn(filter.column)?.getFilterValue() || '')}
                            onChange={event => {
                                table.getColumn(filter.column)?.setFilterValue(event.target.value);
                                table.setPageIndex(0);
                            }}
                        >
                            <option value="">{filter.label}: {t('console.table.all')}</option>
                            {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                ))}
                <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-control border border-border-input bg-card px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    aria-pressed={density === 'compact'}
                    onClick={() => setDensity(value => value === 'standard' ? 'compact' : 'standard')}
                >
                    {density === 'standard' ? t('console.table.densityCompact') : t('console.table.densityStandard')}
                </button>
                <details className="relative">
                    <summary
                        className="inline-flex h-9 list-none items-center gap-1.5 rounded-control border border-border-input bg-card px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        aria-label={t('console.table.columns')}
                    >
                        <SlidersHorizontal size={15}/> {t('console.table.columns')}
                    </summary>
                    <div className="absolute right-0 z-30 mt-1.5 w-48 space-y-1.5 rounded-overlay border border-border bg-card p-3 shadow-lg">
                        {namedColumns.map(column => (
                            <label key={column.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="rounded-control border-border-input text-primary focus:ring-ring"
                                    checked={column.getIsVisible()}
                                    onChange={column.getToggleVisibilityHandler()}
                                />
                                {headers.get(column.id) || column.id}
                            </label>
                        ))}
                    </div>
                </details>
                {actions}
            </div>
            {toolbar}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                    <caption className="sr-only">{label}</caption>
                    <thead className="border-b border-border bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {table.getHeaderGroups().map(group => (
                            <tr key={group.id}>
                                {group.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className={density === 'compact' ? 'px-3 py-2' : 'px-4 py-3'}
                                        aria-sort={
                                            header.column.getIsSorted() === 'asc'
                                                ? 'ascending'
                                                : header.column.getIsSorted() === 'desc'
                                                    ? 'descending'
                                                    : undefined
                                        }
                                    >
                                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 cursor-pointer"
                                                onClick={header.column.getToggleSortingHandler()}
                                                aria-label={t('console.table.sort', {column: String(header.column.columnDef.header)})}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getIsSorted() === 'asc' ? (
                                                    <ArrowUp size={13}/>
                                                ) : header.column.getIsSorted() === 'desc' ? (
                                                    <ArrowDown size={13}/>
                                                ) : (
                                                    <ChevronsUpDown size={13}/>
                                                )}
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                                {row.getVisibleCells().map(cell => (
                                    <td
                                        key={cell.id}
                                        className={density === 'compact' ? 'px-3 py-2 text-xs text-slate-700' : 'px-4 py-3 text-sm text-slate-700'}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!count && (
                <EmptyState
                    title={data.length ? t('console.table.noResults') : t('console.table.noData')}
                    detail={data.length ? t('console.table.changeFilter') : undefined}
                    action={
                        data.length ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    setColumnFilters([]);
                                }}
                            >
                                {t('console.table.clearFilters')}
                            </Button>
                        ) : undefined
                    }
                />
            )}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
                <span>
                    {count ? pagination.pageIndex * pagination.pageSize + 1 : 0}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, count)} / {count} {t('console.table.records')}
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex items-center gap-1.5">
                        {t('console.table.showing')}
                        <select
                            className="h-8 rounded-control border border-border-input bg-card px-2 text-xs font-semibold text-slate-700"
                            aria-label={t('console.table.rowsPerPage')}
                            value={pagination.pageSize}
                            onChange={event => table.setPageSize(Number(event.target.value))}
                        >
                            {[5, 10, 20, 50].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                    <Button size="sm" variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
                        {t('console.table.previous')}
                    </Button>
                    <span className="font-semibold">
                        {t('console.table.pageOf', {
                            page: pagination.pageIndex + 1,
                            pages: Math.max(1, table.getPageCount())
                        })}
                    </span>
                    <Button size="sm" variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
                        {t('console.table.next')}
                    </Button>
                </div>
            </footer>
        </section>
    );
}

export function options(values: (string | undefined)[]) {
    return [...new Set(values.filter((value): value is string => !!value))].sort().map(value => ({
        value,
        label: displayLabel(value) === value ? value.replaceAll('_', ' ') : displayLabel(value)
    }));
}
