import { UserPlus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { contactRoleOptions, type RoleFilterValue } from '../mappings/contactMappings';

interface ContactsToolbarProps {
    search: string;
    onSearch: (value: string) => void;
    role: RoleFilterValue;
    onRole: (value: RoleFilterValue) => void;
    canCreate: boolean;
    onCreate: () => void;
    creating: boolean;
}

export function ContactsToolbar(props: ContactsToolbarProps) {
    const { search, onSearch, role, onRole, canCreate, onCreate, creating } = props;
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">Kontakte</h1>
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    value={search}
                    onChange={(event) => onSearch(event.target.value)}
                    placeholder="Nach Name suchen…"
                    className="h-9 w-48"
                />
                <Select value={role} onValueChange={(value) => onRole(value as RoleFilterValue)}>
                    <SelectTrigger className="h-9 w-40" aria-label="Nach Rolle filtern">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {contactRoleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {canCreate ? (
                    <Button type="button" size="sm" onClick={onCreate} disabled={creating}>
                        <UserPlus />
                        Neu
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
