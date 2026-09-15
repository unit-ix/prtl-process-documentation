import { SCOPES, SPECIFICATION_TYPES, TEMPLATE_TYPES, type SpecificationType, type TemplateType } from '@app/domain';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

export interface ProcessDraft {
    title: string;
    shortDescription: string;
    areaId: string;
    specificationType: SpecificationType;
    templateType: TemplateType;
    scope: string;
    parentProcessId: string;
}

export const EMPTY_DRAFT: ProcessDraft = {
    title: '',
    shortDescription: '',
    areaId: '',
    specificationType: 'VA',
    templateType: 'IMS',
    scope: 'PE',
    parentProcessId: '',
};

interface Option {
    value: string;
    label: string;
}

function SelectField({
    label,
    value,
    options,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    options: readonly Option[];
    placeholder?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

const codeOptions = (codes: readonly string[]): Option[] => codes.map((code) => ({ value: code, label: code }));

interface ProcessCreateFormProps {
    draft: ProcessDraft;
    areas: readonly { id: string; title: string; shortCode: string }[];
    parents: readonly { id: string; title: string }[];
    set: <TKey extends keyof ProcessDraft>(key: TKey, value: ProcessDraft[TKey]) => void;
}

function TitleFields({ draft, set }: Pick<ProcessCreateFormProps, 'draft' | 'set'>) {
    return (
        <>
            <div className="space-y-1.5">
                <Label htmlFor="title">Titel</Label>
                <Input
                    id="title"
                    value={draft.title}
                    maxLength={400}
                    onChange={(event) => set('title', event.target.value)}
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="shortDescription">Bezeichnung / Kurzbeschreibung</Label>
                <Textarea
                    id="shortDescription"
                    rows={3}
                    value={draft.shortDescription}
                    onChange={(event) => set('shortDescription', event.target.value)}
                />
            </div>
        </>
    );
}

export function ProcessCreateForm({ draft, areas, parents, set }: ProcessCreateFormProps) {
    return (
        <div className="space-y-4 px-4">
            <TitleFields draft={draft} set={set} />

            <SelectField
                label="Bereich"
                value={draft.areaId}
                placeholder="Bereich wählen"
                options={areas.map((area) => ({ value: area.id, label: `${area.title} · ${area.shortCode}` }))}
                onChange={(value) => set('areaId', value)}
            />

            <div className="grid grid-cols-2 gap-3">
                <SelectField
                    label="Anweisungsart"
                    value={draft.specificationType}
                    options={codeOptions(SPECIFICATION_TYPES)}
                    onChange={(value) => set('specificationType', value as SpecificationType)}
                />
                <SelectField
                    label="Vorlagentyp"
                    value={draft.templateType}
                    options={codeOptions(TEMPLATE_TYPES)}
                    onChange={(value) => set('templateType', value as TemplateType)}
                />
            </div>

            <SelectField
                label="Geltungsbereich"
                value={draft.scope}
                options={codeOptions(SCOPES)}
                onChange={(value) => set('scope', value)}
            />

            {draft.specificationType === 'AA' ? (
                <SelectField
                    label="Übergeordnete Verfahrensanweisung"
                    value={draft.parentProcessId}
                    placeholder="Optional"
                    options={parents.map((parent) => ({ value: parent.id, label: parent.title }))}
                    onChange={(value) => set('parentProcessId', value)}
                />
            ) : null}
        </div>
    );
}
