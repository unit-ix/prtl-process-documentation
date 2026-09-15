import type { InstructionDetailView } from '@app/domain';
import { Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';
import { participantStatusStyles } from '../mappings/instructionMappings';

const formatDate = (iso: string | null): string =>
    iso === null ? '-' : new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface ParticipantTableProps {
    instruction: InstructionDetailView;
    isPending: boolean;
    onConfirm: (participantId: string) => void;
}

function ParticipantRow({
    participant,
    canConfirm,
    isPending,
    onConfirm,
}: {
    participant: InstructionDetailView['participants'][number];
    canConfirm: boolean;
    isPending: boolean;
    onConfirm: (participantId: string) => void;
}) {
    return (
        <TableRow className="border-border/40">
            <TableCell>
                {participant.user.displayName}
                {participant.hasMail ? null : <span className="text-muted-foreground text-xs"> · Keine E-Mail</span>}
            </TableCell>
            <TableCell className="text-muted-foreground hidden sm:table-cell">
                {participant.user.areaTitle ?? '-'}
            </TableCell>
            <TableCell className={cn('font-medium', participantStatusStyles[participant.status])}>
                {participant.status}
            </TableCell>
            <TableCell className="text-muted-foreground hidden md:table-cell">
                {formatDate(participant.notifiedAt)}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(participant.confirmedAt)}</TableCell>
            {canConfirm ? (
                <TableCell>
                    {participant.status === 'Offen' ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                            disabled={isPending}
                            onClick={() => onConfirm(participant.id)}
                        >
                            <Check className="size-3.5" /> Bestätigen
                        </Button>
                    ) : null}
                </TableCell>
            ) : null}
        </TableRow>
    );
}

export function ParticipantTable({ instruction, isPending, onConfirm }: ParticipantTableProps) {
    const canConfirm = instruction.permissions.canConfirmForOthers;

    return (
        <Table>
            <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Abteilung</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="hidden w-32 md:table-cell">Benachrichtigt</TableHead>
                    <TableHead className="w-32">Bestätigt am</TableHead>
                    {canConfirm ? <TableHead className="w-28" /> : null}
                </TableRow>
            </TableHeader>
            <TableBody>
                {instruction.participants.map((participant) => (
                    <ParticipantRow
                        key={participant.id}
                        participant={participant}
                        canConfirm={canConfirm}
                        isPending={isPending}
                        onConfirm={onConfirm}
                    />
                ))}
            </TableBody>
        </Table>
    );
}
