import type { ProcessRef } from '@app/domain';
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
    linkedFrom: readonly ProcessRef[];
    isPending: boolean;
    run: (action: (id: string) => Promise<{ toast: string }>) => void;
}

function LinkedFromList({ linkedFrom }: { linkedFrom: readonly ProcessRef[] }) {
    if (linkedFrom.length === 0) return null;

    return (
        <div className="space-y-1 text-sm">
            <p className="font-medium">Diese Prozesse verweisen noch darauf:</p>
            <ul className="text-muted-foreground list-disc space-y-0.5 pl-5">
                {linkedFrom.map((ref) => (
                    <li key={ref.id}>
                        {ref.identifier ? `${ref.identifier} · ` : ''}
                        {ref.title}
                    </li>
                ))}
            </ul>
            <p className="text-muted-foreground">Dort wird der Verweis als „nicht mehr verfügbar“ angezeigt.</p>
        </div>
    );
}

export function DeactivateButton({ deactivated, linkedFrom, isPending, run }: DeactivateButtonProps) {
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
                <LinkedFromList linkedFrom={linkedFrom} />
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
