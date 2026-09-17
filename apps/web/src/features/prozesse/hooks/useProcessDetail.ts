import type { ProcessDetailView } from '@app/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { processRepository } from '@/data';

export const processDetailKey = (id: string) => ['process', id] as const;

export function useProcessDetail(id: string) {
    return useQuery({
        queryKey: processDetailKey(id),
        queryFn: () => processRepository.get(id),
    });
}

type Action = (id: string) => Promise<{ toast: string }>;

export function useProcessAction(process: ProcessDetailView) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (action: Action) => action(process.id),
        onSuccess: async (result) => {
            toast.success(result.toast);
            await queryClient.invalidateQueries({ queryKey: processDetailKey(process.id) });
            await queryClient.invalidateQueries({ queryKey: ['processes'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
