import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactRepository } from '@/data';
import type { ContactCreate, ContactQuery } from '@/data/ports/ContactRepository';

export type ContactListQuery = Omit<ContactQuery, 'cursor'>;

export const contactKeys = {
    all: ['contacts'] as const,
    lists: () => [...contactKeys.all, 'list'] as const,
    list: (query: ContactListQuery, simulateError: boolean) =>
        [...contactKeys.lists(), query, simulateError] as const,
    details: () => [...contactKeys.all, 'detail'] as const,
    detail: (id: string) => [...contactKeys.details(), id] as const,
};

// PROTOTYPE-ONLY — `simulateError`, siehe docs/prototype-manifest.md.
export function useContacts(query: ContactListQuery, simulateError = false) {
    return useInfiniteQuery({
        queryKey: contactKeys.list(query, simulateError),
        queryFn: ({ pageParam }) => {
            if (simulateError) throw new Error('Simulated load failure (?debugError=1).');
            return contactRepository.list({ ...query, cursor: pageParam });
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });
}

export function useContact(id: string | undefined) {
    return useQuery({
        queryKey: contactKeys.detail(id ?? ''),
        queryFn: () => contactRepository.get(id as string),
        enabled: Boolean(id),
    });
}

export function useCreateContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: ContactCreate) => contactRepository.create(input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: contactKeys.lists() }),
    });
}

export function useUpdateContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patch }: { id: string; patch: Partial<ContactCreate> }) =>
            contactRepository.update(id, patch),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
            queryClient.invalidateQueries({ queryKey: contactKeys.detail(updated.id) });
        },
    });
}

export function useDeleteContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => contactRepository.remove(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: contactKeys.lists() }),
    });
}
