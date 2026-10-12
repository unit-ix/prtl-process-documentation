import type { RichDocument, TemplateType } from '@app/domain';
import { RichTextEditor } from '@/shared/components/richtext/RichTextEditor';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import type { ProcessFormState } from '../hooks/useProcessForm';

type TextKey = keyof Omit<ProcessFormState, 'additionalFields' | 'links' | 'termsDoc' | 'responsibilitiesDoc'>;

interface FieldProps {
    id: TextKey;
    label: string;
    rows?: number;
    form: ProcessFormState;
    onChange: (key: TextKey, value: string) => void;
}

export function FormField({ id, label, rows = 4, form, onChange }: FieldProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            {rows === 1 ? (
                <Input id={id} value={form[id]} onChange={(event) => onChange(id, event.target.value)} />
            ) : (
                <Textarea id={id} rows={rows} value={form[id]} onChange={(event) => onChange(id, event.target.value)} />
            )}
        </div>
    );
}

interface RichFieldProps {
    label: string;
    value: RichDocument | null;
    onChange: (doc: RichDocument) => void;
    processId: string;
    placeholder: string;
}

/** Begriffe und Zuständigkeiten: Listen und Tabellen statt Tabulatoren, die ein Textfeld verschluckt. */
export function RichFormField({ label, value, onChange, processId, placeholder }: RichFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <RichTextEditor
                compact
                value={value}
                onChange={onChange}
                owner={{ kind: 'process', id: processId }}
                placeholder={placeholder}
            />
        </div>
    );
}

export const GENERAL_FIELDS: { id: TextKey; label: string; rows?: number }[] = [
    { id: 'title', label: 'Titel', rows: 1 },
    { id: 'shortDescription', label: 'Bezeichnung / Kurzbeschreibung', rows: 3 },
];

export const OVERVIEW_FIELDS: { id: TextKey; label: string; rows?: number }[] = [
    { id: 'purpose', label: 'Zweck' },
    { id: 'scopeDetail', label: 'Geltungsbereich' },
];

// Begriffe (IMS) ist ein Rich-Text-Feld und steht deshalb nicht in dieser Liste, siehe ProcessEditPage.
export const templateFields = (template: TemplateType): { id: TextKey; label: string; rows?: number }[] =>
    template === 'IMS'
        ? []
        : [
              { id: 'workSequence', label: 'Prozessablauf' },
              { id: 'method', label: 'Verfahren' },
              { id: 'processParameters', label: 'Prozessparameter' },
              { id: 'documentationRef', label: 'Dokumentationen' },
              { id: 'deviationHandling', label: 'Reaktionsplan bei Abweichungen' },
              { id: 'maintenanceRef', label: 'Wartung (Verweis)' },
          ];
