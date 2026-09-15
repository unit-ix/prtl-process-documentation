import { Check } from 'lucide-react';
import { useState } from 'react';
import type { UserListItem } from '@/data/ports/MasterDataRepository';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

interface ParticipantPickerProps {
    users: readonly UserListItem[];
    selected: readonly string[];
    onChange: (ids: string[]) => void;
}

// §7.1: ALLE aktiven Mitarbeiter, nicht nur die mit Verfasser-Flag. Canvas filtert hier auf
// blnIsAuthor — eine Kopie aus der Verfasser-Auswahl, die die halbe Belegschaft ausschliesst.
export function ParticipantPicker({ users, selected, onChange }: ParticipantPickerProps) {
    const [search, setSearch] = useState('');
    const term = search.trim().toLowerCase();
    const visible = term === '' ? users : users.filter((user) => user.displayName.toLowerCase().includes(term));

    const toggle = (id: string) =>
        onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

    return (
        <div className="space-y-2">
            <Label>Teilnehmer ({selected.length})</Label>
            <Input
                value={search}
                placeholder="Mitarbeiter suchen …"
                onChange={(event) => setSearch(event.target.value)}
            />
            <ul className="border-border/40 max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
                {visible.map((user) => {
                    const isSelected = selected.includes(user.id);
                    return (
                        <li key={user.id}>
                            <button
                                type="button"
                                onClick={() => toggle(user.id)}
                                className={cn(
                                    'hover:bg-accent flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                                    isSelected && 'bg-accent/60',
                                )}
                            >
                                <span className="min-w-0 truncate">
                                    {user.displayName}
                                    {user.mail === null ? (
                                        <span className="text-muted-foreground"> · keine E-Mail</span>
                                    ) : null}
                                </span>
                                {isSelected ? <Check className="text-primary size-4 shrink-0" /> : null}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
