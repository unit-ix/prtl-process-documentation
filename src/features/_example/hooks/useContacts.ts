import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactRepository } from '@/data';
import type { ContactCreate } from '@/data/ports/ContactRepository';

// Query-Key-Factory — EINE Quelle fuer alle Contact-Keys, nie Inline-String-Arrays in
// Komponenten. Hierarchisch, damit `invalidateQueries({ queryKey: contactKeys.lists() })`
// alle Listen-Varianten (Filter/Suche) auf einmal trifft.
export const contactKeys = {
    all: ['contacts'] as const,
    lists: () => [...contactKeys.all, 'list'] as const,
    // simulateError geht in den Key ein → Toggle refetcht sauber (PROTOTYPE-ONLY-Demo).
    list: (simulateError: boolean) => [...contactKeys.lists(), { simulateError }] as const,
    details: () => [...contactKeys.all, 'detail'] as const,
    detail: (id: string) => [...contactKeys.details(), id] as const,
};

// Liste. `simulateError` erzwingt den DoD-Error-Zustand fuer die Demo — im echten Feature
// entfaellt der Parameter ersatzlos.
export function useContacts(options?: { simulateError?: boolean }) {
    const simulateError = options?.simulateError ?? false;
    return useQuery({
        queryKey: contactKeys.list(simulateError),
        queryFn: async () => {
            // PROTOTYPE-ONLY: erzwingt einen Ladefehler fuer den DoD-Error-Zustand.
            if (simulateError) throw new Error('Simulierter Ladefehler (Prototyp-Demo).');
            return contactRepository.list();
        },
    });
}

// Detail. `enabled` verhindert die Query, solange keine id vorliegt.
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
        // invalidate-on-success statt optimistic update: der Store bleibt die Wahrheit,
        // die Liste re-fetcht ehrlich. Optimistic updates sind bewusst NICHT der Default.
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
