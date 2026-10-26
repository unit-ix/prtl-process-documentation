import { canBeAssignedAsAuthor } from '@app/domain';
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

// Nur Personen mit der Rolle Verfasser: wer sie nicht hat, kommt nicht in die App oder sieht den
// Prozess nicht, und der Prozess bleibt in der Erfassung hängen (Rollentest 16.10.2026).
function AuthorSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
    const { data: users } = useUsers();
    const authors = (users ?? []).filter(canBeAssignedAsAuthor);
    const noAuthors = users !== undefined && authors.length === 0;

    return (
        <>
            <Select value={value} onValueChange={onChange} disabled={noAuthors}>
                <SelectTrigger>
                    <SelectValue placeholder="Verfasser wählen" />
                </SelectTrigger>
                <SelectContent>
                    {authors.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                            {user.displayName}
                            {user.mail ? ` · ${user.mail}` : ' · keine E-Mail'}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {noAuthors ? (
                <p className="text-muted-foreground text-sm">
                    Niemand hat die Rolle Verfasser. Die Administration vergibt sie unter Einstellungen → Benutzer.
                </p>
            ) : null}
        </>
    );
}

export function AssignAuthorDialog({ isPending, run }: AssignAuthorDialogProps) {
    const [open, setOpen] = useState(false);
    const [authorId, setAuthorId] = useState('');

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

                <AuthorSelect value={authorId} onChange={setAuthorId} />

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
