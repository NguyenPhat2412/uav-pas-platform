'use client';
import { displayLabel } from '@uav/ui/presentation';
import { useMemo, useState, type ReactNode } from 'react';
import { type ColumnDef, type SortingState, type ColumnFiltersState, type VisibilityState, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui';
import { EmptyState } from './WorkspaceState';
import { useI18n } from '@/contexts/I18nContext';
export type TableColumn<T> = ColumnDef<T, unknown>;
export interface TableFilter { column: string; label: string; options: { value: string; label: string }[]; }
export function DataTable<T extends { id: number }>({ data, columns, label, filters = [], actions, pageSize = 10, toolbar, searchLabel }: { data: T[]; columns: TableColumn<T>[]; label: string; filters?: TableFilter[]; actions?: ReactNode; pageSize?: number; toolbar?: ReactNode; searchLabel?: string }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [density, setDensity] = useState<'standard' | 'compact'>('standard');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  // TanStack v8 exposes mutable table callbacks; this component intentionally isn't compiler-memoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, state: { globalFilter: search, sorting, columnFilters, columnVisibility: visibility, pagination },
    onGlobalFilterChange: setSearch, onSortingChange: setSorting, onColumnFiltersChange: setColumnFilters, onColumnVisibilityChange: setVisibility, onPaginationChange: setPagination,
    getRowId: row => String(row.id), getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(), globalFilterFn: 'includesString',
  });
  const count = table.getFilteredRowModel().rows.length;
  const namedColumns = table.getAllLeafColumns().filter(column => column.getCanHide());
  const headers = useMemo(() => new Map(columns.map(column => [column.id || ('accessorKey' in column ? String(column.accessorKey) : ''), typeof column.header === 'string' ? column.header : ''])), [columns]);
  return <section className="data-table" aria-label={label}>
    <div className="table-toolbar"><label className="table-search"><Search size={16} /><input aria-label={searchLabel || `${t('console.table.search')} ${label}`} placeholder={`${t('console.table.search')}…`} value={search} onChange={event => { setSearch(event.target.value); table.setPageIndex(0); }} /></label>
      {filters.map(filter => <label key={filter.column} className="table-filter"><span className="sr-only">{filter.label}</span><select aria-label={filter.label} value={String(table.getColumn(filter.column)?.getFilterValue() || '')} onChange={event => { table.getColumn(filter.column)?.setFilterValue(event.target.value); table.setPageIndex(0); }}><option value="">{filter.label}: {t('console.table.all')}</option>{filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>)}
      <button type="button" className="table-density-toggle" aria-pressed={density === 'compact'} onClick={() => setDensity(value => value === 'standard' ? 'compact' : 'standard')}>{density === 'standard' ? t('console.table.densityCompact') : t('console.table.densityStandard')}</button>
      <details className="column-menu"><summary aria-label={t('console.table.columns')}><SlidersHorizontal size={16} /> {t('console.table.columns')}</summary><div>{namedColumns.map(column => <label key={column.id}><input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />{headers.get(column.id) || column.id}</label>)}</div></details>{actions}
    </div>{toolbar}
    <div className={'table-scroll ' + (density === 'compact' ? 'table-scroll-compact' : '')}><table className="console-table"><caption className="sr-only">{label}</caption><thead>{table.getHeaderGroups().map(group => <tr key={group.id}>{group.headers.map(header => <th key={header.id} aria-sort={header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : undefined}>{header.isPlaceholder ? null : header.column.getCanSort() ? <button type="button" onClick={header.column.getToggleSortingHandler()} aria-label={t('console.table.sort', { column: String(header.column.columnDef.header) })}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === 'asc' ? <ArrowUp size={13} /> : header.column.getIsSorted() === 'desc' ? <ArrowDown size={13} /> : <ChevronsUpDown size={13} />}</button> : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row => <tr key={row.id}>{row.getVisibleCells().map(cell => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>
    {!count && <EmptyState title={data.length ? t('console.table.noResults') : t('console.table.noData')} detail={data.length ? t('console.table.changeFilter') : undefined} action={data.length ? <Button size="sm" variant="outline" onClick={() => { setSearch(''); setColumnFilters([]); }}> {t('console.table.clearFilters')}</Button> : undefined} />}
    <footer className="table-pagination"><span>{count ? pagination.pageIndex * pagination.pageSize + 1 : 0}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, count)} / {count} {t('console.table.records')}</span><label>{t('console.table.showing')} <select aria-label={t('console.table.rowsPerPage')} value={pagination.pageSize} onChange={event => table.setPageSize(Number(event.target.value))}>{[5,10,20,50].map(size => <option key={size} value={size}>{size}</option>)}</select></label><Button size="sm" variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>{t('console.table.previous')}</Button><span>{t('console.table.pageOf', { page: pagination.pageIndex + 1, pages: Math.max(1, table.getPageCount()) })}</span><Button size="sm" variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>{t('console.table.next')}</Button></footer>
  </section>;
}
export function options(values: (string | undefined)[]) { return [...new Set(values.filter((value): value is string => !!value))].sort().map(value => ({ value, label: displayLabel(value) === value ? value.replaceAll('_', ' ') : displayLabel(value) })); }
