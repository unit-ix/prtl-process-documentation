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
import { Users } from 'lucide-react';
import { SettingsHint } from './SettingsHint';

const NONE = 'none';

function AreaRow({
    area,
    owners,
    memberCount,
    onAssign,
    isPending,
}: {
    area: AreaListItem;
    owners: readonly UserListItem[];
    memberCount: number;
    onAssign: (areaId: string, processOwnerId: string | null) => void;
    isPending: boolean;
}) {
    return (
        <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="text-sm font-medium">{area.title}</p>
                <p className="text-muted-foreground font-mono text-xs">{area.shortCode}</p>
            </div>
            {/* Die Zahl macht den Unterschied sichtbar: viele Mitarbeiter, genau eine Leitung. */}
            <div className="text-muted-foreground ml-auto mr-4 flex items-center gap-1.5 text-xs whitespace-nowrap">
                <Users className="size-3.5" />
                {memberCount === 1 ? '1 Mitarbeiter' : `${memberCount} Mitarbeiter`}
            </div>
            <Select
                disabled={isPending}
                value={area.processOwner?.id ?? NONE}
                onValueChange={(value) => onAssign(area.id, value === NONE ? null : value)}
            >
                <SelectTrigger className="w-64">
                    <SelectValue placeholder="Ohne Leitung" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>Ohne Leitung</SelectItem>
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

export function AreaSettings({ onSwitch }: { onSwitch: () => void }) {
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
    const memberCount = (areaId: string): number =>
        (users ?? []).filter((user) => user.area?.id === areaId).length;

    return (
        <Card className="glass-card border-border/40 space-y-4 rounded-2xl p-6">
            <SettingsHint
                subject="Bereich"
                object="eine Leitung"
                otherQuestion="Wer in einem Bereich arbeitet, legen Sie fest unter"
                otherTab="Benutzer"
                onSwitch={onSwitch}
            />
            <p className="text-muted-foreground text-sm">
                Die Leitung ist der Prozessverantwortliche (= Abteilungsleiter). Er übernimmt die inhaltliche
                Prüfung der Prozesse seines Bereichs. Ohne Leitung kann kein Prozess dieses Bereichs freigegeben
                werden.
            </p>
            <ul className="divide-border/40 divide-y">
                {(areas ?? []).map((area) => (
                    <AreaRow
                        key={area.id}
                        area={area}
                        owners={owners}
                        memberCount={memberCount(area.id)}
                        isPending={assign.isPending}
                        onAssign={(areaId, processOwnerId) => assign.mutate({ areaId, processOwnerId })}
                    />
                ))}
            </ul>
        </Card>
    );
}
