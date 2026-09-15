import type { InstructionListItem } from '@app/domain';
import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
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
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                        PRETTL electronics
                    </p>
                    <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight md:text-3xl">
                        Unterweisungen
                    </h1>
                    <p className="text-muted-foreground max-w-xl text-sm">
                        Mitarbeiter auf einen freigegebenen Prozess unterweisen und die Kenntnisnahme nachweisen.
                    </p>
                </div>
                <InstructionCreateSheet />
            </header>

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
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-muted-foreground py-16 text-center">
                                        <GraduationCap className="mx-auto mb-2 size-6" />
                                        Keine Daten vorhanden.
                                    </TableCell>
                                </TableRow>
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
