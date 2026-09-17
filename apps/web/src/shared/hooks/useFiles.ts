import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fileStore } from '@/data';
import type { FileOwner } from '@/data/ports/FileStore';

const filesKey = (owner: FileOwner, ownerId: string) => ['files', owner, ownerId] as const;

export function useFiles(owner: FileOwner, ownerId: string) {
    const queryClient = useQueryClient();
    const list = useQuery({
        queryKey: filesKey(owner, ownerId),
        queryFn: () => fileStore.list(owner, ownerId),
        enabled: ownerId !== '',
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: filesKey(owner, ownerId) });

    const upload = useMutation({
        mutationFn: (file: File) => fileStore.upload(owner, ownerId, file),
        onSuccess: async (file) => {
            toast.success(`${file.fileName} hochgeladen.`);
            await invalidate();
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const remove = useMutation({
        mutationFn: (id: string) => fileStore.remove(id),
        onSuccess: async () => {
            toast.success('Dokument entfernt.');
            await invalidate();
        },
        onError: (error: Error) => toast.error(error.message),
    });

    return { ...list, upload, remove };
}

/** Öffnet die Datei über eine frisch ausgestellte, kurzlebige Adresse. */
export function useOpenFile() {
    return useMutation({
        mutationFn: (id: string) => fileStore.url(id),
        onSuccess: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
        onError: (error: Error) => toast.error(error.message),
    });
}
