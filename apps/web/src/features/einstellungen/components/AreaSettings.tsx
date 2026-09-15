import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { masterDataRepository, peopleRepository } from '@/data';
import type { AreaListItem, UserListItem } from '@/data/ports/MasterDataRepository';
import { useQuery } from '@tanstack/react-query';
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

function AreaRow({
    area,
    owners,
    onAssign,
    isPending,
}: {
    area: AreaListItem;
    owners: readonly UserListItem[];
    onAssign: (areaId: string, processOwnerId: string | null) => void;
    isPending: boolean;
}) {
    return (
        <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium">{area.title}</p>
                <p className="text-muted-foreground font-mono text-xs">{area.shortCode}</p>
            </div>
            <Select
                disabled={isPending}
                value={area.processOwner?.id ?? NONE}
                onValueChange={(value) => onAssign(area.id, value === NONE ? null : value)}
            >
                <SelectTrigger className="w-64">
                    <SelectValue placeholder="Nicht zugewiesen" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>Nicht zugewiesen</SelectItem>
                    {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                            {owner.displayName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </li>
    );
}

export function AreaSettings() {
    const queryClient = useQueryClient();
    const { data: areas, isPending } = useQuery({ queryKey: ['areas'], queryFn: () => masterDataRepository.areas() });
    const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => masterDataRepository.users() });

    const assign = useMutation({
        mutationFn: ({ areaId, processOwnerId }: { areaId: string; processOwnerId: string | null }) =>
            peopleRepository.updateArea(areaId, processOwnerId),
        onSuccess: async () => {
            toast.success('Bereich gespeichert.');
            await queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    if (isPending) return <Skeleton className="h-48 w-full rounded-2xl" />;

    const owners = (users ?? []).filter((user) => user.isProcessOwner);

    return (
        <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
            <p className="text-muted-foreground text-sm">
                Weisen Sie jedem Bereich einen Prozessverantwortlichen zu. Der Prozessverantwortliche (=
                Abteilungsleiter) übernimmt die inhaltliche Prüfung der Prozesse seines Bereichs.
            </p>
            <ul className="divide-border/40 divide-y">
                {(areas ?? []).map((area) => (
                    <AreaRow
                        key={area.id}
                        area={area}
                        owners={owners}
                        isPending={assign.isPending}
                        onAssign={(areaId, processOwnerId) => assign.mutate({ areaId, processOwnerId })}
                    />
                ))}
            </ul>
        </Card>
    );
}
