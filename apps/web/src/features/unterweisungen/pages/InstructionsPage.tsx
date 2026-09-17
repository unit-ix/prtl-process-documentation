import type { InstructionListItem } from '@app/domain';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { EmptyRow } from '@/shared/components/state/EmptyRow';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';
import { InstructionCreateSheet } from '../components/InstructionCreateSheet';
import { useInstructions } from '../hooks/useInstructions';
import { instructionStatusStyles } from '../mappings/instructionMappings';

const formatDate = (iso: string | null): string =>
    iso === null ? '—' : new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

function InstructionRow({ item }: { item: InstructionListItem }) {
    return (
        <TableRow className="border-border/40">
            <TableCell>
                <Link to={`/instructions/${item.id}`} className="font-medium hover:underline">
                    {item.process.title}
                </Link>
                <p className="text-muted-foreground font-mono text-xs">{item.process.identifier ?? '—'}</p>
            </TableCell>
            <TableCell className="hidden sm:table-cell">{item.instructionType}</TableCell>
            <TableCell>{formatDate(item.dueDate)}</TableCell>
            <TableCell>
                {item.counts.confirmed} / {item.counts.total}
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={cn('rounded-full border font-medium', instructionStatusStyles[item.status])}>
                    {item.status}
                </Badge>
            </TableCell>
        </TableRow>
    );
}

export function InstructionsPage() {
    const { data, isPending, error, refetch } = useInstructions();
    const items = data ?? [];

    return (
        <div className="space-y-8">
            <PageHeader
                title="Unterweisungen"
                description="Mitarbeiter auf einen freigegebenen Prozess unterweisen und die Kenntnisnahme nachweisen."
                actions={<InstructionCreateSheet />}
            />

            <AsyncBoundary isLoading={isPending} error={error} onRetry={() => void refetch()}>
                <Card className="glass-elevated border-border/40 overflow-hidden rounded-3xl p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/40 hover:bg-transparent">
                                <TableHead>Prozess</TableHead>
                                <TableHead className="hidden w-28 sm:table-cell">Art</TableHead>
                                <TableHead className="w-32">Frist</TableHead>
                                <TableHead className="w-28">Bestätigt</TableHead>
                                <TableHead className="w-36">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <EmptyRow
                                    colSpan={5}
                                    text="Noch keine Unterweisung angelegt."
                                    hint="Eine Unterweisung verweist immer auf einen freigegebenen Prozess."
                                />
                            ) : (
                                items.map((item) => <InstructionRow key={item.id} item={item} />)
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </AsyncBoundary>
        </div>
    );
}
