import { Eye, EyeOff } from 'lucide-react';
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

interface DeactivateButtonProps {
    deactivated: boolean;
    isPending: boolean;
    run: (action: (id: string) => Promise<{ toast: string }>) => void;
}

export function DeactivateButton({ deactivated, isPending, run }: DeactivateButtonProps) {
    if (deactivated) {
        return (
            <Button
                variant="outline"
                className="gap-2"
                disabled={isPending}
                onClick={() => run((id) => processRepository.setDeactivated(id, false))}
            >
                <Eye className="size-4" /> Wieder aktivieren
            </Button>
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={isPending}>
                    <EyeOff className="size-4" /> Deaktivieren
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Prozess deaktivieren?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Der Prozess wird für alle ausgeblendet, nur die Administration sieht ihn noch. Gelöscht wird
                        nichts, er lässt sich jederzeit wieder aktivieren.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => run((id) => processRepository.setDeactivated(id, true))}>
                        Deaktivieren
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
