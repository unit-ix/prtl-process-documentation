import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { masterDataRepository } from '@/data';
import type { AreaListItem, UserListItem } from '@/data/ports/MasterDataRepository';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { AreaDialog } from './AreaDialog';
import { SettingsHint } from './SettingsHint';

const NONE = 'none';

function OwnerSelect({
    area,
    owners,
    isPending,
    onAssign,
}: {
    area: AreaListItem;
    owners: readonly UserListItem[];
    isPending: boolean;
    onAssign: (areaId: string, processOwnerId: string | null) => void;
}) {
    return (
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
    );
}

function AreaRow({
    area,
    owners,
    memberCount,
    onAssign,
    onEdit,
    isPending,
}: {
    area: AreaListItem;
    owners: readonly UserListItem[];
    memberCount: number;
    onAssign: (areaId: string, processOwnerId: string | null) => void;
    onEdit: () => void;
    isPending: boolean;
}) {
    return (
        <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className={`min-w-0 ${area.isActive ? '' : 'opacity-60'}`}>
                <p className="flex items-center gap-2 text-sm font-medium">
                    {area.title}
                    {area.isActive ? null : <Badge variant="secondary">deaktiviert</Badge>}
                </p>
                <p className="text-muted-foreground font-mono text-xs">{area.shortCode}</p>
            </div>
            {/* Die Zahl macht den Unterschied sichtbar: viele Mitarbeiter, genau eine Leitung. */}
            <div className="text-muted-foreground ml-auto mr-4 flex items-center gap-1.5 text-xs whitespace-nowrap">
                <Users className="size-3.5" />
                {memberCount === 1 ? '1 Mitarbeiter' : `${memberCount} Mitarbeiter`}
            </div>
            <OwnerSelect area={area} owners={owners} isPending={isPending} onAssign={onAssign} />
            <Button variant="ghost" size="icon" className="size-9" aria-label={`${area.title} bearbeiten`} onClick={onEdit}>
                <Pencil className="size-4" />
            </Button>
        </li>
    );
}

function AreaIntro({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-muted-foreground max-w-3xl text-sm">
                Die Leitung ist der Prozessverantwortliche (= Abteilungsleiter). Er übernimmt die inhaltliche Prüfung
                der Prozesse seines Bereichs. Ohne Leitung kann kein Prozess dieses Bereichs freigegeben werden.
            </p>
            <Button className="gap-2" onClick={onCreate}>
                <Plus className="size-4" /> Bereich anlegen
            </Button>
        </div>
    );
}

function useAssignOwner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ areaId, processOwnerId }: { areaId: string; processOwnerId: string | null }) =>
            masterDataRepository.updateArea(areaId, { processOwnerId }),
        onSuccess: async () => {
            toast.success('Bereich gespeichert.');
            await queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function AreaSettings({ onSwitch }: { onSwitch: () => void }) {
    const { data: areas, isPending } = useQuery({
        queryKey: ['areas', 'all'],
        queryFn: () => masterDataRepository.areas({ includeInactive: true }),
    });
    const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => masterDataRepository.users() });
    const assign = useAssignOwner();
    const [editing, setEditing] = useState<AreaListItem | 'new' | null>(null);

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
            <AreaIntro onCreate={() => setEditing('new')} />
            <ul className="divide-border/40 divide-y">
                {(areas ?? []).map((area) => (
                    <AreaRow
                        key={area.id}
                        area={area}
                        owners={owners}
                        memberCount={memberCount(area.id)}
                        isPending={assign.isPending}
                        onAssign={(areaId, processOwnerId) => assign.mutate({ areaId, processOwnerId })}
                        onEdit={() => setEditing(area)}
                    />
                ))}
            </ul>
            {editing === null ? null : (
                <AreaDialog
                    key={editing === 'new' ? 'new' : editing.id}
                    area={editing === 'new' ? null : editing}
                    open
                    onOpenChange={(open) => (open ? undefined : setEditing(null))}
                />
            )}
        </Card>
    );
}
