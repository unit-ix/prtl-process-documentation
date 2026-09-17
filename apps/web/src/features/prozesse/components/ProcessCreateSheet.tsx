import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { processRepository } from '@/data';
import { Button } from '@/shared/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/shared/components/ui/sheet';
import { useAreas } from '../hooks/useMasterData';
import { useProcessList } from '../hooks/useProcessList';
import { EMPTY_DRAFT, ProcessCreateForm, type ProcessDraft } from './ProcessCreateForm';

const orNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());

function useCreateProcess(draft: ProcessDraft, onDone: () => void) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            processRepository.create({
                title: draft.title.trim(),
                shortDescription: orNull(draft.shortDescription),
                areaId: draft.areaId,
                specificationType: draft.specificationType,
                templateType: draft.templateType,
                scope: orNull(draft.scope),
                parentProcessId: draft.specificationType === 'AA' ? orNull(draft.parentProcessId) : null,
            }),
        onSuccess: async ({ id }) => {
            toast.success('Prozess angelegt (Backlog).');
            onDone();
            await queryClient.invalidateQueries({ queryKey: ['processes'] });
            navigate(`/processes/${id}`);
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function ProcessCreateSheet() {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<ProcessDraft>(EMPTY_DRAFT);
    const { data: areas } = useAreas();
    const { nodes } = useProcessList();
    const create = useCreateProcess(draft, () => {
        setDraft(EMPTY_DRAFT);
        setOpen(false);
    });

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="gap-2">
                    <Plus className="size-4" /> Neuer Prozess
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>Neuen Prozess anlegen</SheetTitle>
                    <SheetDescription>
                        Der Prozess startet im Backlog. Verfasser und Inhalte folgen im nächsten Schritt.
                    </SheetDescription>
                </SheetHeader>

                <ProcessCreateForm
                    draft={draft}
                    areas={areas ?? []}
                    parents={nodes.map((node) => node.item).filter((item) => item.specificationType === 'VA')}
                    set={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
                />

                <SheetFooter>
                    <Button
                        disabled={draft.title.trim() === '' || draft.areaId === '' || create.isPending}
                        onClick={() => create.mutate()}
                    >
                        Prozess anlegen
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
