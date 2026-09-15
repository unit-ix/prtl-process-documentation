import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { masterDataRepository, peopleRepository } from '@/data';
import type { UserListItem } from '@/data/ports/MasterDataRepository';
import type { UserRoleInput } from '@/data/ports/PeopleRepository';
import { Card } from '@/shared/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';

const NONE = 'none';

const ROLES: { key: keyof UserRoleInput & keyof UserListItem; label: string }[] = [
    { key: 'isAdministrator', label: 'Admin' },
    { key: 'isProcessOwner', label: 'Prozessverantwortlicher' },
    { key: 'isQm', label: 'QM' },
    { key: 'isAuthor', label: 'Verfasser' },
];

function UserRow({
    user,
    areas,
    isPending,
    onChange,
}: {
    user: UserListItem;
    areas: readonly { id: string; title: string }[];
    isPending: boolean;
    onChange: (id: string, input: UserRoleInput) => void;
}) {
    return (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="text-muted-foreground text-xs">{user.mail ?? 'Keine E-Mail'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {ROLES.map((role) => (
                    <label key={role.key} className="flex items-center gap-1.5 text-xs">
                        <input
                            type="checkbox"
                            disabled={isPending}
                            checked={user[role.key] === true}
                            onChange={(event) => onChange(user.id, { [role.key]: event.target.checked })}
                        />
                        {role.label}
                    </label>
                ))}
                <Select
                    disabled={isPending}
                    value={user.area?.id ?? NONE}
                    onValueChange={(value) => onChange(user.id, { areaId: value === NONE ? null : value })}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Abteilung" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE}>Ohne Abteilung</SelectItem>
                        {areas.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                                {area.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </li>
    );
}

export function UserSettings() {
    const queryClient = useQueryClient();
    const { data: users, isPending } = useQuery({ queryKey: ['users'], queryFn: () => masterDataRepository.users() });
    const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: () => masterDataRepository.areas() });

    const update = useMutation({
        mutationFn: ({ id, input }: { id: string; input: UserRoleInput }) => peopleRepository.updateUser(id, input),
        onSuccess: async () => {
            toast.success('Gespeichert.');
            await queryClient.invalidateQueries({ queryKey: ['users'] });
            await queryClient.invalidateQueries({ queryKey: ['session'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    if (isPending) return <Skeleton className="h-48 w-full rounded-2xl" />;

    return (
        <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
            <p className="text-muted-foreground text-sm">
                Verwalten Sie die Rollen der Mitarbeiter. Rollen steuern, welche Aufgaben im Freigabe- und
                Unterweisungsprozess jemand übernehmen darf. Name, E-Mail und Konto kommen aus der Provisionierung.
            </p>
            <ul className="divide-border/40 divide-y">
                {(users ?? []).map((user) => (
                    <UserRow
                        key={user.id}
                        user={user}
                        areas={areas ?? []}
                        isPending={update.isPending}
                        onChange={(id, input) => update.mutate({ id, input })}
                    />
                ))}
            </ul>
        </Card>
    );
}
