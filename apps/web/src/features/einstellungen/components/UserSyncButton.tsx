import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { peopleRepository } from '@/data';
import { Button } from '@/shared/components/ui/button';

export function UserSyncButton() {
    const queryClient = useQueryClient();
    const sync = useMutation({
        mutationFn: () => peopleRepository.syncUsers(),
        onSuccess: async ({ toast: message }) => {
            toast.success(message);
            await queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    return (
        <Button variant="outline" className="gap-2" disabled={sync.isPending} onClick={() => sync.mutate()}>
            <RefreshCw className={sync.isPending ? 'size-4 animate-spin' : 'size-4'} /> Jetzt mit Entra-Gruppe abgleichen
        </Button>
    );
}
