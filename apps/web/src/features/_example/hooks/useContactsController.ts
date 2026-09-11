import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Contact } from '@/domain/Contact';
import { DEFAULT_PAGE_SIZE } from '@/data/ports/Query';
import type { ContactSort } from '@/data/ports/ContactRepository';
import { useDebounced } from '@/shared/hooks/useDebounced';
import { ALL_ROLES, type RoleFilterValue } from '../mappings/contactMappings';
import { useContacts, useCreateContact, useDeleteContact, type ContactListQuery } from './useContacts';

export function useContactsController() {
    const [search, setSearch] = useState('');
    const [role, setRole] = useState<RoleFilterValue>(ALL_ROLES);
    const [sort, setSort] = useState<ContactSort>({ field: 'fullName', dir: 'asc' });
    const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);
    const [searchParams] = useSearchParams();
    const simulateError = searchParams.get('debugError') === '1';

    const debouncedSearch = useDebounced(search, 300);
    const needle = debouncedSearch.trim();
    const hasActiveFilter = Boolean(needle) || role !== ALL_ROLES;

    const listQuery = useMemo<ContactListQuery>(
        () => ({
            limit: DEFAULT_PAGE_SIZE,
            filter: { search: needle || undefined, role: role === ALL_ROLES ? undefined : role },
            sort,
        }),
        [needle, role, sort],
    );

    const query = useContacts(listQuery, simulateError);
    const createContact = useCreateContact();
    const deleteContact = useDeleteContact();

    const contacts = useMemo(
        () => query.data?.pages.flatMap((page) => page.items) ?? [],
        [query.data],
    );
    const total = query.data?.pages[0]?.total ?? null;

    return {
        search,
        setSearch,
        role,
        setRole,
        sort,
        toggleSort: (field: ContactSort['field']) =>
            setSort((current) =>
                current.field === field
                    ? { field, dir: current.dir === 'asc' ? 'desc' : 'asc' }
                    : { field, dir: 'asc' },
            ),
        hasActiveFilter,
        pendingDelete,
        setPendingDelete,
        query,
        contacts,
        total,
        createContact,
        deleteContact,
    };
}
