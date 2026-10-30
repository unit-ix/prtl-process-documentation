import type { ProcessDetailView, ProcessListItem } from '@app/domain';
import { useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { NO_IDENTIFIER } from '../mappings/processMappings';

// Als Vorlage taugt jeder Prozess, den man sehen darf — auch einer in Erfassung, den PRETTL
// „Vorlage …“ nennt und nie freigibt (Termin 30.10.).
function useCopySources(excludeId: string, enabled: boolean) {
    return useQuery({
        queryKey: ['processes', { purpose: 'copy-sources' }],
        queryFn: async () => (await processRepository.list({ limit: 500 })).items,
        enabled,
        staleTime: 60_000,
        select: (items) => items.filter((item) => item.id !== excludeId),
    });
}

const matches = (item: ProcessListItem, search: string): boolean =>
    `${item.identifier ?? ''} ${item.title} ${item.area.shortCode}`.toLowerCase().includes(search.toLowerCase());

function SourceList({
    items,
    selected,
    onSelect,
}: {
    items: readonly ProcessListItem[];
    selected: string | null;
    onSelect: (id: string) => void;
}) {
    if (items.length === 0) return <p className="text-muted-foreground text-sm italic">Kein Prozess gefunden.</p>;

    return (
        <ul className="border-border/50 max-h-72 divide-y overflow-y-auto rounded-xl border">
            {items.map((item) => (
                <li key={item.id}>
                    <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={cn(
                            'hover:bg-muted/60 w-full px-3 py-2 text-left text-sm',
                            selected === item.id && 'bg-primary/10',
                        )}
                    >
                        <span className="text-muted-foreground mr-2 font-mono text-xs">
                            {item.identifier ?? NO_IDENTIFIER}
                        </span>
                        {item.title}
                    </button>
                </li>
            ))}
        </ul>
    );
}

function useCopy(onCopy: (source: ProcessDetailView) => void, close: () => void) {
    const [loading, setLoading] = useState(false);

    const copy = async (sourceId: string) => {
        setLoading(true);
        try {
            onCopy(await processRepository.get(sourceId));
            toast.success('Felder übernommen. Erst mit „Speichern“ wird etwas geändert.');
            close();
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return { copy, loading };
}

export function CopyFromProcessDialog({
    processId,
    onCopy,
}: {
    processId: string;
    onCopy: (source: ProcessDetailView) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const { copy, loading } = useCopy(onCopy, () => setOpen(false));
    const { data } = useCopySources(processId, open);
    const items = (data ?? []).filter((item) => matches(item, search));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Copy className="size-4" /> Felder übernehmen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Felder aus anderem Prozess übernehmen</DialogTitle>
                    <DialogDescription>
                        Alle Inhaltsfelder, die Prozessbeschreibung und die mitgeltenden Unterlagen werden durch die des
                        gewählten Prozesses ersetzt. Titel und Kurzbeschreibung bleiben.
                    </DialogDescription>
                </DialogHeader>
                <Input placeholder="Suchen nach Titel, Nummer, Bereich" value={search} onChange={(event) => setSearch(event.target.value)} />
                <SourceList items={items} selected={selected} onSelect={setSelected} />
                <DialogFooter>
                    <Button disabled={selected === null || loading} onClick={() => selected && void copy(selected)}>
                        Übernehmen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
