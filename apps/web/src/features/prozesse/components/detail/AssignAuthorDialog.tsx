import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { processRepository } from '@/data';
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
import { useUsers } from '../../hooks/useMasterData';

interface AssignAuthorDialogProps {
    isPending: boolean;
    run: (action: (id: string) => Promise<{ toast: string }>) => void;
}

// Canvas zieht die Auswahl aus `Filter(tblUser, blnIsAuthor)` — hier stehen alle aktiven Nutzer:
// die Rolle wird mit der Zuweisung vergeben, nicht vorausgesetzt (§7.1, Defekt 6).
export function AssignAuthorDialog({ isPending, run }: AssignAuthorDialogProps) {
    const [open, setOpen] = useState(false);
    const [authorId, setAuthorId] = useState('');
    const { data: users } = useUsers();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="size-4" /> Verfasser zuweisen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Verfasser zuweisen</DialogTitle>
                    <DialogDescription>
                        Der Prozess wechselt damit in die Erfassung, und der Verfasser bekommt eine Nachricht.
                    </DialogDescription>
                </DialogHeader>

                <Select value={authorId} onValueChange={setAuthorId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Mitarbeiter wählen" />
                    </SelectTrigger>
                    <SelectContent>
                        {(users ?? []).map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.displayName}
                                {user.mail ? ` · ${user.mail}` : ' · keine E-Mail'}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Abbrechen
                    </Button>
                    <Button
                        disabled={authorId === '' || isPending}
                        onClick={() => {
                            run((id) => processRepository.assignAuthor(id, authorId));
                            setOpen(false);
                        }}
                    >
                        Zuweisen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
