import { Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import type { ProcessFilter } from '@/data/ports/ProcessRepository';
import {
    processSpecificationTypeOptions,
    processStatusOptions,
    processTemplateTypeOptions,
} from '../mappings/processMappings';

const ALL = 'all';

interface ProcessFiltersProps {
    filter: ProcessFilter;
    onChange: (filter: ProcessFilter) => void;
}

interface FilterSelectProps {
    value: string | undefined;
    placeholder: string;
    allLabel: string;
    options: readonly { value: string; label: string }[];
    onChange: (value: string | undefined) => void;
}

function FilterSelect({ value, placeholder, allLabel, options, onChange }: FilterSelectProps) {
    return (
        <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? undefined : next)}>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ALL}>{allLabel}</SelectItem>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function ProcessFilters({ filter, onChange }: ProcessFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    value={filter.search ?? ''}
                    onChange={(event) => onChange({ ...filter, search: event.target.value })}
                    placeholder="Prozess suchen (Titel oder Nummer) …"
                    className="pl-9"
                />
            </div>
            <FilterSelect
                value={filter.status}
                placeholder="Status"
                allLabel="Alle Status"
                options={processStatusOptions}
                onChange={(status) => onChange({ ...filter, status: status as ProcessFilter['status'] })}
            />
            <FilterSelect
                value={filter.specificationType}
                placeholder="Prozessart"
                allLabel="Alle Prozessarten"
                options={processSpecificationTypeOptions}
                onChange={(value) =>
                    onChange({ ...filter, specificationType: value as ProcessFilter['specificationType'] })
                }
            />
            <FilterSelect
                value={filter.templateType}
                placeholder="Vorlagentyp"
                allLabel="Alle Vorlagen"
                options={processTemplateTypeOptions}
                onChange={(value) => onChange({ ...filter, templateType: value as ProcessFilter['templateType'] })}
            />
        </div>
    );
}
