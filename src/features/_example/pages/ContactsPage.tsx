import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/components/state/ConfirmDialog';
import { EmptyState } from '@/shared/components/state/EmptyState';
import type { Contact } from '@/domain/Contact';
import { useRole } from '@/shared/lib/role/RoleContext';
import { ContactsList } from '../components/ContactsList';
import { ContactsToolbar } from '../components/ContactsToolbar';
import { useContactsController } from '../hooks/useContactsController';
import type { useCreateContact, useDeleteContact } from '../hooks/useContacts';

// PROTOTYPE-ONLY — replaced by a real form. Borrows a real company id to keep the reference intact.
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

export function ContactsPage() {
    const { canSee, canEdit } = useRole();
    const state = useContactsController();

    if (!canSee('contact')) {
        return <EmptyState title="Kein Zugriff" description="Ihre Rolle darf Kontakte nicht einsehen." />;
    }

    const mayEdit = canEdit('contact');

    return (
        <div className="space-y-4">
            <ContactsToolbar
                search={state.search}
                onSearch={state.setSearch}
                role={state.role}
                onRole={state.setRole}
                canCreate={mayEdit}
                onCreate={() => handleCreateDemoContact(state.contacts, state.createContact)}
                creating={state.createContact.isPending}
            />
            <ContactsList
                query={state.query}
                contacts={state.contacts}
                total={state.total}
                sort={state.sort}
                onSort={state.toggleSort}
                hasActiveFilter={state.hasActiveFilter}
                canEdit={mayEdit}
                onDelete={state.setPendingDelete}
            />
            <ConfirmDialog
                open={state.pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open) state.setPendingDelete(null);
                }}
                title="Kontakt löschen?"
                description={
                    state.pendingDelete ? `${state.pendingDelete.fullName} wird dauerhaft entfernt.` : undefined
                }
                confirmLabel="Löschen"
                destructive
                onConfirm={() => {
                    if (state.pendingDelete) handleDeleteContact(state.pendingDelete, state.deleteContact);
                    state.setPendingDelete(null);
                }}
            />
        </div>
    );
}
