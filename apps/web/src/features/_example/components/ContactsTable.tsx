import { ArrowDown, ArrowUp, ArrowUpDown, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import type { ContactSort } from '@/data/ports/ContactRepository';
import type { Contact } from '@/domain/Contact';
import { ROLE_LABELS } from '../mappings/contactMappings';

const SORTABLE_COLUMNS: { field: ContactSort['field']; label: string }[] = [
    { field: 'fullName', label: 'Name' },
    { field: 'email', label: 'E-Mail' },
];

const SORT_ICONS = { asc: ArrowUp, desc: ArrowDown } as const;

interface SortableHeadProps {
    field: ContactSort['field'];
    label: string;
    sort: ContactSort;
    onSort: (field: ContactSort['field']) => void;
}

function SortableHead({ field, label, sort, onSort }: SortableHeadProps) {
    const active = sort.field === field;
    const Icon = active ? SORT_ICONS[sort.dir] : ArrowUpDown;
    return (
        <TableHead aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 h-8 px-2"
                onClick={() => onSort(field)}
            >
                {label}
                <Icon className={active ? undefined : 'opacity-50'} />
            </Button>
        </TableHead>
    );
}

interface ContactsTableProps {
    contacts: Contact[];
    sort: ContactSort;
    onSort: (field: ContactSort['field']) => void;
    canEdit: boolean;
    onDelete: (contact: Contact) => void;
}

export function ContactsTable({ contacts, sort, onSort, canEdit, onDelete }: ContactsTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {SORTABLE_COLUMNS.map((column) => (
                        <SortableHead
                            key={column.field}
                            field={column.field}
                            label={column.label}
                            sort={sort}
                            onSort={onSort}
                        />
                    ))}
                    <TableHead>Rolle</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                        <TableCell>{ROLE_LABELS[contact.role]}</TableCell>
                        <TableCell className="text-right">
                            {canEdit ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(contact)}
                                >
                                    <Trash2 />
                                    <span className="sr-only">Löschen</span>
                                </Button>
                            ) : null}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
