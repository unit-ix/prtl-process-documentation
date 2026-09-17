import { useQuery } from '@tanstack/react-query';
import { masterDataRepository } from '@/data';

export function useAreas() {
    return useQuery({ queryKey: ['areas'], queryFn: () => masterDataRepository.areas(), staleTime: 300_000 });
}

export function useUsers() {
    return useQuery({ queryKey: ['users'], queryFn: () => masterDataRepository.users(), staleTime: 300_000 });
}
