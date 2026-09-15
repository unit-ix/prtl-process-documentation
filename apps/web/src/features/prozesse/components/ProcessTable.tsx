import type { ProcessSortField } from '@app/domain';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
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
                className={cn('hover:text-foreground transition-colors', active && 'text-foreground font-medium')}
            >
                {column.label}
                {active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
        </TableHead>
    );
}

function Expander({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isCollapsed ? 'Aufklappen' : 'Zuklappen'}
            className="hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md"
        >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
    );
}

function EmptyRow() {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={COLUMNS.length} className="text-muted-foreground py-16 text-center">
                Keine Daten vorhanden.
            </TableCell>
        </TableRow>
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
                {nodes.length === 0 ? <EmptyRow /> : null}
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
