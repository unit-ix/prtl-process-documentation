import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import type { FormField } from '../hooks/useProcessForm';

interface AdditionalFieldsEditorProps {
    fields: readonly FormField[];
    onChange: (fields: FormField[]) => void;
}

export function AdditionalFieldsEditor({ fields, onChange }: AdditionalFieldsEditorProps) {
    const update = (index: number, patch: Partial<FormField>) =>
        onChange(fields.map((field, position) => (position === index ? { ...field, ...patch } : field)));

    return (
        <div className="space-y-4">
            {fields.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Noch keine eigenen Felder angelegt.</p>
            ) : null}

            {fields.map((field, index) => (
                <div key={field.id ?? `neu-${index}`} className="border-border/40 space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                        <Input
                            value={field.title}
                            placeholder="Feldname"
                            className="font-medium"
                            onChange={(event) => update(index, { title: event.target.value })}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Feld entfernen"
                            className="text-destructive shrink-0"
                            onClick={() => onChange(fields.filter((_, position) => position !== index))}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                    <Textarea
                        rows={3}
                        value={field.value}
                        placeholder="Inhalt"
                        onChange={(event) => update(index, { value: event.target.value })}
                    />
                </div>
            ))}

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onChange([...fields, { title: '', value: '' }])}
            >
                <Plus className="size-3.5" /> Feld hinzufügen
            </Button>
        </div>
    );
}
