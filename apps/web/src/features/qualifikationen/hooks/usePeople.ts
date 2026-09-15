import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { peopleRepository } from '@/data';

export const employeeKey = (id: string) => ['employee', id] as const;

export function useEmployees() {
    return useQuery({ queryKey: ['employees'], queryFn: () => peopleRepository.employees() });
}

export function useEmployee(id: string) {
    return useQuery({
        queryKey: employeeKey(id),
        queryFn: () => peopleRepository.employee(id),
        enabled: id !== '',
    });
}

export function useEmployeeMutation(employeeId: string, success: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (action: () => Promise<unknown>) => action(),
        onSuccess: async () => {
            toast.success(success);
            await queryClient.invalidateQueries({ queryKey: employeeKey(employeeId) });
            await queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
