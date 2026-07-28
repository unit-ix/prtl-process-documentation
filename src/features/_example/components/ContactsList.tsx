import { AsyncBoundary } from '@/shared/components/state/AsyncBoundary';
import { EmptyState } from '@/shared/components/state/EmptyState';
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll';
import type { ContactSort } from '@/data/ports/ContactRepository';
import type { Contact } from '@/domain/Contact';
import type { useContacts } from '../hooks/useContacts';
import { ContactsTable } from './ContactsTable';

interface ContactsListProps {
    query: ReturnType<typeof useContacts>;
    contacts: Contact[];
    total: number | null;
    sort: ContactSort;
    onSort: (field: ContactSort['field']) => void;
    hasActiveFilter: boolean;
    canEdit: boolean;
    onDelete: (contact: Contact) => void;
}

function countLabel(loaded: number, total: number | null): string {
    return total === null ? `${loaded} geladen` : `${loaded} von ${total}`;
}

export function ContactsList(props: ContactsListProps) {
    const { query, contacts, total, sort, onSort, hasActiveFilter, canEdit, onDelete } = props;
    const sentinelRef = useInfiniteScroll(
        () => void query.fetchNextPage(),
        query.hasNextPage && !query.isFetchingNextPage,
    );

    return (
        <AsyncBoundary
            // isLoading (first load), not isFetching: the latter unmounts the table on every
            // page append and the list jumps back to the top.
            isLoading={query.isLoading}
            error={query.error}
            isEmpty={contacts.length === 0}
            onRetry={() => void query.refetch()}
            emptyFallback={
                <EmptyState
                    title="Keine Kontakte"
                    description={
                        hasActiveFilter
                            ? 'Kein Treffer für diese Suche.'
                            : 'Noch keine Kontakte angelegt.'
                    }
                />
            }
        >
            <ContactsTable
                contacts={contacts}
                sort={sort}
                onSort={onSort}
                canEdit={canEdit}
                onDelete={onDelete}
            />
            <div ref={sentinelRef} className="text-muted-foreground py-3 text-center text-sm">
                {query.isFetchingNextPage ? 'Lädt…' : countLabel(contacts.length, total)}
            </div>
        </AsyncBoundary>
    );
}
