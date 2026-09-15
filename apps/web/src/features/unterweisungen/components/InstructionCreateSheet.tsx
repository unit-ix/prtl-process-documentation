import { canManageInstructions, INSTRUCTION_TYPES, RECURRENCES, type InstructionType, type Recurrence } from '@app/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { instructionRepository, masterDataRepository, processRepository } from '@/data';
import type { UserListItem } from '@/data/ports/MasterDataRepository';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet';
import { Textarea } from '@/shared/components/ui/textarea';
import { useSessionUser } from '@/shared/lib/session/SessionContext';
import { ParticipantPicker } from './ParticipantPicker';

interface Draft {
    processId: string;
    instructionType: InstructionType;
    dueDate: string;
    recurrence: Recurrence;
    note: string;
    participantIds: string[];
}

const EMPTY: Draft = {
    processId: '',
    instructionType: 'Einzel',
    dueDate: '',
    recurrence: 'Keine Wiederholung',
    note: '',
    participantIds: [],
};

function TypeAndSchedule({ draft, set }: Pick<FormProps, 'draft' | 'set'>) {
    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label>Art</Label>
                    <Select
                        value={draft.instructionType}
                        onValueChange={(value) => set('instructionType', value as InstructionType)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {INSTRUCTION_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="dueDate">Frist</Label>
                    <Input
                        id="dueDate"
                        type="date"
                        value={draft.dueDate}
                        onChange={(event) => set('dueDate', event.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label>Wiederholung</Label>
                <Select value={draft.recurrence} onValueChange={(value) => set('recurrence', value as Recurrence)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {RECURRENCES.map((value) => (
                            <SelectItem key={value} value={value}>
                                {value}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );
}

interface FormProps {
    draft: Draft;
    processes: readonly { id: string; title: string; identifier: string | null }[];
    users: readonly UserListItem[];
    set: <TKey extends keyof Draft>(key: TKey, value: Draft[TKey]) => void;
}

function InstructionForm({ draft, processes, users, set }: FormProps) {
    return (
                <div className="space-y-4 px-4">
                    <div className="space-y-1.5">
                        <Label>Prozess</Label>
                        <Select value={draft.processId} onValueChange={(value) => set('processId', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Freigegebenen Prozess wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                {processes.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.identifier ? `${item.identifier} · ` : ''}
                                        {item.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <TypeAndSchedule draft={draft} set={set} />

                    <ParticipantPicker
                        users={users}
                        selected={draft.participantIds}
                        onChange={(ids) => set('participantIds', ids)}
                    />

                    <div className="space-y-1.5">
                        <Label htmlFor="note">Hinweistext</Label>
                        <Textarea id="note" rows={3} value={draft.note} onChange={(event) => set('note', event.target.value)} />
                    </div>
                </div>
    );
}

function useCreateInstruction(draft: Draft, onDone: () => void) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            instructionRepository.create({
                processId: draft.processId,
                instructionType: draft.instructionType,
                dueDate: draft.dueDate === '' ? null : draft.dueDate,
                recurrence: draft.recurrence,
                note: draft.note.trim() === '' ? null : draft.note.trim(),
                participantIds: draft.participantIds,
            }),
        onSuccess: async () => {
            toast.success('Unterweisung angelegt.');
            onDone();
            await queryClient.invalidateQueries({ queryKey: ['instructions'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

function Intro() {
    return (
        <SheetHeader>
            <SheetTitle>Neue Unterweisung</SheetTitle>
            <SheetDescription>
                Einzelunterweisung läuft über E-Mail, Sammelunterweisung über die gedruckte Unterschriftenliste.
            </SheetDescription>
        </SheetHeader>
    );
}

export function InstructionCreateSheet() {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const canManage = canManageInstructions(useSessionUser());

    // §7.1: unterwiesen wird nur auf freigegebene Prozesse.
    const { data: released } = useQuery({
        queryKey: ['processes', { status: 'approved' }],
        queryFn: () => processRepository.list({ filter: { status: 'approved' }, limit: 500 }),
        enabled: open,
    });
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => masterDataRepository.users(),
        enabled: open,
    });

    const create = useCreateInstruction(draft, () => {
        setDraft(EMPTY);
        setOpen(false);
    });

    if (!canManage) return null;

    const set = <TKey extends keyof Draft>(key: TKey, value: Draft[TKey]) =>
        setDraft((current) => ({ ...current, [key]: value }));

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="gap-2">
                    <Plus className="size-4" /> Neue Unterweisung
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <Intro />

                <InstructionForm
                    draft={draft}
                    processes={released?.items ?? []}
                    users={users ?? []}
                    set={set}
                />

                <SheetFooter>
                    <Button
                        disabled={draft.processId === '' || draft.participantIds.length === 0 || create.isPending}
                        onClick={() => create.mutate()}
                    >
                        Unterweisung anlegen
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
