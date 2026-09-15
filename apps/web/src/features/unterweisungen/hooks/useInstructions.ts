import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { instructionRepository } from '@/data';

export const instructionKey = (id: string) => ['instruction', id] as const;
const LIST_KEY = ['instructions'] as const;

export function useInstructions() {
    return useQuery({ queryKey: LIST_KEY, queryFn: () => instructionRepository.list() });
}

export function useInstruction(id: string) {
    return useQuery({ queryKey: instructionKey(id), queryFn: () => instructionRepository.get(id) });
}

type Action = (id: string) => Promise<unknown>;

export function useInstructionAction(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ action }: { action: Action; success: string }) => action(id),
        onSuccess: async (_result, { success }) => {
            toast.success(success);
            await queryClient.invalidateQueries({ queryKey: instructionKey(id) });
            await queryClient.invalidateQueries({ queryKey: LIST_KEY });
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
