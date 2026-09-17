import type { ProcessSortField } from '@app/domain';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { EmptyRow } from '@/shared/components/state/EmptyRow';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';
import type { ProcessNode } from '../hooks/useProcessList';
import { ProcessRow } from './ProcessRow';

interface ProcessTableProps {
    nodes: readonly ProcessNode[];
    sort: { field: ProcessSortField; dir: 'asc' | 'desc' };
    onSort: (field: ProcessSortField) => void;
}

const COLUMNS: readonly { field: ProcessSortField | null; label: string; className?: string }[] = [
    { field: 'identifier', label: 'Nummer', className: 'w-40' },
    { field: 'title', label: 'Prozess' },
    { field: 'area', label: 'Bereich', className: 'w-40' },
    { field: null, label: 'Verfasser', className: 'w-44 hidden md:table-cell' },
    { field: null, label: 'Vorlage', className: 'w-24 hidden sm:table-cell' },
    { field: 'status', label: 'Status', className: 'w-44' },
    { field: null, label: '', className: 'w-10' },
];

function SortableHead({
    column,
    sort,
    onSort,
}: {
    column: (typeof COLUMNS)[number];
    sort: ProcessTableProps['sort'];
    onSort: ProcessTableProps['onSort'];
}) {
    if (column.field === null) return <TableHead className={column.className}>{column.label}</TableHead>;
    const active = sort.field === column.field;
    return (
        <TableHead className={column.className}>
            <button
                type="button"
                onClick={() => onSort(column.field as ProcessSortField)}
                className={cn(
                    'group inline-flex items-center gap-1.5 transition-colors',
                    active ? 'text-foreground font-medium' : 'hover:text-foreground',
                )}
            >
                {column.label}
                {active ? (
                    sort.dir === 'asc' ? (
                        <ArrowUp className="size-3.5" />
                    ) : (
                        <ArrowDown className="size-3.5" />
                    )
                ) : (
                    <ArrowUpDown className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
                )}
            </button>
        </TableHead>
    );
}

function Expander({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onToggle();
            }}
            aria-label={isCollapsed ? 'Aufklappen' : 'Zuklappen'}
            className="hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md"
        >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
    );
}

export function ProcessTable({ nodes, sort, onSort }: ProcessTableProps) {
    const [collapsed, setCollapsed] = useState<readonly string[]>([]);
    const toggle = (id: string) =>
        setCollapsed((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

    return (
        <Table>
            <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                    {COLUMNS.map((column) => (
                        <SortableHead key={column.label} column={column} sort={sort} onSort={onSort} />
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {nodes.length === 0 ? (
                    <EmptyRow
                        colSpan={COLUMNS.length}
                        text="Keine Daten vorhanden."
                        hint="Mit den Filtern oben eingrenzen — oder einen neuen Prozess anlegen."
                    />
                ) : null}
                {nodes.map(({ item, children }) => (
                    <Fragment key={item.id}>
                        <ProcessRow
                            item={item}
                            expander={
                                children.length > 0 ? (
                                    <Expander isCollapsed={collapsed.includes(item.id)} onToggle={() => toggle(item.id)} />
                                ) : undefined
                            }
                        />
                        {collapsed.includes(item.id)
                            ? null
                            : children.map((child) => <ProcessRow key={child.id} item={child} isChild />)}
                    </Fragment>
                ))}
            </TableBody>
        </Table>
    );
}
