import type { ProcessListItem } from '@app/domain';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import type { FormLink } from '../hooks/useProcessForm';

interface LinksEditorProps {
    links: readonly FormLink[];
    processes: readonly ProcessListItem[];
    onChange: (links: FormLink[]) => void;
}

const empty = (linkType: FormLink['linkType']): FormLink => ({
    linkType,
    linkedProcessId: null,
    title: '',
    url: '',
});

function ProcessSelect({
    link,
    processes,
    onChange,
}: {
    link: FormLink;
    processes: readonly ProcessListItem[];
    onChange: (patch: Partial<FormLink>) => void;
}) {
    return (
        <Select value={link.linkedProcessId ?? ''} onValueChange={(value) => onChange({ linkedProcessId: value })}>
            <SelectTrigger>
                <SelectValue placeholder="Freigegebenen Prozess wählen" />
            </SelectTrigger>
            <SelectContent>
                {processes.map((process) => (
                    <SelectItem key={process.id} value={process.id}>
                        {process.title}
                        {process.identifier ? ` · ${process.identifier}` : ''} · {process.area.shortCode}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function ExternalInputs({ link, onChange }: { link: FormLink; onChange: (patch: Partial<FormLink>) => void }) {
    return (
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <Input
                value={link.title}
                placeholder="Bezeichnung"
                onChange={(event) => onChange({ title: event.target.value })}
            />
            <Input value={link.url} placeholder="https://…" onChange={(event) => onChange({ url: event.target.value })} />
        </div>
    );
}

function LinkRow({
    link,
    processes,
    onChange,
    onRemove,
}: {
    link: FormLink;
    processes: readonly ProcessListItem[];
    onChange: (patch: Partial<FormLink>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-start gap-2">
            {link.linkType === 'InternerProzess' ? (
                <ProcessSelect link={link} processes={processes} onChange={onChange} />
            ) : (
                <ExternalInputs link={link} onChange={onChange} />
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Entfernen"
                className="text-destructive shrink-0"
                onClick={onRemove}
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}

export function LinksEditor({ links, processes, onChange }: LinksEditorProps) {
    const update = (index: number, patch: Partial<FormLink>) =>
        onChange(links.map((link, position) => (position === index ? { ...link, ...patch } : link)));

    const group = (linkType: FormLink['linkType'], label: string, hint: string, icon: typeof Link2) => {
        const Icon = icon;
        return (
            <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-wide uppercase">{label}</Label>
                {links.map((link, index) =>
                    link.linkType === linkType ? (
                        <LinkRow
                            key={index}
                            link={link}
                            processes={processes}
                            onChange={(patch) => update(index, patch)}
                            onRemove={() => onChange(links.filter((_, position) => position !== index))}
                        />
                    ) : null,
                )}
                {links.every((link) => link.linkType !== linkType) ? (
                    <p className="text-muted-foreground text-sm italic">{hint}</p>
                ) : null}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onChange([...links, empty(linkType)])}
                >
                    <Icon className="size-3.5" /> <Plus className="size-3" /> Hinzufügen
                </Button>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {group('InternerProzess', 'Verknüpfte Prozesse', 'Noch keine verknüpfte Prozesse.', Link2)}
            {group('ExternesDokument', 'Externe Dokumente', 'Noch keine Link hochgeladen.', ExternalLink)}
        </div>
    );
}
