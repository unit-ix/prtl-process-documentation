import { useQuery } from '@tanstack/react-query';
import { processRepository } from '@/data';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';

interface SnapshotDialogProps {
    processId: string;
    version: { id: string; edition: number } | null;
    onClose: () => void;
}

export function SnapshotDialog({ processId, version, onClose }: SnapshotDialogProps) {
    const { data, isPending } = useQuery({
        queryKey: ['snapshot', processId, version?.id],
        queryFn: () => processRepository.snapshot(processId, version?.id ?? ''),
        enabled: version !== null,
    });

    return (
        <Dialog open={version !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-h-[85vh] max-w-4xl overflow-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Ausgabe {version?.edition}
                        <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs font-normal">
                            nur Ansicht
                        </span>
                    </DialogTitle>
                </DialogHeader>
                {isPending ? (
                    <Skeleton className="h-64 w-full" />
                ) : (
                    <div dangerouslySetInnerHTML={{ __html: data ?? '' }} />
                )}
            </DialogContent>
        </Dialog>
    );
}
