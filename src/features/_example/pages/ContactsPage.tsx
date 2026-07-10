import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';
import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { ConfirmDialog } from '@/shared/components/state/ConfirmDialog';
import { EmptyState } from '@/shared/components/state/EmptyState';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/components/ui/table';
import type { Contact, ContactRole } from '@/domain/Contact';
import { useRole } from '@/shared/lib/role/RoleContext';
import {
    useContacts,
    useCreateContact,
    useDeleteContact,
} from '../hooks/useContacts';

// Choice-Union → Anzeigetext. Nie den rohen Code rendern (Naming-Contract: typisierte Lookups).
const ROLE_LABELS: Record<ContactRole, string> = {
    decision_maker: 'Entscheider',
    influencer: 'Beeinflusser',
    user: 'Anwender',
    other: 'Sonstige',
};

// PROTOTYPE-ONLY-Demo: legt einen Platzhalter-Kontakt an und leiht sich eine reale Company-id
// aus der Liste (Referenz-Integritaet). Im echten Feature ersetzt ein Formular diese Funktion.
function handleCreateDemoContact(contacts: Contact[], create: ReturnType<typeof useCreateContact>) {
    const reference = contacts[0];
    if (!reference) {
        toast.error('Kein Unternehmen zum Verknüpfen vorhanden.');
        return;
    }
    create.mutate(
        {
            firstName: 'Neuer',
            lastName: 'Kontakt',
            email: 'neuer.kontakt@example.de',
            phone: '+49 30 0000000',
            role: 'user',
            company: { id: reference.company.id },
            isPrimary: false,
        },
        { onSuccess: (contact) => toast.success(`${contact.fullName} angelegt.`) },
    );
}

function handleDeleteContact(target: Contact, remove: ReturnType<typeof useDeleteContact>) {
    remove.mutate(target.id, {
        onSuccess: () => toast.success(`${target.fullName} gelöscht.`),
        onError: () => toast.error('Löschen fehlgeschlagen.'),
    });
}

// Controller-Hook: buendelt State + abgeleitete Werte + Queries an EINER Stelle, damit die
// Page-Komponente reiner Render bleibt (haelt sie unter dem 50-Zeilen-Gate). Muster zum Mirrorn.
function useContactsController() {
    const [search, setSearch] = useState('');
    const [simulateError, setSimulateError] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);

    const query = useContacts({ simulateError });
    const createContact = useCreateContact();
    const deleteContact = useDeleteContact();

    const contacts = query.data ?? [];
    const needle = search.trim().toLowerCase();
    const filtered = useMemo(
        () => contacts.filter((contact) => contact.fullName.toLowerCase().includes(needle)),
        [contacts, needle],
    );

    return {
        search,
        setSearch,
        simulateError,
        toggleError: () => setSimulateError((value) => !value),
        pendingDelete,
        setPendingDelete,
        query,
        filtered,
        needle,
        contacts,
        createContact,
        deleteContact,
    };
}

interface ContactsToolbarProps {
    search: string;
    onSearch: (value: string) => void;
    simulateError: boolean;
    onToggleError: () => void;
    canCreate: boolean;
    onCreate: () => void;
    creating: boolean;
}

function ContactsToolbar({
    search,
    onSearch,
    simulateError,
    onToggleError,
    canCreate,
    onCreate,
    creating,
}: ContactsToolbarProps) {
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
                {/* PROTOTYPE-ONLY: macht den DoD-Error-Zustand ohne echten Ausfall erlebbar. */}
                <Button type="button" variant="outline" size="sm" onClick={onToggleError}>
                    {simulateError ? 'Fehler aus' : 'Fehler simulieren'}
                </Button>
                {/* Rollen-Gating: nur wer Kontakte editieren darf, sieht „Neu". */}
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

function ContactsTable({
    contacts,
    canEdit,
    onDelete,
}: {
    contacts: Contact[];
    canEdit: boolean;
    onDelete: (contact: Contact) => void;
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
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

interface ContactsListProps {
    query: ReturnType<typeof useContacts>;
    filtered: Contact[];
    search: string;
    canEdit: boolean;
    onDelete: (contact: Contact) => void;
}

// Kapselt die DoD-Zustaende Loading/Empty/Error rund um die Tabelle (AsyncBoundary).
function ContactsList({ query, filtered, search, canEdit, onDelete }: ContactsListProps) {
    return (
        <AsyncBoundary
            isLoading={query.isLoading}
            error={query.error}
            isEmpty={filtered.length === 0}
            onRetry={() => void query.refetch()}
            emptyFallback={
                <EmptyState
                    title="Keine Kontakte"
                    description={
                        search ? 'Kein Treffer für diese Suche.' : 'Noch keine Kontakte angelegt.'
                    }
                />
            }
        >
            <ContactsTable contacts={filtered} canEdit={canEdit} onDelete={onDelete} />
        </AsyncBoundary>
    );
}

// DoD-Pflichtzustand „Confirm-before-delete" — destruktive Aktion nie ohne Rückfrage.
function DeleteContactDialog({
    contact,
    onCancel,
    onConfirm,
}: {
    contact: Contact | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <ConfirmDialog
            open={contact !== null}
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}
            title="Kontakt löschen?"
            description={contact ? `${contact.fullName} wird dauerhaft entfernt.` : undefined}
            confirmLabel="Löschen"
            destructive
            onConfirm={onConfirm}
        />
    );
}

// Das kanonische Referenz-Feature: „mirror this, then delete." Die /prototype-Engine (Part E)
// baut pro PRD-Feature genau dieses Muster nach — Controller-Hook + AsyncBoundary + alle fuenf
// DoD-Zustaende + canSee/canEdit statt verstreuter Rollen-Checks. Die Page bleibt reiner Render.
export function ContactsPage() {
    const { canSee, canEdit } = useRole();
    const state = useContactsController();

    // Rollen-Gating konsumiert die Capability-Map — nicht dekretiert per if (persona === …).
    if (!canSee('contact')) {
        return <EmptyState title="Kein Zugriff" description="Ihre Rolle darf Kontakte nicht einsehen." />;
    }

    const mayEdit = canEdit('contact');

    return (
        <div className="space-y-4">
            <ContactsToolbar
                search={state.search}
                onSearch={state.setSearch}
                simulateError={state.simulateError}
                onToggleError={state.toggleError}
                canCreate={mayEdit}
                onCreate={() => handleCreateDemoContact(state.contacts, state.createContact)}
                creating={state.createContact.isPending}
            />
            <ContactsList
                query={state.query}
                filtered={state.filtered}
                search={state.needle}
                canEdit={mayEdit}
                onDelete={state.setPendingDelete}
            />
            <DeleteContactDialog
                contact={state.pendingDelete}
                onCancel={() => state.setPendingDelete(null)}
                onConfirm={() => {
                    if (state.pendingDelete) handleDeleteContact(state.pendingDelete, state.deleteContact);
                    state.setPendingDelete(null);
                }}
            />
        </div>
    );
}
