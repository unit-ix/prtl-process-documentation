import { CATEGORY_LABELS, CATEGORY_NUMBERS, type CategoryNumber } from '@app/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { masterDataRepository } from '@/data';
import type { AreaInput, AreaListItem } from '@/data/ports/MasterDataRepository';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/shared/components/ui/sheet';

interface Draft extends AreaInput {
    isActive: boolean;
}

const draftOf = (area: AreaListItem | null): Draft => ({
    title: area?.title ?? '',
    shortCode: area?.shortCode ?? '',
    categoryNumber: (area?.categoryNumber ?? 2) as CategoryNumber,
    isActive: area?.isActive ?? true,
});

function useSaveArea(area: AreaListItem | null, onDone: () => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ isActive, ...input }: Draft) => {
            if (area === null) return void (await masterDataRepository.createArea(input));
            // Gesperrte Felder gar nicht erst schicken — die API lehnt jede Änderung daran ab.
            const fields = area.isNumbered ? { title: input.title } : input;
            await masterDataRepository.updateArea(area.id, { ...fields, isActive });
        },
        onSuccess: async () => {
            toast.success(area === null ? 'Bereich angelegt.' : 'Bereich gespeichert.');
            onDone();
            await Promise.all(
                [['areas'], ['numbers'], ['processes']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
            );
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

function CodeFields({ draft, set, locked }: { draft: Draft; set: (next: Partial<Draft>) => void; locked: boolean }) {
    return (
        <>
            <div className="space-y-1.5">
                <Label htmlFor="area-code">Kürzel</Label>
                <Input
                    id="area-code"
                    className="font-mono"
                    placeholder="z. B. FT"
                    maxLength={8}
                    disabled={locked}
                    value={draft.shortCode}
                    onChange={(event) => set({ shortCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                />
            </div>
            <div className="space-y-1.5">
                <Label>Prozesskategorie</Label>
                <Select
                    disabled={locked}
                    value={String(draft.categoryNumber)}
                    onValueChange={(value) => set({ categoryNumber: Number(value) as CategoryNumber })}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORY_NUMBERS.map((number) => (
                            <SelectItem key={number} value={String(number)}>
                                {number} – {CATEGORY_LABELS[number]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {locked ? (
                <p className="text-muted-foreground text-xs">
                    Kürzel und Kategorie stehen in den Kennzeichen der freigegebenen Dokumente (z. B. VA PE 2{' '}
                    {draft.shortCode}.001) und lassen sich deshalb nicht mehr ändern. Der Titel bleibt frei.
                </p>
            ) : null}
        </>
    );
}

function StatusField({ draft, set }: { draft: Draft; set: (next: Partial<Draft>) => void }) {
    return (
        <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={draft.isActive ? 'active' : 'inactive'} onValueChange={(value) => set({ isActive: value === 'active' })}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Deaktiviert</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
                Ein deaktivierter Bereich steht nicht mehr zur Auswahl beim Anlegen. Seine Prozesse bleiben sichtbar.
            </p>
        </div>
    );
}

interface AreaDialogProps {
    /** null = neuen Bereich anlegen. */
    area: AreaListItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AreaDialog({ area, open, onOpenChange }: AreaDialogProps) {
    const [draft, setDraft] = useState<Draft>(() => draftOf(area));
    const set = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));
    const save = useSaveArea(area, () => onOpenChange(false));
    const isValid = draft.title.trim() !== '' && draft.shortCode !== '';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader>
                    <SheetTitle>{area === null ? 'Bereich anlegen' : 'Bereich bearbeiten'}</SheetTitle>
                    <SheetDescription>Der Bereich gibt jedem seiner Dokumente das Kürzel im Kennzeichen.</SheetDescription>
                </SheetHeader>
                <div className="space-y-5 px-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="area-title">Titel</Label>
                        <Input id="area-title" value={draft.title} onChange={(event) => set({ title: event.target.value })} />
                    </div>
                    <CodeFields draft={draft} set={set} locked={area?.isNumbered ?? false} />
                    {area === null ? null : <StatusField draft={draft} set={set} />}
                </div>
                <SheetFooter>
                    <Button disabled={!isValid || save.isPending} onClick={() => save.mutate({ ...draft, title: draft.title.trim() })}>
                        {area === null ? 'Bereich anlegen' : 'Speichern'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
