import {
    DOCUMENT_NUMBER_DIGITS,
    PROCESS_STATUS_LABELS,
    type NumberArea,
    type NumberedProcess,
} from '@app/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { masterDataRepository, processRepository } from '@/data';
import type { ChangeNumberInput } from '@/data/ports/ProcessRepository';
import { EmptyState } from '@/shared/components/state/EmptyState';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

const pad = (value: number | null): string =>
    value === null ? '___' : String(value).padStart(DOCUMENT_NUMBER_DIGITS, '0');

interface NumberInputProps {
    value: number | null;
    label: string;
    disabled: boolean;
    onSave: (value: number) => void;
}

// Gespeichert wird beim Verlassen des Feldes oder mit Enter — nicht bei jedem Tastendruck, sonst
// prüft die API 1, dann 12, dann 123 und meldet unterwegs Konflikte, die keiner gemeint hat.
function NumberInput({ value, label, disabled, onSave }: NumberInputProps) {
    const shown = value === null ? '' : String(value);
    const [draft, setDraft] = useState(shown);
    useEffect(() => setDraft(shown), [shown]);

    const commit = () => {
        const next = Number(draft);
        if (draft === '' || next < 1) return setDraft(shown);
        if (next !== value) onSave(next);
    };

    return (
        <Input
            aria-label={label}
            inputMode="numeric"
            placeholder="—"
            className="h-8 w-16 px-2 font-mono"
            value={draft}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setDraft(shown);
            }}
        />
    );
}

interface RowProps {
    process: NumberedProcess;
    area: NumberArea;
    parent: NumberedProcess | null;
    isPending: boolean;
    onSave: (id: string, input: ChangeNumberInput) => void;
}

function NumberRow({ process, area, parent, isPending, onSave }: RowProps) {
    const prefix = parent === null ? `${area.shortCode}.` : `${area.shortCode}.${pad(parent.documentNumber)}_`;
    const value = parent === null ? process.documentNumber : process.subNumber;

    return (
        <TableRow>
            <TableCell>
                <div className={`flex items-center gap-1 font-mono text-sm ${parent === null ? '' : 'pl-6'}`}>
                    <span className="text-muted-foreground">{prefix}</span>
                    <NumberInput
                        value={value}
                        label={`Nummer für ${process.title}`}
                        disabled={isPending}
                        onSave={(next) =>
                            onSave(process.id, parent === null ? { documentNumber: next } : { subNumber: next })
                        }
                    />
                </div>
            </TableCell>
            <TableCell className={parent === null ? 'font-medium' : ''}>{process.title}</TableCell>
            <TableCell>{process.specificationType}</TableCell>
            <TableCell className="text-muted-foreground">{PROCESS_STATUS_LABELS[process.status]}</TableCell>
            <TableCell className="font-mono text-xs">
                {process.identifier ?? <span className="text-muted-foreground italic">noch nicht vergeben</span>}
            </TableCell>
        </TableRow>
    );
}

function AreaTable({ area, isPending, onSave }: { area: NumberArea } & Pick<RowProps, 'isPending' | 'onSave'>) {
    return (
        <Card className="glass-card border-border/40 space-y-3 rounded-2xl p-6">
            <h2 className="text-sm font-semibold">
                {area.title} <span className="text-muted-foreground font-mono text-xs">{area.shortCode}</span>
            </h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-48">Nummer</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead className="w-16">Art</TableHead>
                        <TableHead className="w-40">Status</TableHead>
                        <TableHead className="w-56">Kennzeichen</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {area.processes.flatMap((process) => [
                        <NumberRow key={process.id} {...{ process, area, isPending, onSave }} parent={null} />,
                        ...process.children.map((child) => (
                            <NumberRow key={child.id} {...{ area, isPending, onSave }} process={child} parent={process} />
                        )),
                    ])}
                </TableBody>
            </Table>
        </Card>
    );
}

export function NumberSettings() {
    const queryClient = useQueryClient();
    const { data, isPending } = useQuery({ queryKey: ['numbers'], queryFn: () => masterDataRepository.numbers() });

    const change = useMutation({
        mutationFn: ({ id, input }: { id: string; input: ChangeNumberInput }) => processRepository.changeNumber(id, input),
        onSuccess: async () => {
            toast.success('Nummer gespeichert.');
            await Promise.all(
                [['numbers'], ['processes'], ['process']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
            );
        },
        // Abgelehnt (z. B. Nummer schon vergeben): das Feld springt beim Neuladen auf den alten Wert.
        onError: async (error: Error) => {
            toast.error(error.message);
            await queryClient.invalidateQueries({ queryKey: ['numbers'] });
        },
    });

    if (isPending) return <Skeleton className="h-48 w-full rounded-2xl" />;

    return (
        <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
                Nummern vergeben Sie hier vor der ersten Freigabe, damit importierte Dokumente ihre bisherige Nummer
                behalten. Eine geänderte Nummer einer Verfahrensanweisung gilt auch für ihre Unterdokumente. Frühere,
                freigegebene Ausgaben behalten ihre damalige Nummer.
            </p>
            {(data ?? []).length === 0 ? (
                <EmptyState title="Noch keine Prozesse" description="Sobald Prozesse angelegt sind, stehen sie hier." />
            ) : (
                (data ?? []).map((area) => (
                    <AreaTable
                        key={area.id}
                        area={area}
                        isPending={change.isPending}
                        onSave={(id, input) => change.mutate({ id, input })}
                    />
                ))
            )}
        </div>
    );
}
