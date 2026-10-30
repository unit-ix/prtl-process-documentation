import type { ProcessRef } from '@app/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { processRepository } from '@/data';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { LinkedFromList } from './DeactivateButton';

function useDeleteProcess(processId: string) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: () => processRepository.remove(processId),
        onSuccess: async () => {
            toast.success('Prozess gelöscht.');
            await queryClient.invalidateQueries({ queryKey: ['processes'] });
            navigate('/processes');
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

/** Nur für inaktive Prozesse: erst ausblenden, dann löschen — zwei bewusste Schritte statt einem. */
export function DeleteProcessButton({ processId, linkedFrom }: { processId: string; linkedFrom: readonly ProcessRef[] }) {
    const remove = useDeleteProcess(processId);

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive gap-2" disabled={remove.isPending}>
                    <Trash2 className="size-4" /> Endgültig löschen
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Prozess endgültig löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Der Prozess verschwindet mit allen Ausgaben aus der App, auch für die Administration. Das lässt sich
                        in der App nicht rückgängig machen. Unterweisungen zu diesem Prozess bleiben als Nachweis erhalten.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <LinkedFromList linkedFrom={linkedFrom} />
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => remove.mutate()}>
                        Endgültig löschen
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
