import { useQuery } from '@tanstack/react-query';
import { processRepository } from '@/data';

/** Verknüpfen lässt sich nur mit Prozessen, die es offiziell gibt — also mit freigegebenen. */
export function useReleasedProcesses() {
    return useQuery({
        queryKey: ['processes', { status: 'approved', purpose: 'links' }],
        queryFn: async () => (await processRepository.list({ filter: { status: 'approved' }, limit: 500 })).items,
        staleTime: 60_000,
    });
}
