import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { peopleRepository } from '@/data';
import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import type { DirectoryUser } from '@/data/ports/PeopleRepository';

const useDirectory = (enabled: boolean) =>
    useQuery({
        queryKey: ['directory-users'],
        queryFn: () => peopleRepository.directoryUsers(),
        enabled,
        retry: false,
    });

// §9.7: Benutzer werden aus der Sicherheitsgruppe übernommen, nicht von Hand erfunden. Rollen
// vergibt danach die Zeile in der Benutzerliste — aufgenommen heisst noch nicht berechtigt (§2.1).
type Directory = ReturnType<typeof useDirectory>;

function CandidatePicker({
    directory,
    candidates,
    selected,
    onSelect,
}: {
    directory: Directory;
    candidates: readonly DirectoryUser[];
    selected: string;
    onSelect: (value: string) => void;
}) {
    return (
        <>
                {directory.isPending ? <Skeleton className="h-9 w-full" /> : null}

                {directory.error ? (
                    <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm">
                        {directory.error.message}
                    </p>
                ) : null}

                {directory.data ? (
                    <Select value={selected} onValueChange={onSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder={candidates.length === 0 ? 'Alle sind bereits angelegt' : 'Person wählen'} />
                        </SelectTrigger>
                        <SelectContent>
                            {candidates.map((candidate) => (
                                <SelectItem key={candidate.entraObjectId} value={candidate.entraObjectId}>
                                    {candidate.displayName}
                                    {candidate.mail ? ` · ${candidate.mail}` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null}
        </>
    );
}

function useAddUser(candidates: readonly DirectoryUser[], selected: string, onDone: () => void) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            const person = candidates.find((candidate) => candidate.entraObjectId === selected);
            if (!person) throw new Error('Bitte einen Eintrag wählen.');
            return peopleRepository.createUser({
                entraObjectId: person.entraObjectId,
                displayName: person.displayName,
                mail: person.mail,
            });
        },
        onSuccess: async () => {
            toast.success('Benutzer übernommen. Rollen jetzt in der Liste vergeben.');
            onDone();
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function AddUserDialog() {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState('');

    const directory = useDirectory(open);

    const candidates = (directory.data ?? []).filter((candidate) => !candidate.exists);

    const add = useAddUser(candidates, selected, () => {
        setSelected('');
        setOpen(false);
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="size-4" /> Benutzer hinzufügen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Benutzer hinzufügen</DialogTitle>
                    <DialogDescription>
                        Auswahl aus der Sicherheitsgruppe GRP_PRETTL_Prozessdokumentation_Nutzer. Rollen werden
                        anschließend in der Liste vergeben.
                    </DialogDescription>
                </DialogHeader>

                <CandidatePicker directory={directory} candidates={candidates} selected={selected} onSelect={setSelected} />

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Abbrechen
                    </Button>
                    <Button disabled={selected === '' || add.isPending} onClick={() => add.mutate()}>
                        Übernehmen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
